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

function PlanGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M9 3v4M15 3v4M8.5 15l2.2 2.2 4.3-4.4" />
    </svg>
  );
}

/** The reading plan as one icon button in the reader's toolbar: a badge says how many
 * chapters are still due today, and the plan itself (today's chapters, progress,
 * change plan) opens in a sheet instead of taking up the top of the screen. */
export function ReadingPlanButton({ onOpen }: { onOpen: (abbrev: string, chapter: number) => void }) {
  const { plan, ready, save, clear } = useReadingPlan();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  const progress = plan ? planProgress(plan, todayISO()) : null;
  const def = plan ? planDef(plan.planId) : undefined;
  const pending = progress && !progress.finished ? progress.today.length : 0;

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

  function close() {
    setOpen(false);
    setPicking(false);
  }

  if (!ready) return null;

  const showPicker = picking || !plan || !progress || !def;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={pending ? `Plan de lectura, te toca hoy: ${pending} ${pending === 1 ? "capítulo" : "capítulos"}` : "Plan de lectura"}
        className="glass relative flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--color-ink)]"
      >
        <PlanGlyph />
        {pending ? (
          <span aria-hidden className="num absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-gold)] px-1 text-meta font-bold leading-none text-[#0b0b0d]">
            {pending}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onClose={close} title="Plan de lectura">
        {showPicker ? (
          <div className="flex flex-col gap-4">
            {!plan ? <p className="text-sm text-[var(--color-muted)]">Elige un libro y te digo qué leer cada día.</p> : null}
            <PlanPicker
              current={plan}
              onStart={async (p) => {
                await save(p);
                close();
                showToast("Plan listo — empieza hoy");
              }}
              onStop={plan ? stop : undefined}
            />
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="num min-w-0 text-sm text-[var(--color-muted)]">
                {def.name} · día {progress.dayNumber} de {plan.days} · {progress.doneCount}/{progress.total} capítulos
              </div>
              <button onClick={() => setPicking(true)} className="tap-target -mr-2 flex-none rounded-full px-3 text-sm text-[var(--color-muted)] underline">
                Cambiar
              </button>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div className="h-full rounded-full bg-[var(--color-gold)]" style={{ width: `${progress.total ? (progress.doneCount / progress.total) * 100 : 0}%`, transition: "width 300ms ease-out" }} />
            </div>

            {progress.finished ? (
              <p className="mt-4 text-base">¡Terminaste el plan! Elige otro para seguir.</p>
            ) : progress.today.length ? (
              <>
                <div className="mt-4 text-sm text-[var(--color-muted)]">
                  Te toca hoy
                  {progress.behind > 0 ? ` · incluye ${progress.behind} ${progress.behind === 1 ? "capítulo atrasado" : "capítulos atrasados"}` : ""}
                </div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {progress.today.map((c) => (
                    <li key={c.key} className="glass flex min-h-[var(--control-h)] items-center rounded-full pr-4">
                      <button onClick={() => void tick(c)} aria-label={`Marcar ${label(c)} como leído`} className="hit flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-good)]">
                        <span className="h-5 w-5 rounded-full border border-[var(--color-line-strong)]" />
                      </button>
                      <button
                        onClick={() => {
                          close();
                          onOpen(c.abbrev, c.chapter);
                        }}
                        className="min-h-[var(--control-h)] text-sm font-medium"
                      >
                        {label(c)}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--color-good)]">Al día ✓</span>
                {progress.nextUnread ? (
                  <button
                    onClick={() => {
                      close();
                      onOpen(progress.nextUnread!.abbrev, progress.nextUnread!.chapter);
                    }}
                    className="tap-target rounded-full px-3 text-sm text-[var(--color-muted)] underline"
                  >
                    Leer adelante: {label(progress.nextUnread)}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}
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
            className={`min-h-[var(--control-h)] rounded-2xl px-3.5 py-2.5 text-left ${p.id === planId ? "glass-sel" : "glass"}`}
          >
            <span className="block text-sm font-semibold">{p.name}</span>
            <span className="block text-meta text-[var(--color-muted)]">{p.blurb}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="eyebrow">En cuántos días</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {def.options.map((d) => (
            <button key={d} onClick={() => setDays(d)} aria-pressed={d === days} className={`glass num tap-target rounded-full px-5 text-sm font-semibold ${d === days ? "" : "text-[var(--color-muted)]"}`}>
              {d}
            </button>
          ))}
        </div>
        <p className="mt-2 text-meta text-[var(--color-muted)]">
          {total} capítulos · unos {perDay >= 1 ? Math.round(perDay * 10) / 10 : `1 cada ${Math.round(1 / perDay)}`} {perDay >= 1 ? "por día" : "días"}
        </p>
      </div>

      <Button variant="primary" className="w-full" onClick={() => onStart(newPlan(planId, days, todayISO())!)}>
        {current ? "Empezar este plan de nuevo" : "Empezar hoy"}
      </Button>
      {onStop ? (
        <button onClick={onStop} className="tap-target rounded-full text-center text-sm text-[var(--color-muted)] underline">
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
      className={`glass tap-target flex items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${read ? "" : "text-[var(--color-muted)]"}`}
    >
      <Icon name="check" size={14} />
      {read ? "Leído" : "Marcar leído"}
    </button>
  );
}
