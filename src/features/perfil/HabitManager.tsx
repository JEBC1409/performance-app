import { useState } from "react";
import { db, type HabitDefRecord } from "@/db/db";
import { useHabitDefs } from "@/hooks/useHabitDefs";
import { HABIT_ICONS } from "@/data/habits";
import { uniqueHabitKey } from "@/lib/habitSlug";
import { Card, Eyebrow, HabitGlyph, Button } from "@/ui";
import { showToast } from "@/ui/Toast";

/** Add / rename / remove the habits tracked on Hoy and Hábitos — these used
 * to be a hardcoded list of four, but which habits matter changes month to
 * month, so they're user-editable now. Renaming only ever touches `label`:
 * a habit's `key` (what past HabitDayRecord.done entries reference) is
 * generated once at creation and never changes, so a rename doesn't
 * disconnect a habit from days already marked done under the old name. */
export function HabitManager() {
  const habitDefs = useHabitDefs();
  const list = habitDefs ?? [];
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState<HabitDefRecord["icon"]>("circle");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  async function addHabit() {
    const label = newLabel.trim();
    if (!label) return;
    const existingKeys = new Set(list.map((h) => h.key));
    const key = uniqueHabitKey(label, existingKeys);
    const order = list.length ? Math.max(...list.map((h) => h.order)) + 1 : 0;
    await db.habitDefs.add({ key, label, icon: newIcon, order });
    setNewLabel("");
    showToast("Hábito agregado");
  }

  function startEdit(h: HabitDefRecord) {
    setEditingKey(h.key);
    setEditLabel(h.label);
  }

  async function saveEdit() {
    const key = editingKey;
    setEditingKey(null);
    if (!key) return;
    const label = editLabel.trim();
    if (!label) return;
    await db.habitDefs.update(key, { label });
  }

  async function removeHabit(key: string, label: string) {
    await db.habitDefs.delete(key);
    showToast(`"${label}" eliminado`);
  }

  return (
    <Card>
      <Eyebrow accent>Hábitos</Eyebrow>
      <p className="text-[12px] text-[var(--color-muted)] mt-1.5">
        Agrega, renombra o quita los hábitos que sigues cada día — pueden cambiar de un mes a otro.
      </p>

      <div className="flex flex-col gap-2 mt-3">
        {list.map((h) => (
          <div key={h.key} className="flex items-center gap-2.5 rounded-xl border border-[var(--color-line-strong)] px-3 py-2.5">
            <HabitGlyph icon={h.icon} active size={12} className="flex-none" />
            {editingKey === h.key ? (
              <input
                autoFocus
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingKey(null);
                }}
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none border-b border-[var(--color-red)]"
              />
            ) : (
              <button type="button" onClick={() => startEdit(h)} className="min-w-0 flex-1 truncate text-left text-[13px] hover:text-[var(--color-red)]">
                {h.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeHabit(h.key, h.label)}
              aria-label={`Eliminar ${h.label}`}
              className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-[var(--color-line-strong)] text-[var(--color-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
            >
              <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </div>
        ))}
        {!list.length ? <div className="py-2 text-[12px] text-[var(--color-muted-2)]">Sin hábitos todavía.</div> : null}
      </div>

      <div className="mt-3 flex flex-col gap-2.5 border-t border-[var(--color-line)] pt-3">
        <div className="flex gap-1.5">
          {HABIT_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setNewIcon(icon)}
              aria-label={icon}
              aria-pressed={newIcon === icon}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                newIcon === icon ? "border-[var(--color-red)] bg-[rgba(223,37,49,0.12)]" : "border-[var(--color-line-strong)]"
              }`}
            >
              <HabitGlyph icon={icon} active={newIcon === icon} size={12} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addHabit();
            }}
            placeholder="Nuevo hábito…"
            className="min-w-0 flex-1 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
          />
          <Button variant="primary" onClick={addHabit} disabled={!newLabel.trim()}>
            Agregar
          </Button>
        </div>
      </div>
    </Card>
  );
}
