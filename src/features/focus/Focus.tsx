import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, Eyebrow, Button } from "@/ui";
import { showToast } from "@/ui/Toast";
import { todayISO } from "@/lib/date";
import { BLOCKS_PER_SET, FOCUS_OPTIONS, pauseFocus, remainingSeconds, resumeFocus, startFocus, stopFocus } from "@/lib/focusTimer";
import { fmtClock, useFocusTimer, useNow } from "@/hooks/useFocusTimer";

const RING_R = 92;
const RING_C = 2 * Math.PI * RING_R;

function Ring({ progress, isBreak, children }: { progress: number; isBreak: boolean; children: ReactNode }) {
  const color = isBreak ? "var(--color-good)" : "var(--color-red)";
  return (
    <div className="relative mx-auto flex h-[220px] w-[220px] items-center justify-center">
      <svg width="220" height="220" viewBox="0 0 220 220" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="110" cy="110" r={RING_R} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle
          cx="110"
          cy="110"
          r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

export function Focus() {
  const timer = useFocusTimer();
  const active = timer.status !== "idle";
  const now = useNow(timer.status === "running");
  const [task, setTask] = useState(timer.task);
  const [focusMin, setFocusMin] = useState(timer.focusMin);

  const today = todayISO();
  const sessions = useLiveQuery(() => db.focusSessions.where("date").equals(today).toArray(), [today]);
  const recent = useLiveQuery(async () => {
    const rows = await db.focusSessions.orderBy("createdAt").reverse().limit(40).toArray();
    return [...new Set(rows.map((r) => r.task))].slice(0, 5);
  }, []);

  const todaySessions = useMemo(() => [...(sessions ?? [])].sort((a, b) => b.createdAt - a.createdAt), [sessions]);
  const todayMinutes = todaySessions.reduce((a, s) => a + s.minutes, 0);

  const left = Math.min(remainingSeconds(timer, now), timer.totalSec);
  const progress = timer.totalSec > 0 ? 1 - left / timer.totalSec : 0;
  const isBreak = timer.phase === "break";

  function begin() {
    const t = task.trim();
    if (!t) {
      showToast("Escribe qué vas a hacer");
      return;
    }
    startFocus(t, focusMin);
  }

  return (
    <div className="flex flex-col gap-4 enter">
      <div>
        <Eyebrow accent>Focus</Eyebrow>
        <h1 className="font-[var(--font-display)] text-xl mt-1.5">Una tarea, un bloque</h1>
      </div>

      {active ? (
        <Card className="panel-surface-glow">
          <div className="text-center mb-4">
            <div className={`eyebrow ${isBreak ? "" : "eyebrow-accent"}`}>{isBreak ? "Descanso" : "Enfoque"}</div>
            <div className="mt-1.5 text-[15px] font-semibold leading-snug">{isBreak ? "Aléjate de la pantalla un momento" : timer.task}</div>
          </div>

          <Ring progress={progress} isBreak={isBreak}>
            <div className="num text-[44px] font-bold leading-none tracking-tight">{fmtClock(left)}</div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted-2)]">
              {timer.status === "paused" ? "En pausa" : isBreak ? "Respira" : `${timer.focusMin} min`}
            </div>
          </Ring>

          <div className="mt-4 flex items-center justify-center gap-1.5" aria-label={`Bloque ${timer.cycle + (isBreak ? 0 : 1)} de ${BLOCKS_PER_SET}`}>
            {Array.from({ length: BLOCKS_PER_SET }, (_, i) => {
              const done = i < timer.cycle;
              const current = !isBreak && i === timer.cycle;
              return (
                <span
                  key={i}
                  className="h-1.5 w-6 rounded-full transition-colors"
                  style={{ background: done ? "var(--color-red)" : current ? "var(--color-red-soft)" : "var(--color-surface-2)" }}
                />
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {timer.status === "running" ? (
              <Button onClick={pauseFocus}>Pausar</Button>
            ) : (
              <Button variant="primary" onClick={resumeFocus}>
                Reanudar
              </Button>
            )}
            <Button
              onClick={() => {
                stopFocus();
                showToast(isBreak ? "Descanso saltado" : "Bloque cancelado");
              }}
            >
              {isBreak ? "Saltar descanso" : "Cancelar"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] text-[var(--color-muted)] uppercase tracking-wide">¿Qué vas a hacer?</span>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") begin();
              }}
              placeholder="Ej. Terminar el módulo de React"
              maxLength={80}
              className="rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-red)]"
            />
          </label>

          {recent && recent.length ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => setTask(r)}
                  className="max-w-full truncate rounded-full border border-[var(--color-line-strong)] px-2.5 py-1 text-[11px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
                >
                  {r}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <div className="mb-1.5 text-[10.5px] uppercase tracking-wide text-[var(--color-muted)]">Duración del bloque</div>
            <div className="grid grid-cols-4 gap-1.5">
              {FOCUS_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setFocusMin(m)}
                  aria-pressed={focusMin === m}
                  className={`num rounded-xl border py-2.5 text-[13px] font-semibold transition-colors ${
                    focusMin === m ? "border-[var(--color-red)] bg-[rgba(223,37,49,0.12)] text-[var(--color-ink)]" : "border-[var(--color-line-strong)] text-[var(--color-muted)]"
                  }`}
                >
                  {m}
                  <span className="ml-0.5 text-[9.5px] font-medium">min</span>
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" className="mt-4 w-full py-3" onClick={begin}>
            Empezar bloque
          </Button>
          <p className="mt-2.5 text-center text-[11px] text-[var(--color-muted-2)]">
            Tras cada bloque, 5 min de descanso — cada {BLOCKS_PER_SET}, uno largo de 15.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div className="panel-surface p-3.5">
          <div className="eyebrow">Bloques hoy</div>
          <div className="num mt-1.5 text-[26px] font-bold leading-none">{todaySessions.length}</div>
        </div>
        <div className="panel-surface p-3.5">
          <div className="eyebrow">Minutos enfocados</div>
          <div className="num mt-1.5 text-[26px] font-bold leading-none">{todayMinutes}</div>
        </div>
      </div>

      {todaySessions.length ? (
        <Card padded={false}>
          <div className="eyebrow border-b border-[var(--color-line)] px-4 py-3">Hoy</div>
          <ul className="divide-y divide-[var(--color-line)]">
            {todaySessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px]">{s.task}</span>
                <span className="num flex-none text-[11px] text-[var(--color-muted)]">
                  {s.minutes} min · {new Date(s.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  onClick={() => s.id != null && db.focusSessions.delete(s.id)}
                  aria-label={`Eliminar ${s.task}`}
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-[var(--color-line-strong)] text-[var(--color-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                    <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
