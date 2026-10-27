import { useMemo, useState } from "react";
import { useMoureWeeks, type MoureWeekView } from "@/hooks/useMoureWeeks";
import { db } from "@/db/db";
import { Button, Card, Field, Input, PageHeader, BarChart, type BarPoint } from "@/ui";
import { Icon } from "@/ui/Icon";
import { visibleWeekNumbers } from "./visibleWeeks";
import { MOUREDEV_TARGET_LABEL, MOUREDEV_GOAL_HOURS_PER_WEEK } from "@/data/mouredev";

const DEV_TOOLS = [
  { label: "Python Docs", url: "https://docs.python.org/es/3/" },
  { label: "Real Python", url: "https://realpython.com" },
  { label: "PyPI", url: "https://pypi.org" },
  { label: "GitHub", url: "https://github.com" },
  { label: "VS Code", url: "https://code.visualstudio.com" },
  { label: "freeCodeCamp", url: "https://www.freecodecamp.org" },
  { label: "Stack Overflow", url: "https://stackoverflow.com" },
  { label: "LeetCode", url: "https://leetcode.com" },
];

type WeekPatch = Partial<{ date: string; topic: string; hours: number | null; project: string }>;

function WeekRow({ w, open, onToggleOpen, onPatch, onDone }: { w: MoureWeekView; open: boolean; onToggleOpen: () => void; onPatch: (f: WeekPatch) => void; onDone: () => void }) {
  const hours = w.effectiveHours > 0 ? `${w.effectiveHours} h` : "—";
  return (
    <li>
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className="flex min-h-[var(--control-h)] w-full items-center gap-3 px-4 py-1 text-left"
      >
        <span className="num w-8 flex-none text-sm font-semibold text-[var(--color-muted)]">S{w.week}</span>
        <span className={`min-w-0 flex-1 truncate text-sm ${w.topic ? "" : "text-[var(--color-muted)]"}`}>{w.topic || "Sin tema todavía"}</span>
        <span className="num flex-none text-sm text-[var(--color-muted)]">{hours}</span>
        <span className="flex w-5 flex-none justify-center text-[var(--color-good)]">
          {w.done ? (
            <>
              <Icon name="check" size={16} />
              <span className="sr-only">Completada</span>
            </>
          ) : null}
        </span>
        <Icon name="chevron-right" size={16} className={`flex-none text-[var(--color-muted)] transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
      </button>

      {open ? (
        <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
          <Field label="Tema o módulo">
            <Input defaultValue={w.topic} placeholder="Ej. Funciones y módulos" maxLength={80} onBlur={(e) => onPatch({ topic: e.target.value })} />
          </Field>
          <div className="grid grid-cols-[3fr_2fr] gap-3">
            <Field label="Fecha">
              <Input type="date" className="w-full min-w-0" defaultValue={w.date} onChange={(e) => onPatch({ date: e.target.value })} />
            </Field>
            <Field label="Horas anotadas">
              <Input
                inputMode="decimal"
                className="num w-full min-w-0"
                placeholder="0"
                defaultValue={w.hours ?? ""}
                onBlur={(e) => {
                  const n = parseFloat(e.target.value.replace(",", "."));
                  onPatch({ hours: Number.isFinite(n) && n >= 0 ? n : null });
                }}
              />
            </Field>
          </div>
          {w.focusHours > 0 ? <p className="num text-sm text-[var(--color-muted)]">Focus midió {w.focusHours} h en esta semana.</p> : null}
          <Field label="Proyecto">
            <Input defaultValue={w.project} placeholder="Ej. Calculadora CLI" maxLength={80} onBlur={(e) => onPatch({ project: e.target.value })} />
          </Field>
          <Button selected={w.done} onClick={onDone} className="w-full">
            {w.done ? "Semana completada" : "Marcar como completada"}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function Mouredev() {
  const weeks = useMoureWeeks();
  const [showAll, setShowAll] = useState(false);
  // "auto" = the next week to do; after a tap it is the week you chose (or none).
  const [openWeek, setOpenWeek] = useState<number | null | "auto">("auto");

  const list = useMemo(() => weeks ?? [], [weeks]);
  const totalHours = Math.round(list.reduce((a, r) => a + r.effectiveHours, 0) * 10) / 10;
  const doneWeeks = list.filter((w) => w.done).length;
  const nextWeek = list.find((w) => !w.done)?.week ?? null;
  const open = openWeek === "auto" ? nextWeek : openWeek;

  const hourPoints: BarPoint[] = useMemo(
    () => list.filter((w) => w.effectiveHours > 0).map((w) => ({ label: `S${w.week}`, value: w.effectiveHours, highlight: w.done })),
    [list],
  );

  const visible = useMemo(() => visibleWeekNumbers(list), [list]);
  const shown = showAll ? list : list.filter((w) => visible.has(w.week));
  const hidden = list.length - list.filter((w) => visible.has(w.week)).length;

  async function patch(week: number, fields: WeekPatch) {
    await db.moureWeeks.update(week, fields);
  }

  async function toggleDone(week: number, done: boolean) {
    await db.moureWeeks.update(week, { done: !done });
  }

  async function addWeek() {
    const last = weeks?.[weeks.length - 1];
    const week = (last?.week ?? 0) + 1;
    await db.moureWeeks.add({ week, date: "", topic: "", hours: null, project: "", done: false });
    setShowAll(true);
    setOpenWeek(week);
  }

  return (
    <div className="flex flex-col gap-4 enter">
      <PageHeader eyebrow="MoureDev" title="Ruta Python" subtitle={MOUREDEV_TARGET_LABEL} />

      <Card className="panel-surface-glow">
        <div className="eyebrow">Horas totales</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="num font-[var(--font-display)] text-hero font-light tracking-tight text-[var(--color-ink)]">{totalHours}</span>
          <span className="text-title text-[var(--color-muted)]">h</span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {doneWeeks} de {list.length || 24} semanas completas · meta ~{MOUREDEV_GOAL_HOURS_PER_WEEK} h por semana
        </p>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold">Horas por semana</h2>
          {hourPoints.length >= 2 ? (
            <BarChart points={hourPoints} height={100} goalLine={MOUREDEV_GOAL_HOURS_PER_WEEK} unit="h" />
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--color-line-strong)] px-3 py-4 text-sm leading-snug text-[var(--color-muted)]">
              {hourPoints.length
                ? "Con la segunda semana con horas verás aquí cómo van."
                : "Aún no hay horas. Anota las de la semana abajo, o haz un bloque de Focus llamado “MoureDev” o “Python” y se suma solo."}
            </p>
          )}
        </div>

        <details className="group mt-2 border-t border-[var(--color-line)]">
          <summary className="flex min-h-[var(--control-h)] cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            ¿Cómo se cuentan las horas?
            <Icon name="chevron-right" size={16} className="flex-none text-[var(--color-muted)] transition-transform group-open:rotate-90" />
          </summary>
          <p className="pb-2 text-sm leading-snug text-[var(--color-muted)]">
            Los bloques de Focus cuyo nombre diga “MoureDev” o “Python” suman solos a su semana, según la fecha de cada semana. Cada semana cuenta lo mayor entre lo que anotas y lo que mide Focus.
          </p>
        </details>
      </Card>

      <Card padded={false}>
        <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-4">
          <h2 className="card-title">Semanas</h2>
          <span className="num text-sm text-[var(--color-muted)]">
            {doneWeeks} / {list.length || 24}
          </span>
        </div>
        {weeks === undefined ? (
          <div className="px-4 py-6 text-sm text-[var(--color-muted)]">Cargando…</div>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {shown.map((w) => (
              <WeekRow
                key={w.week}
                w={w}
                open={open === w.week}
                onToggleOpen={() => setOpenWeek(open === w.week ? null : w.week)}
                onPatch={(f) => void patch(w.week, f)}
                onDone={() => void toggleDone(w.week, w.done)}
              />
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 border-t border-[var(--color-line)] p-3">
          {hidden > 0 || showAll ? (
            <Button variant="ghost" className="w-full" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
              {showAll ? "Ocultar las semanas vacías" : `Ver todas (${hidden} más)`}
            </Button>
          ) : null}
          <Button className="w-full" onClick={addWeek}>
            + Agregar semana
          </Button>
        </div>
      </Card>

      <details className="group panel-surface">
        <summary className="flex min-h-[var(--control-h)] cursor-pointer list-none items-center justify-between gap-3 px-4 [&::-webkit-details-marker]:hidden">
          <span className="card-title">Herramientas</span>
          <Icon name="chevron-right" size={16} className="flex-none text-[var(--color-muted)] transition-transform group-open:rotate-90" />
        </summary>
        <div className="flex flex-wrap gap-2 px-4 pb-4 pt-1">
          {DEV_TOOLS.map((t) => (
            <a
              key={t.label}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[var(--control-h)] items-center rounded-full border border-[var(--color-line-strong)] px-4 text-sm font-semibold text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent-text)] hover:text-[var(--color-accent-text)]"
            >
              {t.label}
            </a>
          ))}
        </div>
      </details>
    </div>
  );
}
