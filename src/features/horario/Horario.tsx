import { confirmAction } from "@/lib/confirm";
import { HORARIO, HORARIO_NOTE, HORARIO_GOAL, BLOCK_COLOR, BLOCK_LABEL, type BlockType } from "@/data/horario";
import { BlockChip } from "./BlockChip";
import { DayTimeline } from "./DayTimeline";
import { DIAS_CORTO, jsDowToIndex } from "@/lib/date";
import { Button, Card, PageHeader } from "@/ui";
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
  // Phones show one day at a time; the wide week grid is one tap away.
  const [mobileView, setMobileView] = useState<"dia" | "semana">("dia");
  const [dayIdx, setDayIdx] = useState(todayCol);
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
      <PageHeader
        eyebrow="Horario"
        title="Semana"
        subtitle={HORARIO_NOTE}
        right={
          <Button variant={editing ? "primary" : "secondary"} onClick={() => setEditing((e) => !e)} className="px-5">
            {editing ? "Listo" : "Editar"}
          </Button>
        }
      />
      {editing ? <p className="-mt-2 text-sm leading-snug text-[var(--color-muted)]">Toca un bloque para cambiarlo, una celda vacía para llenarla, o una hora para editarla. Se guarda solo.</p> : null}

      <div className="sidebar:hidden">
        <div className="glass-track mb-4 flex gap-1 rounded-full p-1" role="tablist" aria-label="Vista del horario">
          {(["dia", "semana"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={mobileView === v} onClick={() => setMobileView(v)} className={`tap-target flex-1 rounded-full text-sm font-semibold ${mobileView === v ? "glass-on" : "glass-flat text-[var(--color-muted)]"}`}>
              {v === "dia" ? "Día" : "Semana"}
            </button>
          ))}
        </div>
        {mobileView === "dia" ? <DayTimeline day={dayIdx} onDay={setDayIdx} editing={editing} onPick={(d, r) => setBlock({ day: d, row: r })} /> : null}
      </div>

      <div className={mobileView === "semana" ? "" : "hidden sidebar:block"}>
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-meta">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-[104px] bg-[var(--color-surface)] px-4 py-3.5 text-left text-meta font-semibold text-[var(--color-muted)]">
                  Hora
                </th>
                {DIAS_CORTO.map((d, i) => (
                  <th key={d} className="px-3 py-3.5 text-center">
                    <div
                      className={`text-sm font-bold ${
                        i === todayCol ? "text-[var(--color-accent-text)]" : "text-[var(--color-muted)]"
                      }`}
                    >
                      {d}
                    </div>
                    {i === todayCol ? <div className="mx-auto mt-1.5 h-[3px] w-7 rounded-full bg-[rgb(var(--accent-solid-rgb))]" /> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORARIO.map((row, r) => (
                <tr key={row.time} className="border-t border-[var(--color-line)]">
                  <td className="num sticky left-0 whitespace-nowrap bg-[var(--color-surface)] px-4 py-2.5 text-meta font-medium text-[var(--color-muted)]">
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
      </div>

      <div className="flex flex-wrap gap-2">
        {LEGEND.map((t) => (
          <div
            key={t}
            className="flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-3 py-1.5 text-meta font-semibold text-[var(--color-muted)]"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: BLOCK_COLOR[t] }} />
            {BLOCK_LABEL[t]}
          </div>
        ))}
      </div>
      <p className="-mt-1 text-meta leading-snug text-[var(--color-muted)]">{HORARIO_GOAL}</p>

      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setAddingRow(true)} className="glass-accent tap-target rounded-full px-5 text-sm font-semibold">
            + Añadir fila
          </button>
          <button onClick={restore} className="hit ml-auto text-sm text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-accent-text)] hover:underline">
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
