import { useEffect } from "react";
import { Sheet, Button } from "@/ui";
import { celebrate, haptic } from "@/lib/feedback";
import { GYM_DIAS } from "@/data/gym";
import type { CycleSlot, GymDay } from "@/lib/cycle";
import { fmtDateHuman } from "@/lib/date";
import type { ExerciseReview, SessionReview, Verdict } from "@/lib/sessionReview";

const fmtNum = (n: number) => String(Math.round(n * 10) / 10);
const fmtVol = (n: number) => Math.round(n).toLocaleString("es-CO");

interface Badge {
  text: string;
  color: string;
}

function badgeFor(e: ExerciseReview): Badge {
  const v: Verdict = e.verdict;
  if (v === "weight-up") return { text: `▲ +${fmtNum(e.deltaWeight ?? 0)} kg`, color: "var(--color-good)" };
  if (v === "reps-up") return { text: `▲ +${e.deltaReps} ${e.deltaReps === 1 ? "rep" : "reps"}`, color: "var(--color-good)" };
  if (v === "same") return { text: "= Igual", color: "var(--color-muted)" };
  if (v === "down") {
    const text = e.deltaWeight != null ? `▼ ${fmtNum(e.deltaWeight)} kg` : `▼ ${e.deltaReps} ${Math.abs(e.deltaReps ?? 0) === 1 ? "rep" : "reps"}`;
    return { text, color: "var(--color-warn)" };
  }
  if (v === "start") return { text: "Punto de partida", color: "var(--color-muted)" };
  return { text: "Primera vez", color: "var(--color-muted)" };
}

function ExerciseRow({ e }: { e: ExerciseReview }) {
  const badge = badgeFor(e);
  const today = e.topWeight != null ? `${fmtNum(e.topWeight)} kg × ${e.topReps}` : `${e.topReps} reps`;
  let before: string | null = null;
  if (e.prev) {
    const pw = e.prev.weight != null ? `${fmtNum(e.prev.weight)} kg` : "";
    const pr = e.prev.reps != null ? `${pw ? " × " : ""}${e.prev.reps}${pw ? "" : " reps"}` : "";
    before = e.prev.date ? `antes ${pw}${pr} (${fmtDateHuman(e.prev.date)})` : `partida ${pw}${pr}`;
  }
  return (
    <li className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold">{e.name}</span>
          {e.pr ? (
            <span className="pr-badge flex-none rounded-full border border-[var(--color-gold)] px-1.5 py-px text-[10.5px] font-bold tracking-wider text-[var(--color-gold)]">PR</span>
          ) : null}
        </div>
        <div className="num mt-0.5 text-[11px] text-[var(--color-muted)]">
          {today}
          {before ? <span className="text-[var(--color-muted-2)]"> · {before}</span> : null}
        </div>
      </div>
      <span className="num flex-none text-[11px] font-semibold" style={{ color: badge.color }}>
        {badge.text}
      </span>
    </li>
  );
}

function headline(r: SessionReview): { title: string; sub: string } {
  const n = r.exercises.length;
  if (r.improved > 0) return { title: `Mejoraste en ${r.improved} de ${n} ejercicios`, sub: "Así se construye: un poco más cada vez." };
  const down = r.exercises.filter((e) => e.verdict === "down").length;
  if (down > n / 2) return { title: "Día pesado", sub: "Menos que la vez pasada; pasa. Descansa bien y a la próxima." };
  return { title: "Sesión completada", sub: "Mismo nivel que la vez pasada. Mañana, una repetición más." };
}

export function SessionReviewSheet({
  open,
  onClose,
  review,
  next,
  onGoDay,
}: {
  open: boolean;
  onClose: () => void;
  review: SessionReview | null;
  /** What comes after this session in the A → B → C → descanso cycle. */
  next: { slot: CycleSlot; then: CycleSlot };
  onGoDay: (d: GymDay) => void;
}) {
  return (
    <Sheet open={open && review != null} onClose={onClose} title="Cierre de sesión">
      {review ? <Body review={review} next={next} onGoDay={onGoDay} onClose={onClose} /> : null}
    </Sheet>
  );
}

