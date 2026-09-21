import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { targetSetsForDay } from "@/data/gym";
import type { CycleSlot, GymDay } from "@/lib/cycle";
import { celebrate, haptic } from "@/lib/feedback";
import { todayISO } from "@/lib/date";
import { FOCUS_DAILY_GOAL_MIN, ringPercents } from "@/lib/dayRings";

interface Ring {
  key: string;
  label: string;
  value: string;
  pct: number;
  color: string;
  r: number;
}

const SIZE = 150;
const C = SIZE / 2;
const STROKE = 11;

/** Three concentric rings — habits, training, Focus — that fill through the
 * day. Closing all three earns a little confetti (once per day). */
export function DayRings({ habitsDone, habitsTotal, slot }: { habitsDone: number; habitsTotal: number; slot: CycleSlot }) {
  const today = todayISO();
  const sets = useLiveQuery(() => db.sets.where("date").equals(today).toArray(), [today]);
  const focus = useLiveQuery(() => db.focusSessions.where("date").equals(today).toArray(), [today]);

  const trainedDay: GymDay | null = sets?.[0]?.day ?? (slot === "rest" ? null : slot);
  const setsDone = sets?.length ?? 0;
  const setsTarget = trainedDay ? targetSetsForDay(trainedDay) : 0;
  const focusMin = (focus ?? []).reduce((a, f) => a + f.minutes, 0);
  const rest = slot === "rest" && setsDone === 0;
  const p = ringPercents({ habitsDone, habitsTotal, setsDone, setsTarget, rest, focusMin });
  const closed = [p.habits, p.workout, p.focus].filter((v) => v >= 1).length;
  const loaded = sets !== undefined && focus !== undefined;

  useEffect(() => {
    if (!loaded || closed < 3) return;
    const key = `performance_rings_celebrated_${today}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* celebrate every time rather than never */
    }
    haptic([20, 60, 20]);
    celebrate();
  }, [closed, loaded, today]);

  const rings: Ring[] = [
    { key: "habits", label: "Hábitos", value: `${habitsDone}/${habitsTotal}`, pct: p.habits, color: "var(--color-red)", r: 62 },
    {
      key: "workout",
      label: rest ? "Descanso" : "Entreno",
      value: rest ? "hoy toca recuperar" : setsTarget ? `${setsDone}/${setsTarget} series` : "—",
      pct: p.workout,
      color: "#f3f3f5",
      r: 49,
    },
    { key: "focus", label: "Focus", value: `${focusMin}/${FOCUS_DAILY_GOAL_MIN} min`, pct: p.focus, color: "var(--color-good)", r: 36 },
  ];

  return (
    <div className="panel-surface enter enter-delay-1 flex items-center gap-4 p-4" aria-label={`Anillos del día: ${closed} de 3 cerrados`}>
      <div className="relative flex-none" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="-rotate-90" aria-hidden>
          {rings.map((r) => {
            const circ = 2 * Math.PI * r.r;
            return (
              <g key={r.key}>
                <circle cx={C} cy={C} r={r.r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
                <circle
                  cx={C}
                  cy={C}
                  r={r.r}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - r.pct)}
                  style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2, 0.8, 0.2, 1)", filter: r.pct >= 1 ? `drop-shadow(0 0 5px ${r.color})` : "none" }}
                  opacity={r.pct > 0 ? 1 : 0}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num font-[var(--font-display)] text-[26px] font-light leading-none">{closed}</span>
          <span className="mt-0.5 text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-muted)]">de 3</span>
        </div>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-3">
        {rings.map((r) => (
          <li key={r.key} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: r.color, boxShadow: r.pct >= 1 ? `0 0 8px ${r.color}` : "none" }} />
            <div className="min-w-0">
              <div className="eyebrow leading-none">{r.label}</div>
              <div className="num mt-1 truncate text-[13px] font-semibold leading-none">{r.value}</div>
            </div>
            {r.pct >= 1 ? <span className="ml-auto text-[var(--color-good)]">✓</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
