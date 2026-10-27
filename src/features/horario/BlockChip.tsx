import { BLOCK_BORDER, BLOCK_COLOR, BLOCK_TEXT, BLOCK_TINT } from "@/data/horario";
import type { HorarioCell } from "@/data/horario";

/** One schedule block as a colored chip (shared by the week grid and the day view).
 * The text is ink (readable on both themes); the type's colour is a 1px border and a
 * small dot. The day's must-do block gets a firmer accent border, no glow. Optional
 * blocks are dashed and muted rather than faded, so their text keeps its contrast. */
export function BlockChip({ cell, editing = false }: { cell: HorarioCell; editing?: boolean }) {
  if (cell.text === "—" && cell.type === "otro") {
    return editing ? (
      <div className="flex min-h-[34px] items-center justify-center rounded-xl border border-dashed border-[var(--color-line-strong)] text-base text-[var(--color-muted-2)]">+</div>
    ) : (
      <div className="px-1.5 py-1.5 text-meta leading-snug text-[var(--color-muted)]">{cell.text}</div>
    );
  }
  if (cell.type === "otro") {
    return <div className="px-1.5 py-1.5 text-meta leading-snug text-[var(--color-muted)]">{cell.text}</div>;
  }
  const must = !!cell.key;
  return (
    <div
      className={`flex h-full items-start gap-1.5 rounded-xl px-2.5 py-2 text-meta leading-snug ${cell.soft ? "font-medium" : "font-semibold"}`}
      style={
        must
          ? {
              background: "rgb(var(--accent-rgb) / 0.2)",
              border: "2px solid rgb(var(--accent-rgb) / 0.9)",
              color: "var(--color-ink)",
            }
          : {
              background: BLOCK_TINT[cell.type],
              border: `1px ${cell.soft ? "dashed" : "solid"} ${BLOCK_BORDER[cell.type]}`,
              color: cell.soft ? "var(--color-muted)" : BLOCK_TEXT[cell.type],
            }
      }
    >
      <span aria-hidden className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full" style={{ background: must ? "rgb(var(--accent-rgb))" : BLOCK_COLOR[cell.type] }} />
      <span className="min-w-0">{cell.text}</span>
    </div>
  );
}
