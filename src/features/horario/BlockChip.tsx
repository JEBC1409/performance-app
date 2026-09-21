import { BLOCK_BORDER, BLOCK_TEXT, BLOCK_TINT } from "@/data/horario";
import type { HorarioCell } from "@/data/horario";

/** One schedule block as a colored chip (shared by the week grid and the day view). */
export function BlockChip({ cell, editing = false }: { cell: HorarioCell; editing?: boolean }) {
  if (cell.text === "—" && cell.type === "otro") {
    return editing ? (
      <div className="flex min-h-[34px] items-center justify-center rounded-xl border border-dashed border-[var(--color-line-strong)] text-[16px] text-[var(--color-muted-2)]">+</div>
    ) : (
      <div className="px-1.5 py-1.5 text-[12px] leading-snug text-[var(--color-muted)]">{cell.text}</div>
    );
  }
  if (cell.type === "otro") {
    return <div className="px-1.5 py-1.5 text-[12px] leading-snug text-[var(--color-muted)]">{cell.text}</div>;
  }
  return (
    <div
      className={`h-full rounded-xl px-2.5 py-2 text-[12px] leading-snug ${cell.soft ? "font-medium" : "font-semibold"}`}
      style={
        cell.key
          ? {
              background: "rgb(var(--accent-rgb) / 0.3)",
              border: "1.5px solid var(--color-red)",
              color: "var(--color-ink)",
              boxShadow: "0 0 18px -4px rgb(var(--accent-rgb) / 0.75), 0 0 0 1px rgb(var(--accent-rgb) / 0.25) inset",
            }
          : {
              background: BLOCK_TINT[cell.type],
              border: `1px ${cell.soft ? "dashed" : "solid"} ${BLOCK_BORDER[cell.type]}`,
              color: BLOCK_TEXT[cell.type],
              opacity: cell.soft ? 0.55 : 1,
            }
      }
    >
      {cell.text}
    </div>
  );
}

