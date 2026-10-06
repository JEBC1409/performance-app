import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RUTINA_MATUTINA } from "@/data/gym";
import { REST_SEC, buildSteps } from "@/lib/guidedRoutine";
import { playChime } from "@/lib/focusSound";
import { haptic } from "@/lib/feedback";
import { holdScreenAwake } from "@/lib/wakeLock";
import { Button } from "@/ui";
import { Icon } from "@/ui/Icon";

type Phase = "ready" | "work" | "rest" | "done";

/** The morning routine one set per screen: hold-timers count down on their own,
 * rep-based sets wait for "Serie hecha", and a short rest follows each set. */
export function GuidedRoutine({ open, onClose, onFinish }: { open: boolean; onClose: () => void; onFinish: () => void }) {
  const steps = useMemo(() => buildSteps(RUTINA_MATUTINA), []);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [left, setLeft] = useState(0);
  const deadline = useRef(0);

  const step = steps[Math.min(idx, steps.length - 1)];

  // Fresh start every time it opens.
  useEffect(() => {
    if (!open) return;
    setIdx(0);
    setPhase("ready");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const release = holdScreenAwake();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function startTimer(seconds: number) {
    deadline.current = Date.now() + seconds * 1000;
    setLeft(seconds);
  }

  function beginRest() {
    haptic(25);
    if (idx >= steps.length - 1) {
      setPhase("done");
      void playChime("break");
      return;
    }
    setPhase("rest");
    startTimer(REST_SEC);
  }

  function nextSet() {
    setIdx((i) => i + 1);
    setPhase("ready");
  }

  function begin() {
    if (step.holdSec != null) {
      setPhase("work");
      startTimer(step.holdSec);
    } else setPhase("work"); // rep-based: the person says when it's done
  }

  // One ticking loop for both the hold timer and the rest timer.
  useEffect(() => {
    if (!open || (phase !== "rest" && !(phase === "work" && step.holdSec != null))) return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining > 0) return;
      window.clearInterval(id);
      if (phase === "work") {
        void playChime("focus");
        beginRest();
      } else nextSet();
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase, idx]);

  if (!open) return null;

  const total = steps.length;
  const timed = step.holdSec != null;
  const progress = phase === "done" ? 1 : idx / total;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-[var(--color-bg)] px-5" role="dialog" aria-modal aria-label="Rutina matutina guiada" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-glow" />
      </div>

      <header className="relative flex items-center justify-between gap-3">
        <button onClick={onClose} aria-label="Salir de la rutina" className="glass hit flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-muted)]">
          <Icon name="close" size={14} />
        </button>
        <div className="eyebrow eyebrow-accent">Rutina matutina</div>
        <span className="num w-10 text-right text-[11px] text-[var(--color-muted)]">{phase === "done" ? total : idx + 1}/{total}</span>
      </header>
      <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div className="h-full rounded-full bg-[var(--color-red)]" style={{ width: `${progress * 100}%`, transition: "width 300ms ease-out" }} />
      </div>

      {phase === "done" ? (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-good-soft)] text-[var(--color-good)]">
            <Icon name="check" size={36} />
          </div>
          <h2 className="font-[var(--font-display)] text-[26px]">¡Rutina completa!</h2>
          <p className="max-w-[280px] text-[13px] text-[var(--color-muted)]">Así se empieza el día. Queda registrada.</p>
          <Button variant="primary" className="mt-2 w-full max-w-[320px] py-3.5" onClick={onFinish}>
            Listo
          </Button>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-5 text-center">
          {phase === "rest" ? (
            <>
              <div className="eyebrow">Descansa</div>
              <div className="num font-[var(--font-display)] text-[88px] font-light leading-none">{left}</div>
              <p className="text-[13px] text-[var(--color-muted)]">
                Sigue: {steps[idx + 1]?.exercise} · serie {steps[idx + 1]?.setNo} de {steps[idx + 1]?.setsTotal}
              </p>
              <button onClick={nextSet} className="glass tap-target rounded-full px-6 text-[12px] font-semibold uppercase tracking-[0.1em]">
                Saltar descanso
              </button>
            </>
          ) : (
            <>
              <div className="eyebrow">
                Serie {step.setNo} de {step.setsTotal}
              </div>
              <h2 className="font-[var(--font-display)] text-[30px] leading-tight">{step.exercise}</h2>
              <div className="num text-[15px] text-[var(--color-red)]">{step.load}</div>
              <p className="max-w-[300px] text-[13px] leading-relaxed text-[var(--color-muted)]">{step.note}</p>

              {phase === "work" && timed ? (
                <div className="num font-[var(--font-display)] text-[96px] font-light leading-none" role="timer" aria-live="off">
                  {left}
                  <span className="text-[22px] text-[var(--color-muted)]">s</span>
                </div>
              ) : null}

              <div className="mt-2 w-full max-w-[320px]">
                {phase === "ready" ? (
                  <Button variant="primary" className="w-full py-4 text-[14px]" onClick={begin}>
                    {timed ? `Empezar · ${step.holdSec} s` : "Empezar serie"}
                  </Button>
                ) : timed ? (
                  <button onClick={beginRest} className="glass tap-target w-full rounded-full py-3.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Terminar ya
                  </button>
                ) : (
                  <Button variant="primary" className="w-full py-4 text-[14px]" onClick={beginRest}>
                    Serie hecha
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
