import { useState } from "react";
import { useDailyStreak } from "@/hooks/useDailyStreak";
import { Icon } from "@/ui/Icon";
import { RankBadge } from "@/ui";
import { FlameGlyph, FreezeGlyph } from "@/ui/icons";
import { addDays, startOfWeek, todayISO, DIAS_CORTO } from "@/lib/date";

import { tierInk } from "@/lib/tierInk";

const FREEZE_COLOR = "#4fa8c9";
const OPEN_KEY = "performance_streak_open_v1";

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function DailyStreakCard() {
  const data = useDailyStreak();
  // The level bar is detail, not the headline: folded by default to keep Hoy short.
  const [open, setOpen] = useState(readOpen);
  if (!data) return null;

  const today = todayISO();
  const weekStart = startOfWeek(today);
  const byDate = new Map(data.scores.map((s) => [s.date, s]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      label: DIAS_CORTO[i],
      done: (byDate.get(date)?.points ?? 0) > 0,
      frozen: data.frozenDates.has(date),
      isToday: date === today,
      isFuture: date > today,
    };
  });

  const { tier, next, pct, daysToNext } = data.progress;

  return (
    <div className="panel-surface enter enter-delay-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FlameGlyph size={30} className={`flex-none ${data.streak > 0 ? "flame-glow" : "text-[var(--color-muted-2)]"}`} />
          <div>
            <div className="num text-screen font-bold leading-none">
              {data.streak}
              <span className="ml-1 text-sm font-medium text-[var(--color-muted)]">{data.streak === 1 ? "día" : "días"}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-meta text-[var(--color-muted)]">Racha de constancia</span>
              <span
                className="flex items-center gap-1 text-meta"
                style={{ color: FREEZE_COLOR }}
                title={`${data.freezesAvailable} comodines disponibles este mes`}
                aria-label={`${data.freezesAvailable} ${data.freezesAvailable === 1 ? "comodín disponible" : "comodines disponibles"} este mes`}
              >
                <FreezeGlyph size={12} />
                {data.freezesAvailable}
              </span>
            </div>
          </div>
        </div>
        <RankBadge tier={tier} size={40} />
      </div>

      <div className="mt-3.5 flex gap-1.5" role="list" aria-label="Esta semana">
        {week.map((d) => (
          <div
            key={d.date}
            role="listitem"
            aria-current={d.isToday ? "date" : undefined}
            aria-label={`${d.label}: ${d.done ? "con actividad" : d.frozen ? "cubierto con comodín" : d.isFuture ? "por venir" : d.isToday ? "hoy, sin actividad todavía" : "sin actividad"}`}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div
              className={`flex h-8 w-full items-center justify-center rounded-lg border text-meta transition-colors ${
                d.done
                  ? "border-[var(--color-good)] bg-[var(--color-good-soft)] text-[var(--color-good)]"
                  : d.frozen
                    ? "text-[var(--color-ink)]"
                    : d.isToday
                      ? "border-[var(--color-accent-text)] text-[var(--color-accent-text)]"
                      : "border-[var(--color-line-strong)] text-[var(--color-muted-2)]"
              }`}
              style={d.frozen ? { borderColor: FREEZE_COLOR, background: `${FREEZE_COLOR}26`, color: FREEZE_COLOR } : undefined}
              title={d.frozen ? "Cubierto con un comodín" : undefined}
            >
              {d.done ? <Icon name="check" size={13} /> : d.frozen ? <FreezeGlyph size={10} /> : d.isFuture ? "" : d.isToday ? "…" : "·"}
            </div>
            <span className={`text-meta leading-none ${d.isToday ? "font-semibold text-[var(--color-accent-text)]" : "text-[var(--color-muted)]"}`}>{d.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <button
          onClick={() => {
            const next = !open;
            setOpen(next);
            try {
              localStorage.setItem(OPEN_KEY, next ? "1" : "0");
            } catch {
              /* not remembered */
            }
          }}
          aria-expanded={open}
          className="tap-target -mb-2 flex w-full items-center justify-between gap-3 text-left text-meta"
        >
          <span className="font-semibold" style={{ color: tierInk(tier.color) }}>
            {tier.label}
            <span className="ml-1.5 font-normal text-[var(--color-muted)]">· {data.activeDays} días activos</span>
          </span>
          <span className="flex items-center gap-1.5 num text-[var(--color-muted)]">
            {next ? `${daysToNext} ${daysToNext === 1 ? "día" : "días"} para ${next.label}` : "rango máximo"}
            <Icon name="chevron-right" size={13} className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
          </span>
        </button>
        {open && next ? (
          <div className="mt-2 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
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
