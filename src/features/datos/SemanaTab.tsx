import { Icon } from "@/ui/Icon";
import { EmptyState } from "@/ui/EmptyState";
import { SkeletonCard, SkeletonTiles } from "@/ui/Skeleton";
import { useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import { Card, DeltaChip, Headline } from "@/ui";
import { addDays, fmtDateHuman, startOfWeek, todayISO } from "@/lib/date";
import { fromKg, unitLabel } from "@/lib/units";
import { delta, weekStats } from "@/lib/weeklySummary";
import { loadWeekInput } from "@/lib/weekData";
import type { Delta, WeekStats } from "@/lib/weeklySummary";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const fmt1 = (n: number) => String(Math.round(n * 10) / 10);

/** Change against the previous week, drawn with the shared chip. `good` says
 * whether more is the win or the change shouldn't be judged. The week's own
 * "within noise" call (`dir: flat`) is respected. */
function Change({ d, unit, digits = 0, good = "up", label }: { d: Delta | null; unit?: string; digits?: number; good?: "up" | "neutral"; label?: string }) {
  return <DeltaChip diff={d ? (d.dir === "flat" ? 0 : d.diff) : null} unit={unit} digits={digits} good={good} flat={0.0001} label={label} />;
}

function Tile({ label, value, unit, sub, chip }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; chip: ReactNode }) {
  return (
    <div className="panel-surface p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="num font-[var(--font-display)] text-screen font-light leading-none">{value}</span>
        {unit ? <span className="text-sm text-[var(--color-muted)]">{unit}</span> : null}
      </div>
      <div className="mt-2 min-h-[1.35em]">{chip}</div>
      {sub ? <div className="num mt-1 text-meta leading-snug text-[var(--color-muted)]">{sub}</div> : null}
    </div>
  );
}

function weekLabel(start: string, current: string): string {
  if (start === current) return "Esta semana";
  if (start === addDays(current, -7)) return "Semana pasada";
  return `Semana del ${fmtDateHuman(start)}`;
}

export function SemanaTab() {
  const today = todayISO();
  const currentWeek = startOfWeek(today);
  const [weekStart, setWeekStart] = useState(currentWeek);

  const data = useLiveQuery(() => loadWeekInput(weekStart), [weekStart]);
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const unit = settings?.unit ?? DEFAULT_SETTINGS.unit;

  if (!data)
    return (
      <div className="flex flex-col gap-3">
        <SkeletonCard lines={2} />
        <SkeletonTiles count={4} />
      </div>
    );

  const cur = weekStats(data, weekStart, today);
  const prev = weekStats(data, addDays(weekStart, -7), today);
  const isCurrent = weekStart >= currentWeek;
  const kg = (n: number | null) => (n == null ? null : fromKg(n, unit));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          aria-label="Semana anterior"
          className="glass tap-target flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{weekLabel(weekStart, currentWeek)}</div>
          <div className="num text-meta text-[var(--color-muted)]">
            {fmtDateHuman(cur.start)} – {fmtDateHuman(cur.end)}
          </div>
        </div>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          disabled={isCurrent}
          aria-label="Semana siguiente"
          className="glass tap-target flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-ink)] disabled:opacity-30"
        >
          <Icon name="chevron-right" size={18} />
        </button>
      </div>

      <Hero cur={cur} prev={prev} />

      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Entrenos"
          value={cur.workouts}
          sub={cur.sets ? `${cur.sets} series · ${Math.round(cur.volume).toLocaleString("es-CO")} kg` : "Sin series esta semana"}
          chip={<Change d={delta(cur.workouts, prev.workouts)} />}
        />
        <Tile
          label="Focus"
          value={cur.focusBlocks}
          unit={cur.focusBlocks === 1 ? "bloque" : "bloques"}
          sub={`${cur.focusMinutes} min · ${cur.focusDays} ${cur.focusDays === 1 ? "día" : "días"}`}
          chip={<Change d={delta(cur.focusMinutes, prev.focusMinutes)} unit="min" />}
        />
        <Tile
          label="Sueño"
          value={cur.sleepAvg != null ? fmt1(cur.sleepAvg) : "—"}
          unit={cur.sleepAvg != null ? "h prom." : undefined}
          sub={cur.sleepNights ? `${cur.sleepNights} ${cur.sleepNights === 1 ? "noche" : "noches"} registradas` : "Sin registros"}
          chip={<Change d={delta(cur.sleepAvg, prev.sleepAvg, 0.1)} unit="h" digits={1} />}
        />
        <Tile
          label="Peso"
          value={cur.weightLast != null ? fmt1(kg(cur.weightLast)!) : "—"}
          unit={cur.weightLast != null ? unitLabel(unit) : undefined}
          sub={cur.weightAvg != null ? `Promedio ${fmt1(kg(cur.weightAvg)!)} ${unitLabel(unit)}` : "Sin registros"}
          chip={<Change d={delta(kg(cur.weightAvg), kg(prev.weightAvg), 0.05)} unit={unitLabel(unit)} good="neutral" digits={1} />}
        />
        {cur.moureHours != null || prev.moureHours != null ? (
          <Tile
            label="MoureDev"
            value={cur.moureHours != null ? fmt1(cur.moureHours) : "—"}
            unit={cur.moureHours != null ? "h" : undefined}
            sub="Horas registradas en Datos › MoureDev"
            chip={<Change d={delta(cur.moureHours ?? 0, prev.moureHours ?? 0, 0.05)} unit="h" digits={1} />}
          />
        ) : null}
      </div>

      <Habits cur={cur} prev={prev} />
    </div>
  );
}

