import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, Eyebrow, RankBadge } from "@/ui";
import { Radar } from "@/ui/Radar";
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_LABEL, groupForExercise, type MuscleGroup } from "@/data/muscleGroups";
import { rankForVolume, nextRankTier } from "@/lib/muscleRank";
import { addDays, todayISO } from "@/lib/date";
import { MuscleBodyDiagram } from "./MuscleBodyDiagram";

export function VolumenTab() {
  const sets = useLiveQuery(() => db.sets.toArray(), []);
  const [selected, setSelected] = useState<MuscleGroup | null>(null);

  const counts = useMemo(() => {
    const since = addDays(todayISO(), -28);
    const c = {} as Record<MuscleGroup, number>;
    MUSCLE_GROUP_ORDER.forEach((g) => (c[g] = 0));
    (sets ?? []).forEach((s) => {
      if (s.date < since) return;
      const g = groupForExercise(s.exercise);
      if (g) c[g]++;
    });
    return c;
  }, [sets]);

  const rankByGroup = useMemo(() => {
    const r = {} as Record<MuscleGroup, ReturnType<typeof rankForVolume>>;
    MUSCLE_GROUP_ORDER.forEach((g) => (r[g] = rankForVolume(counts[g])));
    return r;
  }, [counts]);

  const axes = useMemo(() => {
    const max = Math.max(...Object.values(counts), 1);
    return MUSCLE_GROUP_ORDER.map((g) => ({ label: MUSCLE_GROUP_LABEL[g], value: counts[g] / max, raw: counts[g] }));
  }, [counts]);

  const activeGroup = selected ?? MUSCLE_GROUP_ORDER.reduce((best, g) => (counts[g] > counts[best] ? g : best), MUSCLE_GROUP_ORDER[0]);
  const activeTier = rankByGroup[activeGroup];
  const next = nextRankTier(activeTier);

  return (
    <Card>
      <Eyebrow accent>Volumen por grupo muscular · últimos 28 días</Eyebrow>
      <div className="flex justify-center mt-4">
        <Radar axes={axes} />
      </div>

      <div className="mt-5 flex flex-col sidebar:flex-row gap-5 items-center sidebar:items-start">
        <MuscleBodyDiagram rankByGroup={rankByGroup} selected={selected} onSelect={setSelected} />

        <div className="w-full flex-1">
          <div className="panel-surface panel-surface-glow flex items-center gap-3 p-4">
            <RankBadge tier={activeTier} size={48} />
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{MUSCLE_GROUP_LABEL[activeGroup]}</div>
              <div className="text-[15px] font-bold leading-tight" style={{ color: activeTier.color }}>
                {activeTier.label}
              </div>
              <div className="num mt-0.5 text-[11px] text-[var(--color-muted-2)]">
                {counts[activeGroup]} series
                {next ? ` · faltan ${next.min - counts[activeGroup]} para ${next.label}` : " · rango máximo"}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {MUSCLE_GROUP_ORDER.map((g) => (
              <button
                key={g}
                onClick={() => setSelected(g)}
                className={`panel-surface flex flex-col items-center gap-1 p-2.5 transition-colors ${activeGroup === g ? "panel-surface-glow" : ""}`}
              >
                <RankBadge tier={rankByGroup[g]} size={28} />
                <span className="text-[9px] uppercase tracking-wide text-[var(--color-muted)]">{MUSCLE_GROUP_LABEL[g]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
