import { HORARIO } from "@/data/horario";
import { useSwipe } from "@/hooks/useSwipe";
import { currentBlockInfo } from "@/lib/scheduleBlock";
import { DIAS, DIAS_CORTO, jsDowToIndex } from "@/lib/date";
import { BlockChip } from "./BlockChip";

/** The schedule of one weekday as a vertical timeline — what the phone shows
 * instead of the wide week grid. Today's current block is marked, past blocks
 * fade, and you swipe sideways (or tap a day) to change day. */
export function DayTimeline({ day, onDay, editing, onPick }: { day: number; onDay: (d: number) => void; editing: boolean; onPick: (day: number, row: number) => void }) {
  const todayCol = jsDowToIndex(new Date().getDay());
  const isToday = day === todayCol;
  const nowRow = isToday ? currentBlockInfo().rowIndex : -1;
  const swipe = useSwipe({ onLeft: () => onDay(Math.min(6, day + 1)), onRight: () => onDay(Math.max(0, day - 1)) });

  const items: { row: number; span: number; time: string; cell: (typeof HORARIO)[number]["cells"][number] }[] = [];
  HORARIO.forEach((r, row) => {
    const cell = r.cells[day];
    if (!cell || cell.cont) return;
    const empty = cell.text === "—" && cell.type === "otro";
    if (empty && !editing) return;
    items.push({ row, span: cell.span ?? 1, time: r.time, cell });
  });

  return (
    <div {...swipe}>
      <div className="glass-track mb-4 grid grid-cols-7 gap-1 rounded-full p-1" role="tablist" aria-label="Día de la semana">
        {DIAS_CORTO.map((d, i) => (
          <button
            key={d}
            role="tab"
            aria-selected={day === i}
            onClick={() => onDay(i)}
            className={`relative rounded-full py-2 text-[11px] font-semibold uppercase ${day === i ? "glass-on" : "glass-flat text-[var(--color-muted)]"}`}
          >
            {d}
            {i === todayCol ? <span aria-hidden className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-red)]" /> : null}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-[var(--font-display)] text-[18px]">{DIAS[day]}</h2>
        {isToday ? <span className="eyebrow eyebrow-accent">Hoy</span> : null}
      </div>

      {items.length === 0 ? <p className="py-8 text-center text-[13px] text-[var(--color-muted)]">Nada en el horario este día.</p> : null}

      <ol className="relative flex flex-col gap-2.5">
        {items.map(({ row, span, time, cell }) => {
          const current = nowRow >= row && nowRow < row + span;
          const past = isToday && nowRow >= 0 && row + span - 1 < nowRow;
          return (
            <li key={row} className={`flex items-stretch gap-3 ${past ? "opacity-50" : ""}`}>
              <div className="flex w-[62px] flex-none flex-col items-end pt-2.5">
                <span className={`num text-[11.5px] font-medium ${current ? "text-[var(--color-red)]" : "text-[var(--color-muted)]"}`}>{time}</span>
                {current ? <span className="mt-1 rounded-full bg-[var(--color-red)] px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider text-white">Ahora</span> : null}
              </div>
              <span aria-hidden className="relative flex w-3 flex-none justify-center">
                <span className={`absolute bottom-[-10px] top-0 w-px ${current ? "bg-[var(--color-red)]" : "bg-[var(--color-line-strong)]"}`} />
                <span className={`relative mt-3.5 h-2.5 w-2.5 rounded-full border-2 ${current ? "border-[var(--color-red)] bg-[var(--color-red)] shadow-[0_0_10px_var(--color-red)]" : "border-[var(--color-line-strong)] bg-[var(--color-bg)]"}`} />
              </span>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <button onClick={() => onPick(day, row)} className="block w-full text-left" aria-label={`Editar ${cell.text}, ${time}`}>
                    <BlockChip cell={cell} editing />
                  </button>
                ) : (
                  <BlockChip cell={cell} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