function Hero({ cur, prev }: { cur: WeekStats; prev: WeekStats }) {
  return (
    <div className="panel-surface panel-surface-glow p-4">
      <h2 className="card-title">Días activos</h2>
      <div className="mt-3">
        <Headline value={cur.activeDays} unit="de 7 días" deltas={<Change d={delta(cur.activeDays, prev.activeDays)} label={`vs semana anterior (${prev.activeDays})`} />} />
      </div>
      <ul className="mt-4 grid grid-cols-7 gap-1.5">
        {cur.activeByDay.map((on, i) => (
          <li key={i} className="flex flex-col items-center gap-1.5">
            <span
              role="img"
              aria-label={`${DAY_NAMES[i]}: ${on ? "activo" : "sin actividad"}`}
              className="flex h-8 w-full items-center justify-center rounded-lg border"
              style={{
                background: on ? "rgb(var(--accent-solid-rgb))" : "rgb(var(--fg-rgb)/0.03)",
                borderColor: on ? "rgb(var(--accent-solid-rgb))" : "var(--color-line-strong)",
                color: "var(--text-on-accent)",
              }}
            >
              {on ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : null}
            </span>
            <span aria-hidden className="text-meta font-semibold text-[var(--color-muted)]">
              {DAY_LETTERS[i]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Habits({ cur, prev }: { cur: WeekStats; prev: WeekStats }) {
  const denom = Math.max(1, cur.elapsedDays);
  const hasKey = cur.habits.some((h) => /biblia|mouredev|moure/i.test(h.label));
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="card-title">Hábitos</h2>
        {cur.habitPct != null ? (
          <span className="num text-sm font-semibold">
            {Math.round(cur.habitPct * 100)}%
            {prev.habitPct != null ? <span className="ml-1.5 text-meta font-normal text-[var(--color-muted)]">antes {Math.round(prev.habitPct * 100)}%</span> : null}
          </span>
        ) : null}
      </div>
      {cur.habits.length ? (
        <ul className="mt-3 flex flex-col gap-3">
          {cur.habits.map((h) => {
            const before = prev.habits.find((p) => p.key === h.key)?.days ?? 0;
            return (
              <li key={h.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm">{h.label}</span>
                  <span className="num text-meta text-[var(--color-muted)]">
                    {h.days}/{denom}
                    <span className="ml-1.5">antes {before}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div className="h-full rounded-full bg-[rgb(var(--accent-rgb))]" style={{ width: `${Math.min(100, (h.days / denom) * 100)}%`, transition: "width 300ms ease-out" }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState compact icon="check" title="Aún no tienes hábitos" hint="Créalos en Perfil › Hábitos y aquí verás cuántos días cumples cada uno." />
      )}
      {cur.habits.length && !hasKey ? (
        <p className="mt-3 text-meta leading-snug text-[var(--color-muted)]">
          Tip: crea los hábitos «Biblia» y «MoureDev» en Perfil › Hábitos y aparecerán aquí, con los días que cumpliste cada uno.
        </p>
      ) : null}
    </Card>
  );
}
