import { useMemo } from "react";
import { useMoureWeeks } from "@/hooks/useMoureWeeks";
import { Card, Stat } from "@/ui";
import { LineChart } from "@/ui/LineChart";
import { MOUREDEV_GOAL_HOURS_PER_WEEK } from "@/data/mouredev";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Horas acumuladas" value={totalHours} sub={`de ~${MOUREDEV_GOAL_HOURS_PER_WEEK}h/semana`} accent />
        <Stat label="Semanas completas" value={`${doneWeeks} / ${weeks?.length ?? 24}`} />
      </div>
      <Card>
        <h2 className="card-title">Horas acumuladas</h2>
        <div className="mt-3">
          <LineChart points={points} lastValueLabel={`${totalHours}h`} />
        </div>
      </Card>
    </div>
  );
}
