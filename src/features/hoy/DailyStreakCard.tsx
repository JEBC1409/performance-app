import { useDailyStreak } from "@/hooks/useDailyStreak";
import { RankBadge } from "@/ui";
import { FlameGlyph } from "@/ui/icons";
import { addDays, startOfWeek, todayISO, DIAS_CORTO } from "@/lib/date";

export function DailyStreakCard() {
  const data = useDailyStreak();
  if (!data) return null;

  const today = todayISO();
  const weekStart = startOfWeek(today);
  const byDate = new Map(data.scores.map((s) => [s.date, s]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date, label: DIAS_CORTO[i], done: (byDate.get(date)?.points ?? 0) > 0, isToday: date === today, isFuture: date > today };
  });

  const { tier, next, pct, daysToNext } = data.progress;

  return (
    <div className="panel-surface enter enter-delay-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FlameGlyph size={30} className={`flex-none ${data.streak > 0 ? "flame-glow" : "text-[var(--color-muted-2)]"}`} />
          <div>
            <div className="num text-[24px] font-bold leading-none">
              {data.streak}
              <span className="ml-1 text-[12px] font-medium text-[var(--color-muted)]">{data.streak === 1 ? "día" : "días"}</span>
            </div>
            <div className="text-[9.5px] uppercase tracking-wide text-[var(--color-muted-2)] mt-1">Racha de constancia</div>
          </div>
        </div>
        <RankBadge tier={tier} size={40} />
      </div>

      <div className="mt-3.5 flex gap-1.5">
        {week.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-7 w-full items-center justify-center rounded-lg border text-[10px] transition-colors ${
                d.done
                  ? "border-[var(--color-good)] bg-[var(--color-good-soft)] text-[var(--color-good)]"
                  : d.isToday
                    ? "border-[var(--color-red)] text-[var(--color-red)]"
                    : "border-[var(--color-line-strong)] text-[var(--color-muted-2)]"
              }`}
            >
              {d.done ? "✓" : d.isFuture ? "" : d.isToday ? "…" : "·"}
            </div>
            <span className={`text-[8.5px] uppercase ${d.isToday ? "text-[var(--color-red)]" : "text-[var(--color-muted-2)]"}`}>{d.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3.5">
        <div className="flex items-center justify-between text-[10.5px]">
          <span className="font-semibold" style={{ color: tier.color }}>
            {tier.label}
            <span className="ml-1.5 font-normal text-[var(--color-muted-2)]">· {data.activeDays} días activos</span>
          </span>
          <span className="num text-[var(--color-muted-2)]">
            {next ? `${daysToNext} ${daysToNext === 1 ? "día" : "días"} para ${next.label}` : "rango máximo"}
          </span>
        </div>
        {next ? (
          <div className="mt-1.5 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, ${tier.color}, ${next.color})`, transition: "width 400ms ease-out" }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
