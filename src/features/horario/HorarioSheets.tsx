import { Icon } from "@/ui/Icon";
import { confirmAction } from "@/lib/confirm";
import { useState } from "react";
import { Button, Field, Input, Select, Sheet } from "@/ui";
import { showToast } from "@/ui/Toast";
import { BLOCK_LABEL, currentHorarioConfig } from "@/data/horario";
import type { BlockCell, BlockType, HorarioConfig } from "@/data/horario";
import { saveHorario } from "@/lib/appConfig";
import { clearBlock, insertRow, removeRow, renameRow, resizeBlock, segAt, setBlock, validTimeLabel } from "@/lib/horarioEdit";
import { DIAS } from "@/lib/date";

const TYPES = Object.keys(BLOCK_LABEL).filter((t) => t !== "otro") as BlockType[];

function Flag({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${on ? "glass-on" : "glass text-[var(--color-muted)]"}`}>
      {children}
    </button>
  );
}

/** Edit (or create) the block at one day/row of the schedule. Every change
 * is saved to the account right away. */
export function BlockSheet({ day, row, onClose }: { day: number; row: number; onClose: () => void }) {
  const cfg = currentHorarioConfig();
  const seg = segAt(cfg, day, row);
  const [text, setText] = useState(seg?.cell.text ?? "");
  const [type, setType] = useState<BlockType>(seg?.cell.type ?? "otro");
  const [key, setKey] = useState(!!seg?.cell.key);
  const [soft, setSoft] = useState(!!seg?.cell.soft);
  const [notify, setNotify] = useState(seg ? !seg.cell.quiet : true);

  async function save() {
    const clean = text.trim();
    if (!clean) {
      showToast("Escribe qué toca en ese bloque");
      return;
    }
    const cell: BlockCell = { text: clean.slice(0, 80), type, ...(key ? { key: true } : {}), ...(soft ? { soft: true } : {}), ...(!notify ? { quiet: true } : {}) };
    await saveHorario(setBlock(currentHorarioConfig(), day, row, cell));
    onClose();
    showToast("Horario actualizado");
  }

  async function apply(next: HorarioConfig | null, fail: string) {
    if (!next) {
      showToast(fail);
      return;
    }
    await saveHorario(next);
    showToast("Horario actualizado");
  }

  const rowsLabel = cfg.times[row];

  return (
    <Sheet open onClose={onClose} title={`${DIAS[day]} · ${rowsLabel}`}>
      <div className="flex flex-col gap-4">
        <Field label="¿Qué toca?">
          <Input value={text} maxLength={80} autoFocus placeholder="Ej. Gym" onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="Categoría">
          <Select value={type} onChange={(e) => setType(e.target.value as BlockType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {BLOCK_LABEL[t]}
              </option>
            ))}
            <option value="otro">Sin categoría</option>
          </Select>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Flag on={key} onClick={() => setKey(!key)}>
            Obligatorio
          </Flag>
          <Flag on={soft} onClick={() => setSoft(!soft)}>
            Opcional (tenue)
          </Flag>
          <Flag on={notify} onClick={() => setNotify(!notify)}>
            Avisarme
          </Flag>
        </div>

        {seg ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => apply(resizeBlock(currentHorarioConfig(), day, row, 1), "La fila de abajo ya está ocupada")} className="glass rounded-full px-3.5 py-2 text-[11px] font-semibold text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-1.5">Alargar una fila <Icon name="arrow-down" size={13} /></span>
            </button>
            <button type="button" onClick={() => apply(resizeBlock(currentHorarioConfig(), day, row, -1), "El bloque ya ocupa una sola fila")} className="glass rounded-full px-3.5 py-2 text-[11px] font-semibold text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-1.5">Acortar una fila <Icon name="arrow-up" size={13} /></span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await saveHorario(clearBlock(currentHorarioConfig(), day, row));
                onClose();
                showToast("Bloque vaciado");
              }}
              className="glass rounded-full px-3.5 py-2 text-[11px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-red)]"
            >
              Vaciar
            </button>
          </div>
        ) : null}

        <Button variant="primary" className="w-full" onClick={save}>
          Guardar
        </Button>
      </div>
    </Sheet>
  );
}

/** Rename or remove a time row. */
export function RowSheet({ row, onClose }: { row: number; onClose: () => void }) {
  const cfg = currentHorarioConfig();
  const [label, setLabel] = useState(cfg.times[row]);

  async function rename() {
    const next = renameRow(currentHorarioConfig(), row, label.trim());
    if (!next) {
      showToast("Usa el formato 5:15 o 5:15-5:40, sin repetir y en orden");
      return;
    }
    await saveHorario(next);
    onClose();
    showToast("Hora actualizada");
  }

  return (
    <Sheet open onClose={onClose} title="Fila del horario">
      <div className="flex flex-col gap-4">
        <Field label="Hora o rango">
          <Input value={label} maxLength={11} autoFocus inputMode="text" onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Button variant="primary" className="w-full" onClick={rename} disabled={!validTimeLabel(label.trim())}>
          Guardar hora
        </Button>
        <button
          type="button"
          onClick={async () => {
            if (!(await confirmAction({ title: "¿Eliminar esta fila?", message: "Los bloques que solo estén en ella desaparecen.", confirmLabel: "Eliminar", danger: true }))) return;
            const next = removeRow(currentHorarioConfig(), row);
            if (!next) {
              showToast("No puedes eliminar la única fila");
              return;
            }
            await saveHorario(next);
            onClose();
            showToast("Fila eliminada");
          }}
          className="glass self-center rounded-full px-4 py-2 text-[11px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-red)]"
        >
          Eliminar fila
        </button>
      </div>
    </Sheet>
  );
}

/** Add a new time row (placed automatically by its time). */
export function AddRowSheet({ onClose }: { onClose: () => void }) {
  const [label, setLabel] = useState("");
  async function add() {
    const res = insertRow(currentHorarioConfig(), label.trim());
    if (!res) {
      showToast("Usa el formato 5:15 o 5:15-5:40, y que no exista ya");
      return;
    }
    await saveHorario(res.cfg);
    onClose();
    showToast("Fila añadida: toca sus celdas para llenarla");
  }
  return (
    <Sheet open onClose={onClose} title="Añadir fila">
      <div className="flex flex-col gap-4">
        <Field label="Hora o rango">
          <Input value={label} maxLength={11} autoFocus placeholder="Ej. 16:00-16:30" onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Button variant="primary" className="w-full" onClick={add} disabled={!validTimeLabel(label.trim())}>
          Añadir
        </Button>
      </div>
    </Sheet>
  );
}
