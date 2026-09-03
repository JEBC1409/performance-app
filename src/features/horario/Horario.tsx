import { HORARIO, HORARIO_NOTE, BLOCK_COLOR, BLOCK_LABEL, type BlockType } from "@/data/horario";
import { DIAS_CORTO, jsDowToIndex } from "@/lib/date";
import { Card, Eyebrow } from "@/ui";

const LEGEND: BlockType[] = ["clase", "gym", "mouredev", "ingles", "libre"];

export function Horario() {
  const todayCol = jsDowToIndex(new Date().getDay());

  return (
    <div className="flex flex-col gap-4 enter">
      <div>
        <Eyebrow>Horario</Eyebrow>
        <h1 className="font-[var(--font-display)] text-xl mt-1.5">Semana</h1>
        <div className="text-[11.5px] text-[var(--color-muted)] mt-1">{HORARIO_NOTE}</div>
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="border-collapse text-[11.5px] min-w-[720px] w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[var(--color-surface)] text-left px-3 py-2 text-[var(--color-muted)] font-semibold w-[92px]">Hora</th>
                {DIAS_CORTO.map((d, i) => (
                  <th
                    key={d}
                    className={`px-2 py-2 text-center font-semibold ${i === todayCol ? "text-[var(--color-red)]" : "text-[var(--color-muted)]"}`}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORARIO.map((row) => (
                <tr key={row.time} className="border-t border-[var(--color-line)]">
                  <td className="sticky left-0 bg-[var(--color-surface)] num px-3 py-2 text-[var(--color-muted)] whitespace-nowrap">{row.time}</td>
                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={`px-2 py-2 align-top ${i === todayCol ? "bg-[var(--color-surface-2)]" : ""}`}
                      style={{ borderLeft: `2px solid ${BLOCK_COLOR[cell.type]}` }}
                    >
                      {cell.text}
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
          <div key={t} className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
            <span className="w-2.5 h-2.5" style={{ background: BLOCK_COLOR[t] }} />
            {BLOCK_LABEL[t]}
          </div>
        ))}
      </div>
    </div>
  );
}
