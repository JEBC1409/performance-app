import { useState } from "react";
import type { usePriorities } from "@/hooks/usePriorities";
import { addItem, closeDay, MAX_ITEMS, MAX_TEXT, planFor, progress, removeItem, toggleItem } from "@/lib/priorities";
import { todayISO } from "@/lib/date";
import { Button, Card, CardTitle, Sheet } from "@/ui";
import { Icon } from "@/ui/Icon";
import { haptic } from "@/lib/feedback";
import { showToast } from "@/ui/Toast";

export type Priorities = ReturnType<typeof usePriorities>;

/** Three things that matter today. Closing the day (a 30-second review) opens from here or
 * from the card on top of Hoy, so the sheet itself lives in `CloseDaySheet`, owned by the screen. */
export function PrioritiesCard({ priorities, onCloseDay }: { priorities: Priorities; onCloseDay: () => void }) {
  const { state, update } = priorities;
  const today = todayISO();
  const plan = planFor(state, today);
  const { done, total } = progress(plan);
  const [text, setText] = useState("");
  const full = plan.items.length >= MAX_ITEMS;

  async function add() {
    if (!text.trim()) return;
    await update((s) => addItem(s, today, text));
    setText("");
  }

  return (
    <Card className="enter enter-delay-1">
      <CardTitle right={`${done}/${Math.max(total, MAX_ITEMS)}`}>Prioridades de hoy</CardTitle>

      <ul className="mt-3 flex flex-col gap-1">
        {plan.items.map((i) => (
          <li key={i.id} className="flex items-center gap-1">
            <button
              onClick={() => {
                haptic();
                void update((s) => toggleItem(s, today, i.id));
              }}
              aria-pressed={i.done}
              aria-label={`${i.done ? "Desmarcar" : "Marcar"}: ${i.text}`}
              className="hit flex h-11 w-11 flex-none items-center justify-center"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                  i.done ? "border-transparent bg-[rgb(var(--accent-solid-rgb))] text-[color:var(--text-on-accent)]" : "border-[var(--color-line-strong)]"
                }`}
              >
                {i.done ? <Icon name="check" size={14} /> : null}
              </span>
            </button>
            <span className={`min-w-0 flex-1 text-sm leading-snug ${i.done ? "text-[var(--color-muted-2)] line-through" : ""}`}>{i.text}</span>
            <button
              onClick={() => void update((s) => removeItem(s, today, i.id))}
              aria-label={`Quitar: ${i.text}`}
              className="hit flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--color-muted-2)] hover:text-[var(--color-accent-text)]"
            >
              <Icon name="close" size={12} />
            </button>
          </li>
        ))}
        {!plan.items.length ? <li className="py-1 text-sm text-[var(--color-muted)]">¿Qué 3 cosas harían de hoy un buen día? Una basta para empezar.</li> : null}
      </ul>

      {!full && !plan.close ? (
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
            maxLength={MAX_TEXT}
            placeholder={plan.items.length ? "Otra prioridad…" : "Mi prioridad más importante…"}
            aria-label="Nueva prioridad"
            className="min-w-0 flex-1 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 text-sm outline-none focus:border-[var(--color-accent-text)]"
          />
          <Button variant="secondary" onClick={() => void add()} aria-label="Añadir prioridad" className="flex-none">
            Añadir
          </Button>
        </div>
      ) : null}

      <div className="mt-3 border-t border-[var(--color-line)] pt-3">
        {plan.close ? (
          <div className="text-meta text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-good)]">
              <Icon name="check" size={13} /> Día cerrado
            </span>
            {plan.close.note ? <span className="italic"> · “{plan.close.note}”</span> : null}
          </div>
        ) : (
          <Button variant="secondary" className="w-full" onClick={onCloseDay}>
            Cerrar el día
          </Button>
        )}
      </div>
    </Card>
  );
}

/** The 30-second review that closes the day: what got done, one line about what went well,
 * and whether the open priorities carry over to tomorrow. */
export function CloseDaySheet({
  open,
  onClose,
  priorities,
  habitsDone,
  habitsTotal,
  focusMin,
}: {
  open: boolean;
  onClose: () => void;
  priorities: Priorities;
  habitsDone: number;
  habitsTotal: number;
  focusMin: number;
}) {
  const today = todayISO();
  const plan = planFor(priorities.state, today);
  const { done, total } = progress(plan);
  const pending = plan.items.filter((i) => !i.done);
  const [note, setNote] = useState("");
  const [carry, setCarry] = useState(true);

  async function close() {
    await priorities.update((s) => closeDay(s, today, note, carry && pending.length > 0));
    onClose();
    setNote("");
    showToast(carry && pending.length ? "Día cerrado — lo pendiente pasa a mañana" : "Día cerrado");
  }

  return (
    <Sheet open={open} onClose={onClose} title="Cerrar el día">
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1.5 text-sm">
          <li>
            Prioridades: <span className="num font-semibold">{done}/{total}</span>
          </li>
          <li>
            Hábitos: <span className="num font-semibold">{habitsDone}/{habitsTotal}</span>
          </li>
          <li>
            Focus: <span className="num font-semibold">{focusMin} min</span>
          </li>
        </ul>

        <label className="block">
          <span className="eyebrow">¿Qué salió bien hoy?</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={400}
            placeholder="Una frase basta"
            className="mt-1.5 w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-text)]"
          />
        </label>

        {pending.length ? (
          <button
            onClick={() => setCarry((c) => !c)}
            role="switch"
            aria-checked={carry}
            className="tap-target flex items-center justify-between gap-3 rounded-xl border border-[var(--color-line-strong)] px-3 py-2.5 text-left"
          >
            <span className="text-sm">
              Pasar a mañana lo pendiente ({pending.length})
              <span className="block text-meta text-[var(--color-muted)]">{pending.map((p) => p.text).join(" · ")}</span>
            </span>
            <span aria-hidden className={`relative h-5 w-9 flex-none rounded-full transition-colors ${carry ? "bg-[rgb(var(--accent-solid-rgb))]" : "bg-[var(--color-surface-2)] ring-1 ring-inset ring-[var(--color-line-strong)]"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${carry ? "left-[18px] bg-[color:var(--text-on-accent)]" : "left-0.5 bg-[var(--color-muted)]"}`} />
            </span>
          </button>
        ) : null}

        <Button variant="primary" className="w-full" onClick={() => void close()}>
          Cerrar el día
        </Button>
      </div>
    </Sheet>
  );
}
