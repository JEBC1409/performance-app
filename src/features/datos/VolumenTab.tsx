import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, Eyebrow } from "@/ui";
import { Radar } from "@/ui/Radar";
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_LABEL, groupForExercise } from "@/data/muscleGroups";
import { addDays, todayISO } from "@/lib/date";

export function VolumenTab() {
  const sets = useLiveQuery(() => db.sets.toArray(), []);

  const axes = useMemo(() => {
    const since = addDays(todayISO(), -28);
    const counts: Record<string, number> = {};
    MUSCLE_GROUP_ORDER.forEach((g) => (counts[g] = 0));
    (sets ?? []).forEach((s) => {
      if (s.date < since) return;
      const g = groupForExercise(s.exercise);
      if (g) counts[g]++;
    });
    const max = Math.max(...Object.values(counts), 1);
    return MUSCLE_GROUP_ORDER.map((g) => ({ label: MUSCLE_GROUP_LABEL[g], value: counts[g] / max, raw: counts[g] }));
  }, [sets]);

  return (
    <Card>
      <Eyebrow accent>Volumen por grupo muscular · últimos 28 días</Eyebrow>
      <div className="flex justify-center mt-4">
        <Radar axes={axes} />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {axes.map((a) => (
          <div key={a.label} className="text-center">
            <div className="num text-sm font-semibold">{a.raw}</div>
            <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">{a.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
