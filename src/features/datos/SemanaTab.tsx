import { Icon } from "@/ui/Icon";
import { EmptyState } from "@/ui/EmptyState";
import { SkeletonCard, SkeletonTiles } from "@/ui/Skeleton";
import { useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import { Card, Eyebrow } from "@/ui";
import { addDays, fmtDateHuman, startOfWeek, todayISO } from "@/lib/date";
import { fromKg, unitLabel } from "@/lib/units";
import { delta, weekStats } from "@/lib/weeklySummary";
import type { Delta, WeekInput, WeekStats } from "@/lib/weeklySummary";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const fmt1 = (n: number) => String(Math.round(n * 10) / 10);

/** Change vs the previous week. `good` says which direction is the win. */
function DeltaChip({ d, suffix = "", good = "up", digits = 0 }: { d: Delta | null; suffix?: string; good?: "up" | "neutral"; digits?: number }) {
  if (!d) return <span className="text-[10.5px] text-[var(--color-muted-2)]">—</span>;
  if (d.dir === "flat") return <span className="num text-[10.5px] text-[var(--color-muted)]">= igual</span>;
  const up = d.dir === "up";
  const color = good === "neutral" ? "var(--color-muted)" : up ? "var(--color-good)" : "var(--color-warn)";
  const n = Math.abs(d.diff);
  return (
    <span className="num text-[10.5px] font-semibold" style={{ color }}>
      {up ? "▲" : "▼"} {digits ? n.toFixed(digits) : Math.round(n)}
      {suffix}
    </span>
  );
}

function Tile({ label, value, unit, sub, chip }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; chip: ReactNode }) {
  return (
    <div className="panel-surface p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="eyebrow">{label}</div>
        {chip}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="num font-[var(--font-display)] text-[26px] font-light leading-none">{value}</span>
        {unit ? <span className="text-[11px] text-[var(--color-muted)]">{unit}</span> : null}
      </div>
      {sub ? <div className="num mt-1.5 text-[10.5px] leading-snug text-[var(--color-muted-2)]">{sub}</div> : null}
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

  const data = useLiveQuery(async (): Promise<WeekInput> => {
    const [sets, focus, habitDays, habitDefs, weights, sleep, moure] = await Promise.all([
      db.sets.toArray(),
      db.focusSessions.toArray(),
      db.habitDays.toArray(),
      db.habitDefs.orderBy("order").toArray(),
      db.weights.toArray(),
      db.sleep.toArray(),
      db.moureWeeks.toArray(),
    ]);
    return { sets, focus, habitDays, habitDefs, weights, sleep, moure };
  }, []);
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          aria-label="Semana anterior"
          className="glass tap-target flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <div className="text-center">
          <div className="text-[13px] font-semibold">{weekLabel(weekStart, currentWeek)}</div>
          <div className="num text-[10.5px] text-[var(--color-muted-2)]">
            {fmtDateHuman(cur.start)} – {fmtDateHuman(cur.end)}
          </div>
        </div>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          disabled={isCurrent}
          aria-label="Semana siguiente"
          className="glass tap-target flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-ink)] disabled:opacity-30"
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
          chip={<DeltaChip d={delta(cur.workouts, prev.workouts)} />}
        />
        <Tile
          label="Focus"
          value={cur.focusBlocks}
          unit={cur.focusBlocks === 1 ? "bloque" : "bloques"}
          sub={`${cur.focusMinutes} min · ${cur.focusDays} ${cur.focusDays === 1 ? "día" : "días"}`}
          chip={<DeltaChip d={delta(cur.focusMinutes, prev.focusMinutes)} suffix=" min" />}
        />
        <Tile
          label="Sueño"
          value={cur.sleepAvg != null ? fmt1(cur.sleepAvg) : "—"}
          unit={cur.sleepAvg != null ? "h prom." : undefined}
          sub={cur.sleepNights ? `${cur.sleepNights} ${cur.sleepNights === 1 ? "noche" : "noches"} registradas` : "Sin registros"}
          chip={<DeltaChip d={delta(cur.sleepAvg, prev.sleepAvg, 0.1)} suffix=" h" digits={1} />}
        />
        <Tile
          label="Peso"
          value={cur.weightLast != null ? fmt1(kg(cur.weightLast)!) : "—"}
          unit={cur.weightLast != null ? unitLabel(unit) : undefined}
          sub={cur.weightAvg != null ? `Promedio ${fmt1(kg(cur.weightAvg)!)} ${unitLabel(unit)}` : "Sin registros"}
          chip={<DeltaChip d={delta(kg(cur.weightAvg), kg(prev.weightAvg), 0.05)} suffix={` ${unitLabel(unit)}`} good="neutral" digits={1} />}
        />
        {cur.moureHours != null || prev.moureHours != null ? (
          <Tile
            label="MoureDev"
            value={cur.moureHours != null ? fmt1(cur.moureHours) : "—"}
            unit={cur.moureHours != null ? "h" : undefined}
            sub="Horas registradas en Datos › MoureDev"
            chip={<DeltaChip d={delta(cur.moureHours ?? 0, prev.moureHours ?? 0, 0.05)} suffix=" h" digits={1} />}
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow accent>Días activos</Eyebrow>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="num font-[var(--font-display)] text-[40px] font-light leading-none">{cur.activeDays}</span>
            <span className="num text-[15px] text-[var(--color-muted-2)]">/ 7</span>
          </div>
        </div>
        <div className="text-right">
          <DeltaChip d={delta(cur.activeDays, prev.activeDays)} />
          <div className="mt-1 text-[11px] text-[var(--color-muted-2)]">vs semana anterior ({prev.activeDays})</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {cur.activeByDay.map((on, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span
              className="h-7 w-full rounded-lg border"
              style={{
                background: on ? "var(--color-red)" : "rgba(255,255,255,0.03)",
                borderColor: on ? "var(--color-red)" : "var(--color-line-strong)",
                boxShadow: on ? "0 0 12px -2px var(--color-red-soft)" : "none",
              }}
            />
            <span className="text-[10.5px] font-semibold text-[var(--color-muted)]">{DAY_LETTERS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Habits({ cur, prev }: { cur: WeekStats; prev: WeekStats }) {
  const denom = Math.max(1, cur.elapsedDays);
  const hasKey = cur.habits.some((h) => /biblia|mouredev|moure/i.test(h.label));
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Hábitos</Eyebrow>
        {cur.habitPct != null ? (
          <span className="num text-[12px] font-semibold">
            {Math.round(cur.habitPct * 100)}%
            <span className="ml-1.5 text-[10.5px] font-normal text-[var(--color-muted-2)]">{prev.habitPct != null ? `(antes ${Math.round(prev.habitPct * 100)}%)` : ""}</span>
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
                  <span className="text-[12.5px]">{h.label}</span>
                  <span className="num text-[11px] text-[var(--color-muted)]">
                    {h.days}/{denom}
                    <span className="ml-1.5 text-[var(--color-muted-2)]">antes {before}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div className="h-full rounded-full bg-[var(--color-red)]" style={{ width: `${Math.min(100, (h.days / denom) * 100)}%`, transition: "width 300ms ease-out" }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState compact icon="check" title="Aún no tienes hábitos" hint="Créalos en Perfil › Hábitos y aquí verás cuántos días cumples cada uno." />
      )}
      {!hasKey ? (
        <p className="mt-3 text-[11px] leading-snug text-[var(--color-muted-2)]">
          Tip: crea los hábitos «Biblia» y «MoureDev» en Perfil › Hábitos y aparecerán aquí, con los días que cumpliste cada uno.
        </p>
      ) : null}
    </Card>
  );
}
