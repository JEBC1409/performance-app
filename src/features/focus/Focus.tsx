import { useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Eyebrow, Button } from "@/ui";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import { showToast } from "@/ui/Toast";
import { todayISO } from "@/lib/date";
import { BLOCKS_PER_SET, FOCUS_OPTIONS, pauseFocus, remainingSeconds, resumeFocus, startFocus, stopFocus } from "@/lib/focusTimer";
import { fmtClock, useFocusTimer, useNow } from "@/hooks/useFocusTimer";
import { getPip, pipSupport, subscribePip, togglePip } from "@/lib/focusPip";
import { isSoundOn, setSoundOn, subscribeSound, unlockAudio } from "@/lib/focusSound";

const SIZE = 300;
const C = SIZE / 2;
const RING_R = 118;
const RING_C = 2 * Math.PI * RING_R;
const TICKS = 60;

interface DialProps {
  progress: number;
  isBreak: boolean;
  live: boolean;
  children: ReactNode;
}

/** The hero dial: 60 minute-ticks that light up as time passes, a gradient
 * arc with a glowing head, and a soft breathing halo while it's running. */
function Dial({ progress, isBreak, live, children }: DialProps) {
  const a = isBreak ? "#2fae66" : "#df2531";
  const b = isBreak ? "#8ff0b8" : "#ff7a83";
  const gid = isBreak ? "focus-grad-break" : "focus-grad-focus";
  const angle = progress * 2 * Math.PI;
  const headX = C + RING_R * Math.sin(angle);
  const headY = C - RING_R * Math.cos(angle);

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}>
      <div
        aria-hidden
        className={`absolute inset-[14%] rounded-full ${live ? "focus-breathe" : ""}`}
        style={{ background: `radial-gradient(closest-side, ${isBreak ? "rgba(47,174,102,0.24)" : "rgba(223,37,49,0.26)"}, transparent 72%)` }}
      />
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
        </defs>

        {Array.from({ length: TICKS }, (_, i) => {
          const th = (i / TICKS) * 2 * Math.PI;
          const major = i % 5 === 0;
          const r1 = 136;
          const r2 = major ? 146 : 142;
          const lit = progress > 0 && i / TICKS < progress;
          return (
            <line
              key={i}
              x1={C + r1 * Math.sin(th)}
              y1={C - r1 * Math.cos(th)}
              x2={C + r2 * Math.sin(th)}
              y2={C - r2 * Math.cos(th)}
              stroke={lit ? a : "rgba(255,255,255,0.14)"}
              strokeOpacity={lit ? 0.95 : major ? 1 : 0.7}
              strokeWidth={major ? 2 : 1.2}
              strokeLinecap="round"
              style={{ transition: "stroke 0.6s" }}
            />
          );
        })}

        <circle cx={C} cy={C} r={RING_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <g transform={`rotate(-90 ${C} ${C})`}>
          <circle
            cx={C}
            cy={C}
            r={RING_R}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
            style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 10px ${a})` }}
          />
        </g>
        {progress > 0.004 ? (
          <circle cx={headX} cy={headY} r="6" fill="#fff" style={{ filter: `drop-shadow(0 0 8px ${b})`, transition: "cx 1s linear, cy 1s linear" }} />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <rect x="5" y="3.5" width="3.6" height="13" rx="1.2" fill="currentColor" />
      <rect x="11.4" y="3.5" width="3.6" height="13" rx="1.2" fill="currentColor" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M6 3.6v12.8a.6.6 0 0 0 .9.5l10-6.4a.6.6 0 0 0 0-1L6.9 3.1a.6.6 0 0 0-.9.5Z" fill="currentColor" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}
function SkipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M3 3l6 5-6 5V3Zm7 0l3 5-3 5V3Z" fill="currentColor" />
    </svg>
  );
}

function PipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="1.5" y="3" width="15" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="8.5" width="6" height="4.5" rx="1.2" fill="currentColor" />
    </svg>
  );
}
function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2.5 7v4h3l4 3.2V3.8L5.5 7h-3Z" fill="currentColor" />
      {on ? (
        <path d="M12 6.2a4 4 0 0 1 0 5.6M14.2 4a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M12.5 6.5l4 5M16.5 6.5l-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function FocusView() {
  const timer = useFocusTimer();
  const active = timer.status !== "idle";
  const now = useNow(timer.status === "running");
  const [task, setTask] = useState(timer.task);
  const [focusMin, setFocusMin] = useState(timer.focusMin);
  const soundOn = useSyncExternalStore(subscribeSound, isSoundOn, isSoundOn);
  const pip = useSyncExternalStore(subscribePip, getPip, getPip);
  const pipAvailable = pipSupport() !== null;

  const today = todayISO();
  const sessions = useLiveQuery(() => db.focusSessions.where("date").equals(today).toArray(), [today]);
  const recent = useLiveQuery(async () => {
    const rows = await db.focusSessions.orderBy("createdAt").reverse().limit(40).toArray();
    return [...new Set(rows.map((r) => r.task))].slice(0, 5);
  }, []);

  const todaySessions = useMemo(() => [...(sessions ?? [])].sort((a, b) => b.createdAt - a.createdAt), [sessions]);
  const todayMinutes = todaySessions.reduce((a, s) => a + s.minutes, 0);

  const left = Math.min(remainingSeconds(timer, now), timer.totalSec);
  const progress = active && timer.totalSec > 0 ? 1 - left / timer.totalSec : 0;
  const isBreak = timer.phase === "break";
  const paused = timer.status === "paused";
  const accent = isBreak ? "var(--color-good)" : "var(--color-red)";

  function begin() {
    const t = task.trim();
    if (!t) {
      showToast("Escribe qué vas a hacer");
      return;
    }
    // Both need a user gesture, and this click is the one we get: unlock the
    // chime and ask once for permission to notify when a block ends.
    unlockAudio();
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    startFocus(t, focusMin);
  }

  async function floatTimer() {
    const res = await togglePip();
    if (res === "unsupported") showToast("Tu navegador no permite ventana flotante");
    else if (res === "failed") showToast("No se pudo abrir la ventana flotante");
  }

  const stateLabel = !active ? "Listo para enfocar" : isBreak ? "Descanso" : paused ? "En pausa" : "Enfocado";

  return (
    <div className="flex flex-col gap-5 enter">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow accent>Focus</Eyebrow>
          <h1 className="font-[var(--font-display)] text-[26px] leading-tight mt-1.5 tracking-tight">Una tarea. Un bloque.</h1>
        </div>
        <button
          onClick={() => setSoundOn(!soundOn)}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Silenciar sonido" : "Activar sonido"}
          className={`tap-target mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full border transition-colors ${
            soundOn ? "border-[var(--color-red)] text-[var(--color-red)] bg-[rgba(223,37,49,0.08)]" : "border-[var(--color-line-strong)] text-[var(--color-muted-2)]"
          }`}
        >
          <SoundIcon on={soundOn} />
        </button>
      </div>

      <div className={`panel-surface ${active ? "panel-surface-glow" : ""} px-4 pt-5 pb-5 sm:px-6`}>
        {/* status row */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ borderColor: active ? accent : "var(--color-line-strong)", color: active ? accent : "var(--color-muted)" }}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${active && !paused ? "pulse" : ""}`}
              style={{ background: active ? accent : "var(--color-muted-2)", boxShadow: active ? `0 0 8px ${accent}` : "none" }}
            />
            {stateLabel}
          </span>
          <div className="flex items-center gap-1.5" aria-label={`Bloque ${Math.min(timer.cycle + (isBreak ? 0 : 1), BLOCKS_PER_SET)} de ${BLOCKS_PER_SET}`}>
            {Array.from({ length: BLOCKS_PER_SET }, (_, i) => {
              const done = i < timer.cycle;
              const current = active && !isBreak && i === timer.cycle;
              return (
                <span
                  key={i}
                  className={`h-1.5 w-5 rounded-full transition-all ${current ? "pulse" : ""}`}
                  style={{
                    background: done ? "var(--color-red)" : current ? "var(--color-red-soft)" : "rgba(255,255,255,0.1)",
                    boxShadow: done ? "0 0 8px var(--color-red-soft)" : "none",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* dial */}
        <div className="mt-2">
          <Dial progress={progress} isBreak={isBreak} live={timer.status === "running"}>
            <div className="num font-[var(--font-display)] text-[62px] font-light leading-none tracking-tight">
              {active ? fmtClock(left) : fmtClock(focusMin * 60)}
            </div>
            <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-muted)]">
              {!active ? "minutos" : isBreak ? "respira" : `bloque de ${timer.focusMin} min`}
            </div>
          </Dial>
        </div>

        {active ? (
          <>
            <div className="mt-1 px-2 text-center">
              <div className="eyebrow">{isBreak ? "Ahora" : "Trabajando en"}</div>
              <div className="mt-1.5 font-[var(--font-display)] text-[18px] leading-snug">
                {isBreak ? "Aléjate de la pantalla un momento" : timer.task}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-5">
              <button
                onClick={() => {
                  stopFocus();
                  showToast(isBreak ? "Descanso saltado" : "Bloque cancelado");
                }}
                aria-label={isBreak ? "Saltar descanso" : "Cancelar bloque"}
                className="tap-target flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-line-strong)] bg-[rgba(255,255,255,0.03)] text-[var(--color-muted)] transition-all hover:border-[var(--color-red)] hover:text-[var(--color-red)] active:scale-95"
              >
                {isBreak ? <SkipIcon /> : <StopIcon />}
              </button>
              <button
                onClick={() => {
                  unlockAudio();
                  if (paused) resumeFocus();
                  else pauseFocus();
                }}
                aria-label={paused ? "Reanudar" : "Pausar"}
                className="tap-target flex h-[68px] w-[68px] items-center justify-center rounded-full text-white transition-all active:scale-95"
                style={{
                  background: isBreak ? "linear-gradient(145deg,#3ddc84,#1f8a4c)" : "linear-gradient(145deg,#ff4a55,#b81c27)",
                  boxShadow: `0 1px 0 rgba(255,255,255,0.35) inset, 0 12px 30px -8px ${isBreak ? "rgba(47,174,102,0.85)" : "rgba(223,37,49,0.85)"}`,
                }}
              >
                {paused ? <PlayIcon /> : <PauseIcon />}
              </button>
              {pipAvailable ? (
                <button
                  onClick={floatTimer}
                  aria-pressed={pip.kind !== null}
                  aria-label={pip.kind ? "Cerrar ventana flotante" : "Abrir ventana flotante"}
                  title="Ventana flotante"
                  className={`tap-target flex h-12 w-12 items-center justify-center rounded-full border transition-all active:scale-95 ${
                    pip.kind
                      ? "border-[var(--color-red)] bg-[rgba(223,37,49,0.12)] text-[var(--color-red)]"
                      : "border-[var(--color-line-strong)] bg-[rgba(255,255,255,0.03)] text-[var(--color-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
                  }`}
                >
                  <PipIcon />
                </button>
              ) : (
                <span className="h-12 w-12" aria-hidden />
              )}
            </div>
          </>
        ) : (
          <>
            <label className="mt-1 flex flex-col gap-2">
              <span className="eyebrow">¿En qué vas a enfocarte?</span>
              <input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") begin();
                }}
                placeholder="Ej. Terminar el módulo de React"
                maxLength={80}
                className="w-full rounded-2xl border border-[var(--color-line-strong)] bg-[rgba(255,255,255,0.03)] px-4 py-3.5 text-center text-[15px] outline-none transition-colors placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-red)] focus:bg-[rgba(223,37,49,0.05)]"
              />
            </label>

            {recent && recent.length ? (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => setTask(r)}
                    className="max-w-full truncate rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-red)] hover:text-[var(--color-ink)]"
                  >
                    {r}
                  </button>
                ))}
              </div>
            ) : null}

            <div
              className="mt-5 grid grid-cols-4 gap-1 rounded-full border border-[var(--color-line)] bg-[rgba(0,0,0,0.35)] p-1"
              role="group"
              aria-label="Duración del bloque"
            >
              {FOCUS_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setFocusMin(m)}
                  aria-pressed={focusMin === m}
                  className={`num rounded-full py-2 text-[13px] font-semibold transition-all ${
                    focusMin === m
                      ? "bg-[var(--color-red)] text-white shadow-[0_6px_18px_-6px_rgba(223,37,49,0.9)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {m}
                  <span className="ml-0.5 text-[9px] font-medium opacity-70">m</span>
                </button>
              ))}
            </div>

            <Button variant="primary" className="mt-4 w-full py-3.5 text-[13px]" onClick={begin}>
              Empezar bloque
            </Button>
            <p className="mt-3 text-center text-[11px] text-[var(--color-muted-2)]">
              Descanso de 5 min tras cada bloque · cada {BLOCKS_PER_SET}, uno largo de 15
            </p>
          </>
        )}
      </div>

      {/* today */}
      <div className="panel-surface p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="eyebrow">Hoy</div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="num font-[var(--font-display)] text-[34px] font-light leading-none">{todayMinutes}</span>
              <span className="text-[11px] text-[var(--color-muted)]">min enfocados</span>
            </div>
          </div>
          <div className="text-right">
            <div className="num text-[15px] font-semibold">
              {todaySessions.length}
              <span className="text-[var(--color-muted-2)]"> / {BLOCKS_PER_SET}</span>
            </div>
            <div className="mt-1.5 flex justify-end gap-1">
              {Array.from({ length: Math.max(BLOCKS_PER_SET, todaySessions.length) }, (_, i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: i < todaySessions.length ? "var(--color-red)" : "rgba(255,255,255,0.1)",
                    boxShadow: i < todaySessions.length ? "0 0 6px var(--color-red-soft)" : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {todaySessions.length ? (
          <ul className="mt-4 flex flex-col">
            {todaySessions.map((s, i) => (
              <li key={s.id} className="group relative flex items-center gap-3 py-2.5 pl-5">
                <span
                  aria-hidden
                  className="absolute left-[3px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--color-red)]"
                  style={{ boxShadow: "0 0 8px var(--color-red-soft)" }}
                />
                {i < todaySessions.length - 1 ? (
                  <span aria-hidden className="absolute left-[6.5px] top-1/2 h-full w-px bg-[var(--color-line-strong)]" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px]">{s.task}</div>
                  <div className="num mt-0.5 text-[10.5px] text-[var(--color-muted)]">
                    {new Date(s.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span className="num flex-none rounded-full border border-[var(--color-line-strong)] px-2.5 py-0.5 text-[11px] font-semibold">
                  {s.minutes}m
                </span>
                <button
                  onClick={() => s.id != null && db.focusSessions.delete(s.id)}
                  aria-label={`Eliminar ${s.task}`}
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[var(--color-muted-2)] transition-colors hover:text-[var(--color-red)]"
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                    <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[12px] text-[var(--color-muted-2)]">Aún no has completado ningún bloque hoy.</p>
        )}
      </div>
    </div>
  );
}

/** Focus is contained: if something in it ever throws, the rest of the app
 * keeps working and this offers a clean restart instead of a blank screen. */
export function Focus() {
  return (
    <ErrorBoundary
      fallback={(reset) => (
        <div className="panel-surface p-5 text-center">
          <div className="eyebrow eyebrow-accent">Focus tuvo un problema</div>
          <p className="mt-2 text-[13px] text-[var(--color-muted)]">El resto de la app sigue bien. Reinicia el temporizador para continuar.</p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => {
              stopFocus();
              reset();
            }}
          >
            Reiniciar Focus
          </Button>
        </div>
      )}
    >
      <FocusView />
    </ErrorBoundary>
  );
}