function Body({ review: r, next, onGoDay, onClose }: { review: SessionReview; next: { slot: CycleSlot; then: CycleSlot }; onGoDay: (d: GymDay) => void; onClose: () => void }) {
  const h = headline(r);
  const def = GYM_DIAS[r.day];
  const won = r.improved > 0 || r.exercises.some((e) => e.pr);
  useEffect(() => {
    // A little fanfare when the session moved the needle.
    if (!won) return;
    haptic([20, 50, 20]);
    celebrate(undefined, r.exercises.some((e) => e.pr) ? 38 : 24);
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = r.volumeDeltaPct;
  const facts = [
    `${r.setsDone}/${r.setsTarget} series`,
    r.durationMin != null ? `${r.durationMin} min` : null,
    r.toFailure ? `${r.toFailure} al fallo` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="eyebrow eyebrow-accent">
          Día {r.day} · {def.nombre}
        </div>
        <div className="mt-1.5 font-[var(--font-display)] text-[20px] leading-tight">{h.title}</div>
        <div className="mt-1 text-[12px] text-[var(--color-muted)]">{h.sub}</div>
        <div className="num mt-2 text-[11px] text-[var(--color-muted-2)]">{facts.join(" · ")}</div>
      </div>

      <div className="rounded-2xl border border-[var(--color-line-strong)] bg-[rgb(var(--fg-rgb)/0.03)] px-4 py-3">
        <div className="eyebrow">Volumen</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="num font-[var(--font-display)] text-[26px] font-light leading-none">{fmtVol(r.volume)}</span>
          <span className="text-[11px] text-[var(--color-muted)]">kg totales</span>
          {pct != null ? (
            <span className="num ml-auto text-[12px] font-semibold" style={{ color: pct >= 0 ? "var(--color-good)" : "var(--color-warn)" }}>
              {pct >= 0 ? "▲" : "▼"} {Math.abs(Math.round(pct))}%
            </span>
          ) : null}
        </div>
        <div className="num mt-1 text-[10.5px] text-[var(--color-muted-2)]">
          {r.prevVolume != null && r.prevDate
            ? `Día ${r.day} anterior (${fmtDateHuman(r.prevDate)}): ${fmtVol(r.prevVolume)} kg`
            : `Primera sesión del Día ${r.day} con volumen: queda como referencia.`}
        </div>
      </div>

      <div>
        <div className="eyebrow mb-1">Ejercicio por ejercicio</div>
        <ul className="divide-y divide-[var(--color-line)]">
          {r.exercises.map((e) => (
            <ExerciseRow key={e.name} e={e} />
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-[var(--color-red-soft)] bg-[rgb(var(--accent-rgb)/0.07)] px-4 py-3">
        <div className="eyebrow eyebrow-accent">Sigue</div>
        {next.slot === "rest" ? (
          <>
            <div className="mt-1 font-[var(--font-display)] text-[15px]">Descanso</div>
            <div className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">
              Recupera hoy. Luego toca Día {next.then === "rest" ? "A" : next.then} · {next.then !== "rest" ? GYM_DIAS[next.then].nombre : ""}.
            </div>
          </>
        ) : (
          <div className="mt-1 flex items-center justify-between gap-3">
            <div>
              <div className="font-[var(--font-display)] text-[15px]">
                Día {next.slot} · {GYM_DIAS[next.slot].nombre}
              </div>
              <div className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">{GYM_DIAS[next.slot].grupo}</div>
            </div>
            <Button
              className="flex-none px-3 py-2 text-[10.5px]"
              onClick={() => {
                onGoDay(next.slot as GymDay);
                onClose();
              }}
            >
              Ver
            </Button>
          </div>
        )}
      </div>

      <Button variant="primary" className="w-full" onClick={onClose}>
        Listo
      </Button>
    </div>
  );
}
