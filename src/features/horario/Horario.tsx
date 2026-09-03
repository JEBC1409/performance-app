import { HORARIO, HORARIO_NOTE, BLOCK_COLOR, BLOCK_LABEL, BLOCK_TINT, BLOCK_BORDER, BLOCK_TEXT, type BlockType, type HorarioCell } from "@/data/horario";
import { DIAS_CORTO, jsDowToIndex } from "@/lib/date";
import { Card, Eyebrow } from "@/ui";

const LEGEND: BlockType[] = ["clase", "gym", "mouredev", "ingles", "libre"];

export function Horario() {
  const todayCol = jsDowToIndex(new Date().getDay());

  return (
    <div className="flex flex-col gap-4 enter">
      <div>
        <Eyebrow accent>Horario</Eyebrow>
        <h1 className="font-[var(--font-display)] text-2xl mt-1.5">Semana</h1>
        <div className="text-[12.5px] text-[var(--color-muted)] mt-1.5">{HORARIO_NOTE}</div>
      </div>

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
              {HORARIO.map((row) => (
                <tr key={row.time} className="border-t border-[var(--color-line)]">
                  <td className="sticky left-0 bg-[var(--color-surface)] num px-4 py-2.5 text-[11.5px] font-medium text-[var(--color-muted)] whitespace-nowrap">
                    {row.time}
                  </td>
                  {row.cells.map((cell, i) => (
                    <td key={i} className={`px-1.5 py-1.5 align-top ${i === todayCol ? "bg-[rgba(223,37,49,0.05)]" : ""}`}>
                      <BlockChip cell={cell} />
                    </td>
                  ))}
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
    </div>
  );
}

function BlockChip({ cell }: { cell: HorarioCell }) {
  if (cell.type === "otro") {
    return <div className="px-1.5 py-1.5 text-[12px] leading-snug text-[var(--color-muted)]">{cell.text}</div>;
  }
  return (
    <div
      className="rounded-xl px-2.5 py-2 text-[12px] font-semibold leading-snug"
      style={{
        background: BLOCK_TINT[cell.type],
        border: `1px solid ${BLOCK_BORDER[cell.type]}`,
        color: BLOCK_TEXT[cell.type],
      }}
    >
      {cell.text}
    </div>
  );
}
