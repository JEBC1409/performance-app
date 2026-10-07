import { useState } from "react";
import { useReadingPlan } from "@/hooks/useReadingPlan";
import { BIBLE_BOOKS } from "@/data/bible/books";
import { PLANS, chapterKey, newPlan, planChapters, planDef, planIncludes, planProgress, toggleRead } from "@/lib/readingPlan";
import type { PlanChapter, PlanState } from "@/lib/readingPlan";
import { confirmAction } from "@/lib/confirm";
import { todayISO } from "@/lib/date";
import { Button, Sheet } from "@/ui";
import { Icon } from "@/ui/Icon";
import { showToast } from "@/ui/Toast";

const bookName = (abbrev: string) => BIBLE_BOOKS.find((b) => b.abbrev === abbrev)?.name ?? abbrev;
const label = (c: PlanChapter) => `${bookName(c.abbrev)} ${c.chapter}`;

/** Plan card at the top of Leer: today's chapters (catch-up included), tick them off, open them in the reader. */
export function ReadingPlanCard({ onOpen }: { onOpen: (abbrev: string, chapter: number) => void }) {
  const { plan, ready, save, clear } = useReadingPlan();
  const [picking, setPicking] = useState(false);

  if (!ready) return null;

  const progress = plan ? planProgress(plan, todayISO()) : null;
  const def = plan ? planDef(plan.planId) : undefined;

  async function tick(c: PlanChapter) {
    if (!plan) return;
    const wasUnread = !plan.done.includes(c.key);
    const next = toggleRead(plan, c.key);
    await save(next);
    if (wasUnread && planProgress(next, todayISO()).today.length === 0) showToast("¡Lectura de hoy completa!");
  }

  async function stop() {
    if (!(await confirmAction({ title: "¿Dejar este plan?", message: "Se pierde lo que llevas marcado en él.", confirmLabel: "Dejar plan", danger: true }))) return;
    await clear();
    setPicking(false);
  }

  return (
    <>
      {!plan || !progress || !def ? (
        <button onClick={() => setPicking(true)} className="glass-gold flex items-center gap-3 rounded-2xl px-4 py-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold">Plan de lectura</span>
            <span className="block text-[11.5px] text-[var(--color-muted)]">Elige un libro y te digo qué leer cada día.</span>
          </span>
          <span className="flex-none text-[11px] font-semibold uppercase tracking-wide text-[var(--color-red)]">Elegir →</span>
        </button>
      ) : (
        <div className="panel-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="card-title">Plan de lectura</h2>
              <div className="num mt-0.5 truncate text-[12px] text-[var(--color-muted)]">
                {def.name} · día {progress.dayNumber} de {plan.days} · {progress.doneCount}/{progress.total} capítulos
              </div>
            </div>
            <div className="flex flex-none items-center gap-3 text-[11px] text-[var(--color-muted)]">
              <button onClick={() => setPicking(true)} className="underline">
                Cambiar
              </button>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div className="h-full rounded-full bg-[var(--color-gold)]" style={{ width: `${progress.total ? (progress.doneCount / progress.total) * 100 : 0}%`, transition: "width 300ms ease-out" }} />
          </div>

          {progress.finished ? (
            <p className="mt-3 text-[13px]">¡Terminaste el plan! Elige otro para seguir.</p>
          ) : progress.today.length ? (
            <>
              <div className="mt-3 text-[11.5px] text-[var(--color-muted)]">
                Te toca hoy
                {progress.behind > 0 ? ` · incluye ${progress.behind} ${progress.behind === 1 ? "capítulo atrasado" : "capítulos atrasados"}` : ""}
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {progress.today.map((c) => (
                  <li key={c.key} className="glass flex items-center rounded-full pr-3">
                    <button onClick={() => void tick(c)} aria-label={`Marcar ${label(c)} como leído`} className="hit flex h-9 w-9 flex-none items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-good)]">
                      <span className="h-5 w-5 rounded-full border border-[var(--color-line-strong)]" />
                    </button>
                    <button onClick={() => onOpen(c.abbrev, c.chapter)} className="text-[13px] font-medium">
                      {label(c)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--color-good)]">Al día ✓</span>
              {progress.nextUnread ? (
                <button onClick={() => onOpen(progress.nextUnread!.abbrev, progress.nextUnread!.chapter)} className="text-[11.5px] text-[var(--color-muted)] underline">
                  Leer adelante: {label(progress.nextUnread)}
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}

      <Sheet open={picking} onClose={() => setPicking(false)} title="Plan de lectura">
        <PlanPicker
          current={plan}
          onStart={async (p) => {
            await save(p);
            setPicking(false);
            showToast("Plan listo — empieza hoy");
          }}
          onStop={plan ? stop : undefined}
        />
      </Sheet>
    </>
  );
}

function PlanPicker({ current, onStart, onStop }: { current: PlanState | null; onStart: (p: PlanState) => void; onStop?: () => void }) {
  const [planId, setPlanId] = useState(current?.planId ?? PLANS[0].id);
  const def = planDef(planId)!;
  const [days, setDays] = useState(current?.planId === planId ? current.days : def.options[0]);
  const total = planChapters(planId).length;
  const perDay = total / days;

  function choose(id: string) {
    setPlanId(id);
    setDays(id === current?.planId ? current.days : planDef(id)!.options[0]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Plan">
        {PLANS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={p.id === planId}
            onClick={() => choose(p.id)}
            className={`rounded-2xl px-3.5 py-2.5 text-left ${p.id === planId ? "glass-on" : "glass"}`}
          >
            <span className="block text-[13.5px] font-semibold">{p.name}</span>
            <span className={`block text-[11.5px] ${p.id === planId ? "text-white/80" : "text-[var(--color-muted)]"}`}>{p.blurb}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="eyebrow">En cuántos días</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {def.options.map((d) => (
            <button key={d} onClick={() => setDays(d)} aria-pressed={d === days} className={`num rounded-full px-4 py-2 text-[12.5px] font-semibold ${d === days ? "glass-on" : "glass text-[var(--color-muted)]"}`}>
              {d}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--color-muted)]">
          {total} capítulos · unos {perDay >= 1 ? Math.round(perDay * 10) / 10 : `1 cada ${Math.round(1 / perDay)}`} {perDay >= 1 ? "por día" : "días"}
        </p>
      </div>

      <Button variant="primary" className="w-full" onClick={() => onStart(newPlan(planId, days, todayISO())!)}>
        {current ? "Empezar este plan de nuevo" : "Empezar hoy"}
      </Button>
      {onStop ? (
        <button onClick={onStop} className="text-center text-[11.5px] text-[var(--color-muted)] underline">
          Dejar el plan actual
        </button>
      ) : null}
    </div>
  );
}

/** In the reader's header: shows when this chapter belongs to your plan, one tap to mark it read. */
export function MarkReadChip({ abbrev, chapter }: { abbrev: string; chapter: number }) {
  const { plan, save } = useReadingPlan();
  if (!plan || !planIncludes(plan, abbrev, chapter)) return null;
  const key = chapterKey(abbrev, chapter);
  const read = plan.done.includes(key);
  return (
    <button
      onClick={async () => {
        const next = toggleRead(plan, key);
        await save(next);
        if (!read && planProgress(next, todayISO()).today.length === 0) showToast("¡Lectura de hoy completa!");
      }}
      aria-pressed={read}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${read ? "glass-on" : "glass text-[var(--color-muted)]"}`}
    >
      <Icon name="check" size={11} />
      {read ? "Leído" : "Marcar leído"}
    </button>
  );
}
