import { useState } from "react";
import { db, type HabitDefRecord } from "@/db/db";
import { useHabitDefs } from "@/hooks/useHabitDefs";
import { HABIT_ICONS } from "@/data/habits";
import { uniqueHabitKey } from "@/lib/habitSlug";
import { Card, HabitGlyph, Button } from "@/ui";
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
    const row = await db.habitDefs.get(key);
    await db.habitDefs.delete(key);
    // Days already marked keep their record, so putting the habit back restores everything.
    showToast(`"${label}" eliminado`, { action: { label: "Deshacer", onClick: () => void (row && db.habitDefs.put(row)) } });
  }

  return (
    <Card>
      <h2 className="card-title">Hábitos</h2>
      <p className="mt-1.5 text-sm leading-snug text-[var(--color-muted)]">
        Agrega, renombra o quita los hábitos que sigues cada día — pueden cambiar de un mes a otro.
      </p>

      <div className="flex flex-col gap-2 mt-3">
        {list.map((h) => (
          <div key={h.key} className="flex min-h-[var(--control-h)] items-center gap-2.5 rounded-xl border border-[var(--color-line-strong)] py-0.5 pl-3 pr-1">
            <HabitGlyph icon={h.icon} active size={12} className="flex-none" />
            {editingKey === h.key ? (
              <input
                autoFocus
                aria-label="Nombre del hábito"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingKey(null);
                }}
                className="min-h-[var(--control-h)] min-w-0 flex-1 border-b border-[var(--color-accent-text)] bg-transparent text-base outline-none"
              />
            ) : (
              <button type="button" onClick={() => startEdit(h)} className="min-h-[var(--control-h)] min-w-0 flex-1 truncate text-left text-sm hover:text-[var(--color-accent-text)]">
                {h.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeHabit(h.key, h.label)}
              aria-label={`Eliminar ${h.label}`}
              className="glass-flat flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-accent-text)]"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden>
                <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </div>
        ))}
        {!list.length ? <div className="py-2 text-sm text-[var(--color-muted)]">Sin hábitos todavía.</div> : null}
      </div>

      <div className="mt-3 flex flex-col gap-2.5 border-t border-[var(--color-line)] pt-3">
        <div role="group" aria-label="Icono del hábito" className="flex gap-2">
          {HABIT_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setNewIcon(icon)}
              aria-label={icon}
              aria-pressed={newIcon === icon}
              className="glass flex h-11 w-11 items-center justify-center rounded-xl"
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
            aria-label="Nombre del nuevo hábito"
            className="min-h-[var(--control-h)] min-w-0 flex-1 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 text-base"
          />
          <Button variant="primary" onClick={addHabit} disabled={!newLabel.trim()}>
            Agregar
          </Button>
        </div>
      </div>
    </Card>
  );
}
