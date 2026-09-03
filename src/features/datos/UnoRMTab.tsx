import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type SetRecord } from "@/db/db";
import { Card, Eyebrow, BarChart, type BarPoint } from "@/ui";
import { startOfWeek, fmtDateHuman } from "@/lib/date";

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

  const exercises = useMemo(() => Array.from(byExercise.keys()).sort(), [byExercise]);

  return (
    <Card>
      <Eyebrow accent>Progreso de carga por semana</Eyebrow>
      {exercises.length ? (
        <div className="mt-3 grid grid-cols-1 sidebar:grid-cols-2 gap-3">
          {exercises.map((ex) => (
            <LoadProgressCard key={ex} exercise={ex} sets={byExercise.get(ex)!} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-[var(--color-muted)]">Todavía no hay series con peso registradas.</p>
      )}
    </Card>
  );
}

function LoadProgressCard({ exercise, sets }: { exercise: string; sets: SetRecord[] }) {
  const points: BarPoint[] = useMemo(() => {
    const byWeek = new Map<string, number>();
    sets.forEach((s) => {
      if (s.weight == null) return;
      const wk = startOfWeek(s.date);
      byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, s.weight));
    });
    const weeks = Array.from(byWeek.keys()).sort();
    return weeks.map((wk, i) => ({ label: fmtDateHuman(wk), value: byWeek.get(wk)!, highlight: i === weeks.length - 1 }));
  }, [sets]);

  const last = points[points.length - 1];
  const first = points[0];
  const delta = last && first ? last.value - first.value : 0;

  return (
    <div className="panel-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-semibold leading-snug">{exercise}</div>
        {last ? (
          <div className="flex-none text-right">
            <div className="num text-[13px] font-semibold text-[var(--color-red)]">{last.value}kg</div>
            {points.length > 1 ? (
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
