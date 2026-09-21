import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type SetRecord } from "@/db/db";
import { Card, Eyebrow, BarChart, type BarPoint } from "@/ui";
import { startOfWeek, fmtDateHuman } from "@/lib/date";
import { GYM_DIAS, GYM_DAY_ORDER, START_WEIGHTS_AS_OF, allExerciseNames } from "@/data/gym";

/** The working weights you told the app you're at (see gym.ts), by exercise —
 * shown as the starting point of each chart so every routine exercise has a
 * current load, even before its first logged set. */
const STARTS = new Map<string, { kg: number; note?: string }>();
GYM_DAY_ORDER.forEach((d) =>
  GYM_DIAS[d].ex.forEach((e) => {
    if (e.startKg != null) STARTS.set(e.name, { kg: e.startKg, note: e.loadNote });
  }),
);

export function UnoRMTab() {
  const sets = useLiveQuery(() => db.sets.toArray(), []);

  const byExercise = useMemo(() => {
    const map = new Map<string, SetRecord[]>();
    (sets ?? []).forEach((s) => {
      if (s.weight == null) return;
      if (!map.has(s.exercise)) map.set(s.exercise, []);
      map.get(s.exercise)!.push(s);
    });
    return map;
  }, [sets]);

  // Only what's in the current routine: exercises you've dropped (their old
  // sets stay in your history and volume, they just don't clutter this view).
  const exercises = useMemo(() => allExerciseNames().filter((name) => STARTS.has(name) || byExercise.has(name)).sort((a, b) => a.localeCompare(b, "es")), [byExercise]);

  return (
    <Card>
      <Eyebrow accent>Progreso de carga por semana</Eyebrow>
      {exercises.length ? (
        <div className="mt-3 grid grid-cols-1 sidebar:grid-cols-2 gap-3">
          {exercises.map((ex) => (
            <LoadProgressCard key={ex} exercise={ex} sets={byExercise.get(ex) ?? []} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-[var(--color-muted)]">Todavía no hay series con peso registradas.</p>
      )}
    </Card>
  );
}

function LoadProgressCard({ exercise, sets }: { exercise: string; sets: SetRecord[] }) {
  const start = STARTS.get(exercise);
  const points: BarPoint[] = useMemo(() => {
    const byWeek = new Map<string, number>();
    sets.forEach((s) => {
      if (s.weight == null) return;
      const wk = startOfWeek(s.date);
      byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, s.weight));
    });
    // Today's working weight counts for the week it was given, unless a
    // heavier set was already logged that week.
    if (start) {
      const wk = startOfWeek(START_WEIGHTS_AS_OF);
      byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, start.kg));
    }
    const weeks = Array.from(byWeek.keys()).sort();
    return weeks.map((wk, i) => ({ label: fmtDateHuman(wk), value: byWeek.get(wk)!, highlight: i === weeks.length - 1 }));
  }, [sets, start]);

  const last = points[points.length - 1];
  // With a declared current weight, progress is measured from it: older
  // sessions may have counted the load differently (a bar's total vs "por
  // lado"), so a raw first-to-last difference would mislead.
  const baseIdx = start ? points.findIndex((p) => p.label === fmtDateHuman(startOfWeek(START_WEIGHTS_AS_OF))) : 0;
  const first = points[Math.max(0, baseIdx)];
  const delta = last && first ? last.value - first.value : 0;
  const hasDelta = points.length - 1 > Math.max(0, baseIdx);

  return (
    <div className="panel-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold leading-snug">{exercise}</div>
          {start?.note ? <div className="mt-0.5 text-[10px] text-[var(--color-muted)]">{start.note}</div> : null}
        </div>
        {last ? (
          <div className="flex-none text-right">
            <div className="num text-[13px] font-semibold text-[var(--color-red)]">{last.value}kg</div>
            {hasDelta ? (
              <div className={`num text-[10px] ${delta >= 0 ? "text-[var(--color-good)]" : "text-[var(--color-muted-2)]"}`}>
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}kg
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-2">
        <BarChart points={points} height={90} unit="kg máx / semana" />
      </div>
    </div>
  );
}
