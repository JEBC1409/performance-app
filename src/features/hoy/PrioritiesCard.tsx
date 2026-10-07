import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { usePriorities } from "@/hooks/usePriorities";
import { useHabitDefs } from "@/hooks/useHabitDefs";
import { addItem, closeDay, MAX_ITEMS, MAX_TEXT, planFor, progress, removeItem, toggleItem } from "@/lib/priorities";
import { todayISO } from "@/lib/date";
import { Button, Card, CardTitle, Sheet } from "@/ui";
import { Icon } from "@/ui/Icon";
import { haptic } from "@/lib/feedback";
import { showToast } from "@/ui/Toast";

/** Three things that matter today, and a 30-second review to close the day. */
export function PrioritiesCard() {
  const { state, update } = usePriorities();
  const today = todayISO();
  const plan = planFor(state, today);
  const { done, total } = progress(plan);
  const [text, setText] = useState("");
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const [carry, setCarry] = useState(true);

  const habitDefs = useHabitDefs();
  const habitDay = useLiveQuery(() => db.habitDays.get(today), [today]);
  const focusMin = useLiveQuery(async () => (await db.focusSessions.where("date").equals(today).toArray()).reduce((a, s) => a + s.minutes, 0), [today]);

  const pending = plan.items.filter((i) => !i.done);
  const full = plan.items.length >= MAX_ITEMS;

  async function add() {
    if (!text.trim()) return;
    await update((s) => addItem(s, today, text));
    setText("");
  }

  async function close() {
    await update((s) => closeDay(s, today, note, carry && pending.length > 0));
    setClosing(false);
    setNote("");
    showToast(carry && pending.length ? "Día cerrado — lo pendiente pasa a mañana" : "Día cerrado");
  }

  const hour = new Date().getHours();
  const eveningNudge = hour >= 18 && !plan.close;

  return (
    <Card className="enter enter-delay-1">
      <CardTitle right={`${done}/${Math.max(total, MAX_ITEMS)}`}>Prioridades de hoy</CardTitle>

      <ul className="mt-3 flex flex-col gap-2">
        {plan.items.map((i) => (
          <li key={i.id} className="flex items-center gap-2.5">
            <button
              onClick={() => {
                haptic();
                void update((s) => toggleItem(s, today, i.id));
              }}
              aria-pressed={i.done}
              aria-label={`${i.done ? "Desmarcar" : "Marcar"}: ${i.text}`}
              className={`hit flex h-7 w-7 flex-none items-center justify-center rounded-full border ${i.done ? "border-transparent bg-[var(--color-good)] text-black" : "border-[var(--color-line-strong)]"}`}
            >
              {i.done ? <Icon name="check" size={14} /> : null}
            </button>
            <span className={`min-w-0 flex-1 text-[14px] leading-snug ${i.done ? "text-[var(--color-muted-2)] line-through" : ""}`}>{i.text}</span>
            <button onClick={() => void update((s) => removeItem(s, today, i.id))} aria-label={`Quitar: ${i.text}`} className="hit flex h-6 w-6 flex-none items-center justify-center rounded-full text-[var(--color-muted-2)] hover:text-[var(--color-red)]">
              <Icon name="close" size={11} />
            </button>
          </li>
        ))}
        {!plan.items.length ? <li className="text-[12.5px] text-[var(--color-muted)]">¿Qué 3 cosas harían de hoy un buen día?</li> : null}
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
            className="min-w-0 flex-1 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-red)]"
          />
          <button onClick={() => void add()} aria-label="Añadir prioridad" className="btn-primary tap-target flex-none rounded-full px-4 text-[12px] font-semibold uppercase tracking-wide text-white">
            Añadir
          </button>
        </div>
      ) : null}

      <div className="mt-3 border-t border-[var(--color-line)] pt-3">
        {plan.close ? (
          <div className="text-[12px] text-[var(--color-muted)]">
            <span className="font-semibold text-[var(--color-good)]">Día cerrado ✓</span>
            {plan.close.note ? <span className="italic"> · “{plan.close.note}”</span> : null}
          </div>
        ) : (
          <button onClick={() => setClosing(true)} className={`w-full rounded-full py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] ${eveningNudge ? "glass-on" : "glass text-[var(--color-muted)]"}`}>
            Cerrar el día
          </button>
        )}
      </div>

      <Sheet open={closing} onClose={() => setClosing(false)} title="Cerrar el día">
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5 text-[13px]">
            <li>
              Prioridades: <span className="num font-semibold">{done}/{total}</span>
            </li>
            <li>
              Hábitos: <span className="num font-semibold">{habitDay?.done.length ?? 0}/{habitDefs?.length ?? 0}</span>
            </li>
            <li>
              Focus: <span className="num font-semibold">{focusMin ?? 0} min</span>
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
              className="mt-1.5 w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
            />
          </label>

          {pending.length ? (
            <button onClick={() => setCarry((c) => !c)} aria-pressed={carry} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-line-strong)] px-3 py-2.5 text-left">
              <span className="text-[12.5px]">
                Pasar a mañana lo pendiente ({pending.length})
                <span className="block text-[11px] text-[var(--color-muted)]">{pending.map((p) => p.text).join(" · ")}</span>
              </span>
              <span aria-hidden className={`relative h-5 w-9 flex-none rounded-full transition-colors ${carry ? "bg-[var(--color-red)]" : "bg-[var(--color-surface-2)]"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${carry ? "left-[18px]" : "left-0.5"}`} />
              </span>
            </button>
          ) : null}

          <Button variant="primary" className="w-full" onClick={() => void close()}>
            Cerrar el día
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}
