import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type SetRecord } from "@/db/db";
import { Card, Eyebrow, Select } from "@/ui";
import { BarChart, type BarPoint } from "@/ui/BarChart";
import { epley1RM, roundKg } from "@/lib/epley";
import { startOfWeek, fmtDateHuman } from "@/lib/date";

export function UnoRMTab() {
  const exercises = useLiveQuery(async () => {
    const rows = await db.sets.toArray();
    return Array.from(new Set(rows.map((r) => r.exercise))).sort();
  }, []);

  const [exercise, setExercise] = useState<string>("");
  const active = exercise || exercises?.[0] || "";

  const sets = useLiveQuery(() => (active ? db.sets.where("exercise").equals(active).toArray() : Promise.resolve([] as SetRecord[])), [active]);

  const points: BarPoint[] = useMemo(() => {
    if (!sets?.length) return [];
    const byWeek = new Map<string, number>();
    sets.forEach((s) => {
      if (s.weight == null || s.reps == null) return;
      const wk = startOfWeek(s.date);
      const est = epley1RM(s.weight, s.reps);
      byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, est));
    });
    const weeks = Array.from(byWeek.keys()).sort();
    return weeks.map((wk, i) => ({ label: fmtDateHuman(wk), value: roundKg(byWeek.get(wk)!), highlight: i === weeks.length - 1 }));
  }, [sets]);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Eyebrow accent>1RM estimado (Epley)</Eyebrow>
        <Select value={active} onChange={(e) => setExercise(e.target.value)} className="min-w-[180px]">
          {(exercises ?? []).map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-3">
        <BarChart points={points} unit="kg estimados por semana" />
      </div>
    </Card>
  );
}
