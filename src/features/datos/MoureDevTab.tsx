import { useMemo, useState } from "react";
import { useMoureWeeks } from "@/hooks/useMoureWeeks";
import { BarChart, Card, DeltaChip, Headline, LineChart } from "@/ui";
import { EmptyState } from "@/ui/EmptyState";
import { SkeletonCard } from "@/ui/Skeleton";
import { MOUREDEV_GOAL_HOURS_PER_WEEK } from "@/data/mouredev";
import { todayISO } from "@/lib/date";
import { Segmented } from "./components";

type View = "semana" | "acumulado";
const VIEWS: { key: View; label: string }[] = [
  { key: "semana", label: "Por semana" },
  { key: "acumulado", label: "Acumulado" },
];

/** Weeks drawn in the weekly bars (the course lasts 24, so this is the recent stretch). */
const BAR_WEEKS = 12;

const hoursText = (n: number) => String(n).replace(".", ",");

export function MoureDevTab() {
  const weeks = useMoureWeeks();
  const [view, setView] = useState<View>("semana");
  const today = todayISO();

  // Weeks that have begun; a week that hasn't started can't have hours, so it isn't a zero.
  const started = useMemo(() => (weeks ?? []).filter((w) => w.date && w.date <= today), [weeks, today]);

  const cumulative = useMemo(
    () =>
      started.reduce<{ label: string; value: number }[]>((out, w) => {
        const prev = out.length ? out[out.length - 1].value : 0;
        out.push({ label: `S${w.week}`, value: Math.round((prev + w.effectiveHours) * 10) / 10 });
        return out;
      }, []),
    [started],
  );
  const bars = useMemo(
    () => started.slice(-BAR_WEEKS).map((w, i, arr) => ({ label: `S${w.week}`, value: Math.round(w.effectiveHours * 10) / 10, highlight: i === arr.length - 1 })),
    [started],
  );

  const totalHours = cumulative.length ? cumulative[cumulative.length - 1].value : 0;
  const doneWeeks = (weeks ?? []).filter((w) => w.done).length;

  // The latest week that has hours against the one before it.
  const withHours = started.filter((w) => w.effectiveHours > 0);
  const latest = withHours[withHours.length - 1];
  const before = withHours[withHours.length - 2];
  const diff = latest && before ? Math.round((latest.effectiveHours - before.effectiveHours) * 10) / 10 : null;
  const vsGoal = latest ? Math.round((latest.effectiveHours - MOUREDEV_GOAL_HOURS_PER_WEEK) * 10) / 10 : null;

  if (!weeks) return <SkeletonCard lines={3} />;

  return (
    <div className="flex flex-col gap-4">
      <Card className="panel-surface-glow">
        <h2 className="card-title">Horas de estudio</h2>
        {latest ? (
          <>
            <div className="mt-3">
              <Headline
                value={hoursText(latest.effectiveHours)}
                unit="h"
                caption={`Semana ${latest.week} · meta ${MOUREDEV_GOAL_HOURS_PER_WEEK} h por semana`}
                deltas={
                  <>
                    <DeltaChip diff={diff} unit="h" label="vs semana anterior" />
                    <DeltaChip diff={vsGoal} unit="h" good="up" label="vs meta" />
                  </>
                }
              />
            </div>
            {/* One week is a fact, not a chart: the headline already says it. */}
            {bars.length >= 2 ? (
              <>
                <Segmented className="mt-4" label="Vista de la gráfica" items={VIEWS} value={view} onChange={setView} />
                <div className="datos-bars mt-3">
                  {view === "semana" ? (
                    <BarChart points={bars} goalLine={MOUREDEV_GOAL_HOURS_PER_WEEK} unit="h" />
                  ) : (
                    <LineChart points={cumulative} unit="h" showTrend={false} lastValueLabel={`${hoursText(totalHours)} h`} />
                  )}
                </div>
              </>
            ) : null}
            <p className="num mt-3 text-sm text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-ink)]">{hoursText(totalHours)} h</span> acumuladas ·{" "}
              <span className="font-semibold text-[var(--color-ink)]">
                {doneWeeks} de {weeks?.length ?? 24}
              </span>{" "}
              semanas completas
            </p>
          </>
        ) : (
          <EmptyState
            icon="target"
            title="Aún no hay horas registradas"
            hint="Apunta las horas de una semana en MoureDev, o haz un bloque de Focus con “MoureDev” en el nombre: se suman solos."
          />
        )}
      </Card>
    </div>
  );
}
