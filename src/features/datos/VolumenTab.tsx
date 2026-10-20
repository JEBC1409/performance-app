import { useMemo, useState } from "react";
import { lastByIndex } from "@/db/safeQuery";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, DeltaChip, Headline, RankBadge } from "@/ui";
import { EmptyState } from "@/ui/EmptyState";
import { Radar } from "@/ui/Radar";
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_LABEL, groupForExercise, type MuscleGroup } from "@/data/muscleGroups";
import { rankProgress, groupStrengthPct } from "@/lib/muscleRank";
import { roundKg } from "@/lib/epley";
import { addDays, todayISO } from "@/lib/date";
import { MuscleBodyDiagram } from "./MuscleBodyDiagram";
import { tierInk } from "@/lib/tierInk";

export function VolumenTab() {
  const sets = useLiveQuery(() => db.sets.toArray(), []);
  const lastWeight = useLiveQuery(() => lastByIndex(db.weights, "date"), []);
  const bodyweightKg = lastWeight?.weightKg ?? 0;
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

  // All series in the last 28 days against the 28 before — the number the radar is made of.
  const totals = useMemo(() => {
    const today = todayISO();
    const from = addDays(today, -28);
    const prevFrom = addDays(today, -56);
    let current = 0;
    let previous = 0;
    (sets ?? []).forEach((s) => {
      if (s.date >= from) current++;
      else if (s.date >= prevFrom) previous++;
    });
    return { current, previous };
  }, [sets]);

  const strength = useMemo(() => {
    const r = {} as Record<MuscleGroup, ReturnType<typeof groupStrengthPct>>;
    MUSCLE_GROUP_ORDER.forEach((g) => (r[g] = groupStrengthPct(sets ?? [], g, bodyweightKg)));
    return r;
  }, [sets, bodyweightKg]);

  const progressByGroup = useMemo(() => {
    const r = {} as Record<MuscleGroup, ReturnType<typeof rankProgress>>;
    MUSCLE_GROUP_ORDER.forEach((g) => (r[g] = rankProgress(strength[g].pct, 1)));
    return r;
  }, [strength]);
  const rankByGroup = useMemo(() => {
    const r = {} as Record<MuscleGroup, ReturnType<typeof rankProgress>["tier"]>;
    MUSCLE_GROUP_ORDER.forEach((g) => (r[g] = progressByGroup[g].tier));
    return r;
  }, [progressByGroup]);

  const axes = useMemo(() => {
    const max = Math.max(...Object.values(counts), 1);
    return MUSCLE_GROUP_ORDER.map((g) => ({ label: MUSCLE_GROUP_LABEL[g], value: counts[g] / max, raw: counts[g] }));
  }, [counts]);

  const activeGroup = selected ?? MUSCLE_GROUP_ORDER.reduce((best, g) => (counts[g] > counts[best] ? g : best), MUSCLE_GROUP_ORDER[0]);
  const activeProgress = progressByGroup[activeGroup];
  const activeTier = activeProgress.tier;
  const next = activeProgress.next;

  if (sets && sets.length === 0) {
    return (
      <Card>
        <div className="card-title">Volumen por grupo muscular</div>
        <EmptyState icon="dumbbell" title="Aún no hay series registradas" hint="Registra tu primera serie en Entreno y aquí verás cuánto trabajas cada grupo muscular y tu rango en cada uno." />
      </Card>
    );
  }

  const busiest = MUSCLE_GROUP_ORDER.reduce((best, g) => (counts[g] > counts[best] ? g : best), MUSCLE_GROUP_ORDER[0]);

  return (
    <Card>
      <div className="card-title">Volumen por grupo muscular <span className="text-[12px] font-normal text-[var(--color-muted)]">· últimos 28 días</span></div>
      <div className="mt-3">
        <Headline
          value={totals.current}
          unit="series"
          caption={totals.current ? "Más trabajado: " + MUSCLE_GROUP_LABEL[busiest] : "Sin series en los últimos 28 días"}
          deltas={<DeltaChip diff={totals.previous ? totals.current - totals.previous : null} digits={0} flat={1} label="vs 28 días antes" />}
        />
      </div>
      <div className="flex justify-center mt-4">
        <Radar axes={axes} />
      </div>

      <div className="mt-5 flex flex-col sidebar:flex-row gap-5 items-center sidebar:items-start">
        <MuscleBodyDiagram rankByGroup={rankByGroup} selected={selected} onSelect={setSelected} />

        <div className="w-full flex-1">
          <div className="panel-surface panel-surface-glow p-4">
            <div className="flex items-center gap-3">
              <RankBadge tier={activeTier} size={48} />
              <div className="flex-1">
                <div className="text-[12px] uppercase tracking-wide text-[var(--color-muted)]">{MUSCLE_GROUP_LABEL[activeGroup]}</div>
                <div className="text-[15px] font-bold leading-tight" style={{ color: tierInk(activeTier.color) }}>
                  {activeTier.label}
                </div>
                <div className="num mt-0.5 text-[12px] text-[var(--color-muted-2)]">
                  {bodyweightKg > 0 ? (
                    <>
                      1RM est. {roundKg(strength[activeGroup].bestKg)}kg
                      {next
                        ? ` · faltan ${roundKg((activeProgress.gapToNext ?? 0) * strength[activeGroup].bestCeiling * bodyweightKg)}kg para ${next.label}`
                        : " · rango máximo"}
                    </>
                  ) : (
                    "Registra tu peso en Datos para ver tu rango"
                  )}
                </div>
              </div>
            </div>
            {next ? (
              <div className="mt-3 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${activeProgress.pct * 100}%`,
                    background: `linear-gradient(90deg, ${activeTier.color}, ${next.color})`,
                    transition: "width 400ms ease-out",
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {MUSCLE_GROUP_ORDER.map((g) => (
              <button
                key={g}
                onClick={() => setSelected(g)}
                className={`panel-surface flex flex-col items-center gap-1 p-2.5 transition-colors ${activeGroup === g ? "panel-surface-glow" : ""}`}
              >
                <RankBadge tier={rankByGroup[g]} size={28} />
                <span className="text-[12px] uppercase tracking-wide text-[var(--color-muted)]">{MUSCLE_GROUP_LABEL[g]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
