import { useMemo } from "react";
import { useMoureWeeks } from "@/hooks/useMoureWeeks";
import { Card, CardTitle, DeltaChip, Headline, Stat } from "@/ui";
import { EmptyState } from "@/ui/EmptyState";
import { LineChart } from "@/ui/LineChart";
import { MOUREDEV_GOAL_HOURS_PER_WEEK } from "@/data/mouredev";
import { todayISO } from "@/lib/date";

export function MoureDevTab() {
  const weeks = useMoureWeeks();

  const points = useMemo(() => {
    return (weeks ?? [])
      .filter((w) => w.date)
      .reduce<{ label: string; value: number }[]>((out, w) => {
        const prev = out.length ? out[out.length - 1].value : 0;
        out.push({ label: `S${w.week}`, value: Math.round((prev + w.effectiveHours) * 10) / 10 });
        return out;
      }, []);
  }, [weeks]);

  const totalHours = points.length ? points[points.length - 1].value : 0;
  const doneWeeks = (weeks ?? []).filter((w) => w.done).length;

  // The latest week that has hours (that has begun by today) against the one before it.
  const today = todayISO();
  const withHours = (weeks ?? []).filter((w) => w.date && w.date <= today && w.effectiveHours > 0);
  const latest = withHours[withHours.length - 1];
  const before = withHours[withHours.length - 2];
  const diff = latest && before ? Math.round((latest.effectiveHours - before.effectiveHours) * 10) / 10 : null;
  const vsGoal = latest ? Math.round((latest.effectiveHours - MOUREDEV_GOAL_HOURS_PER_WEEK) * 10) / 10 : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Horas de estudio</CardTitle>
        {latest ? (
          <div className="mt-3">
            <Headline
              value={String(latest.effectiveHours).replace(".", ",")}
              unit="h"
              caption={`Semana ${latest.week} · meta ~${MOUREDEV_GOAL_HOURS_PER_WEEK} h por semana`}
              deltas={
                <>
                  <DeltaChip diff={diff} unit="h" label="vs semana anterior" />
                  <DeltaChip diff={vsGoal} unit="h" good="up" label="vs meta" />
                </>
              }
            />
          </div>
        ) : (
          <EmptyState
            icon="target"
            title="Aún no hay horas registradas"
            hint="Apunta las horas de una semana en MoureDev, o haz un bloque de Focus con “MoureDev” en el nombre: se suman solos."
          />
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Horas acumuladas" value={totalHours} sub={`de ~${MOUREDEV_GOAL_HOURS_PER_WEEK}h/semana`} accent />
        <Stat label="Semanas completas" value={`${doneWeeks} / ${weeks?.length ?? 24}`} />
      </div>
      <Card>
        <CardTitle>Horas acumuladas</CardTitle>
        <div className="mt-3">
          <LineChart points={points} unit="h" lastValueLabel={`${totalHours}h`} />
        </div>
      </Card>
    </div>
  );
}
