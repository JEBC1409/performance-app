import { confirmAction } from "@/lib/confirm";
import { HORARIO, HORARIO_NOTE, HORARIO_GOAL, BLOCK_COLOR, BLOCK_LABEL, BLOCK_TINT, BLOCK_BORDER, BLOCK_TEXT, type BlockType, type HorarioCell } from "@/data/horario";
import { DIAS_CORTO, jsDowToIndex } from "@/lib/date";
import { Card, Eyebrow } from "@/ui";
import { ScheduleNotifyCard } from "./ScheduleNotifyCard";
import { useConfigVersion } from "@/hooks/useConfigVersion";
import { useState } from "react";
import { showToast } from "@/ui/Toast";
import { CONFIG_HORARIO, resetConfig } from "@/lib/appConfig";
import { AddRowSheet, BlockSheet, RowSheet } from "./HorarioSheets";

const LEGEND: BlockType[] = ["clase", "gym", "mouredev", "ingles", "dios", "libre"];

export function Horario() {
  useConfigVersion(); // schedule edits re-render this screen
  const todayCol = jsDowToIndex(new Date().getDay());
  const [editing, setEditing] = useState(false);
  const [block, setBlock] = useState<{ day: number; row: number } | null>(null);
  const [rowEdit, setRowEdit] = useState<number | null>(null);
  const [addingRow, setAddingRow] = useState(false);

  async function restore() {
    if (!(await confirmAction({ title: "¿Volver al horario original?", message: "Se descartan todos tus cambios del horario.", confirmLabel: "Restaurar", danger: true }))) return;
    await resetConfig(CONFIG_HORARIO);
    showToast("Horario original restaurado");
  }

  return (
    <div className="flex flex-col gap-4 enter">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow accent>Horario</Eyebrow>
          <h1 className="font-[var(--font-display)] text-2xl mt-1.5">Semana</h1>
          <div className="text-[12.5px] text-[var(--color-muted)] mt-1.5">{HORARIO_NOTE}</div>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          aria-pressed={editing}
          className={`mt-1 flex-none rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] ${editing ? "glass-on" : "glass text-[var(--color-muted)]"}`}
        >
          {editing ? "Listo" : "Editar"}
        </button>
      </div>
      {editing ? <p className="-mt-2 text-[12px] leading-snug text-[var(--color-muted)]">Toca un bloque para cambiarlo, una celda vacía para llenarla, o una hora para editarla. Se guarda solo.</p> : null}

      <Card padded={false} className="panel-surface-glow">
        <div className="overflow-x-auto">
          <table className="border-collapse text-[12.5px] min-w-[900px] w-full">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[var(--color-surface)] text-left px-4 py-3.5 text-[10.5px] uppercase tracking-wide text-[var(--color-muted)] font-semibold w-[104px]">
                  Hora
                </th>
                {DIAS_CORTO.map((d, i) => (
                  <th key={d} className="px-3 py-3.5 text-center">
                    <div
                      className={`text-[13.5px] font-bold uppercase tracking-wide ${
                        i === todayCol ? "text-[var(--color-red)]" : "text-[var(--color-muted)]"
                      }`}
                    >
                      {d}
                    </div>
                    {i === todayCol ? <div className="mx-auto mt-1.5 h-[3px] w-7 rounded-full bg-[var(--color-red)] flame-glow" /> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORARIO.map((row, r) => (
                <tr key={row.time} className="border-t border-[var(--color-line)]">
                  <td className="sticky left-0 bg-[var(--color-surface)] num px-4 py-2.5 text-[11.5px] font-medium text-[var(--color-muted)] whitespace-nowrap">
                    {editing ? (
                      <button onClick={() => setRowEdit(r)} className="glass-flat hit -mx-1.5 rounded-lg px-1.5 py-0.5 underline decoration-dotted underline-offset-4" aria-label={`Editar la hora ${row.time}`}>
                        {row.time}
                      </button>
                    ) : (
                      row.time
                    )}
                  </td>
                  {row.cells.map((cell, i) =>
                    cell.cont ? null : (
                      <td
                        key={i}
                        rowSpan={cell.span}
                        className={`h-px px-1.5 py-1.5 align-top ${i === todayCol ? "bg-[rgb(var(--accent-rgb)/0.05)]" : ""}`}
                      >
                        {editing ? (
                          <button onClick={() => setBlock({ day: i, row: r })} className="block h-full w-full text-left" aria-label={`Editar ${cell.text}, ${row.time}`}>
                            <BlockChip cell={cell} editing />
                          </button>
                        ) : (
                          <BlockChip cell={cell} />
                        )}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {LEGEND.map((t) => (
          <div
            key={t}
            className="flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-muted)]"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: BLOCK_COLOR[t] }} />
            {BLOCK_LABEL[t]}
          </div>
        ))}
      </div>
      <p className="-mt-1 text-[11px] leading-snug text-[var(--color-muted-2)]">{HORARIO_GOAL}</p>

      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setAddingRow(true)} className="glass-accent tap-target rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
            + Añadir fila
          </button>
          <button onClick={restore} className="ml-auto text-[11px] text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-red)] hover:underline">
            Volver al horario original
          </button>
        </div>
      ) : null}

      <ScheduleNotifyCard />

      {block ? <BlockSheet key={`${block.day}-${block.row}`} day={block.day} row={block.row} onClose={() => setBlock(null)} /> : null}
      {rowEdit != null ? <RowSheet key={rowEdit} row={rowEdit} onClose={() => setRowEdit(null)} /> : null}
      {addingRow ? <AddRowSheet onClose={() => setAddingRow(false)} /> : null}
    </div>
  );
}

function BlockChip({ cell, editing = false }: { cell: HorarioCell; editing?: boolean }) {
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

