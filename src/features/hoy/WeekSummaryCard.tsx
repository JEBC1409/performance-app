import { useLiveQuery } from "dexie-react-hooks";
import { addDays, startOfWeek, todayISO } from "@/lib/date";
import { weekStats } from "@/lib/weeklySummary";
import { loadWeekInput } from "@/lib/weekData";
import type { WeekInput } from "@/lib/weeklySummary";
import { weekTip } from "@/lib/weekTip";
import { hintDatosTab } from "@/features/datos/tabHint";
import { Icon } from "@/ui/Icon";

/** Sunday (this week) and Monday (the week just finished): the week in four
 * numbers and the one thing to change, with a link to the full comparison. */
export function WeekSummaryCard({ onOpenDatos }: { onOpenDatos: () => void }) {
  const today = todayISO();
  const dow = new Date().getDay();
  const showing = dow === 0 || dow === 1;
  const weekStart = dow === 1 ? addDays(startOfWeek(today), -7) : startOfWeek(today);

  const data = useLiveQuery(async (): Promise<WeekInput | null> => (showing ? loadWeekInput(weekStart) : null), [showing, weekStart]);
  if (!showing || !data) return null;

  const cur = weekStats(data, weekStart, today);
  const prev = weekStats(data, addDays(weekStart, -7), today);
  const stats: [string, string][] = [
    ["Entrenos", String(cur.workouts)],
    ["Focus", `${(cur.focusMinutes / 60).toFixed(1)} h`],
    ["Hábitos", cur.habitPct == null ? "—" : `${Math.round(cur.habitPct * 100)} %`],
    ["Sueño", cur.sleepAvg == null ? "—" : `${cur.sleepAvg.toFixed(1)} h`],
  ];

  return (
    <button
      onClick={() => {
        hintDatosTab("semana");
        onOpenDatos();
      }}
      className="panel-surface enter flex w-full flex-col gap-3 px-4 py-3.5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow eyebrow-accent">{dow === 1 ? "Semana pasada" : "Domingo"}</div>
          <div className="card-title mt-1">Tu resumen de la semana</div>
        </div>
        <Icon name="arrow-right" size={18} className="mt-1 flex-none text-[var(--color-accent-text)]" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map(([label, value]) => (
          <div key={label}>
            <div className="num font-[var(--font-display)] text-[20px] font-light leading-none">{value}</div>
            <div className="mt-1 text-meta text-[var(--color-muted)]">{label}</div>
          </div>
        ))}
      </div>
      <p className="text-sm leading-snug text-[var(--color-muted)]">
        <span className="font-semibold text-[var(--color-ink)]">Para mejorar: </span>
        {weekTip(cur, prev)}
      </p>
    </button>
  );
}
