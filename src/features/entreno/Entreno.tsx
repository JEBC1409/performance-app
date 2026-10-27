import { useEffect, useMemo, useRef, useState } from "react";
import { db, DEFAULT_SETTINGS, type SetRecord } from "@/db/db";
import { addSetWithNextIndex } from "@/db/setsWrite";
import { logError } from "@/lib/errorLog";
import { GYM_DAY_ORDER, GYM_DIAS, CARDIO_NOTA, startDate, targetSetsForDay } from "@/data/gym";
import { Tabs, PageHeader, Card, Sheet, DateField, Button } from "@/ui";
import { Icon } from "@/ui/Icon";
import { showToast } from "@/ui/Toast";
import { addDays, todayISO, fmtDateHuman } from "@/lib/date";
import { buildDailySummary } from "@/lib/dailySummary";
import { slotAfter, type GymDay } from "@/lib/cycle";
import { reviewSession } from "@/lib/sessionReview";
import { detectStall, sessionScores } from "@/lib/stagnation";
import { readyToIncrease } from "@/lib/readyUp";
import { personalRecord } from "@/lib/records";
import { restSecondsFor } from "@/lib/restFor";
import { useUiPrefs } from "@/hooks/useUiPrefs";
import { celebrate, haptic } from "@/lib/feedback";
import type { Suggestion } from "@/lib/progression";
import type { Stall } from "@/lib/stagnation";
import { SessionReviewSheet } from "./SessionReviewSheet";
import { GymMode } from "./GymMode";
import { useConfigVersion } from "@/hooks/useConfigVersion";
import { useSwipe } from "@/hooks/useSwipe";
import { useDefaultGymDay } from "@/hooks/useCycle";
import { useSessionSets, useLastSession } from "./useEntrenoData";
import { ExerciseCard } from "./ExerciseCard";
import { cardLayout, showStallBadges, showStallSummary } from "./layout";
import { resolvePhoto, useExercisePhotos } from "./photos";
import { ExerciseLogForm, type LogSetPayload } from "./ExerciseLogForm";
import { useRestTimer } from "./useRestTimer";
import { guardedSave } from "./saveSet";
import { useLiveQuery } from "dexie-react-hooks";
import type { ExerciseTarget } from "@/data/gym";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setFlag(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* it just may reopen once more */
  }
}

export function Entreno({
  autoStart,
  onConsumeAutoStart,
}: {
  autoStart: { day: GymDay; date: string } | null;
  onConsumeAutoStart: () => void;
}) {
  useConfigVersion(); // routine edits re-render this screen
  // Opens on today's turn in the cycle (or the day already being trained today);
  // once a day is settled on — picked by hand or seeded from the cycle — it sticks
  // for the rest of this visit, even if logging a set nudges the cycle's own count.
  // Recomputing `day` on every render from a live query was exactly that bug: mid-set
  // it could flip under the user, swapping the exercise list while they were typing.
  const defaultDay = useDefaultGymDay();
  const [pickedDay, setDay] = useState<GymDay | null>(autoStart?.day ?? null);
  const seeded = useRef(pickedDay != null);
  useEffect(() => {
    if (!seeded.current && defaultDay != null) {
      seeded.current = true;
      setDay(defaultDay);
    }
  }, [defaultDay]);
  const day = pickedDay ?? defaultDay ?? "A";
  const [sessionDate, setSessionDate] = useState<string>(autoStart?.date ?? todayISO());
  const [openExercise, setOpenExercise] = useState<ExerciseTarget | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [gymOpen, setGymOpen] = useState(false);
  const timer = useRestTimer();
  // True while a set is being written: a second tap in that window is ignored.
  const saving = useRef(false);
  const photos = useExercisePhotos();
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const restSec = settings?.defaultRestSec ?? DEFAULT_SETTINGS.defaultRestSec;
  const restShort = useUiPrefs().restShort;
  const today = todayISO();
  const sessionSets = useSessionSets(day, sessionDate);
  // Everything logged before this session's date — all that stall, progress and
  // review checks look at. A range query, so logging a set today doesn't re-read
  // (or recompute over) the whole history.
  // (`<= the day before` instead of `< sessionDate`: Dexie re-runs a live query for a write at the open end of `below`, which re-read the whole history on every set logged.)
  const allSets = useLiveQuery(() => db.sets.where("date").belowOrEqual(addDays(sessionDate, -1)).toArray(), [sessionDate]);
  // Exercises of this day whose last few sessions (before this one) never beat what came before.
  const stalls = useMemo(() => {
    const out = new Map<string, Stall>();
    if (!allSets) return out;
    const byExercise = new Map<string, typeof allSets>();
    for (const s of allSets) {
      const list = byExercise.get(s.exercise);
      if (list) list.push(s);
      else byExercise.set(s.exercise, [s]);
    }
    for (const ex of GYM_DIAS[day].ex) {
      const stall = detectStall(sessionScores(byExercise.get(ex.name) ?? [], sessionDate));
      if (stall) out.set(ex.name, stall);
    }
    return out;
  }, [allSets, day, sessionDate]);
  // Exercises whose last session already topped the rep range on every working set: time to add weight.
  const readyUps = useMemo(() => {
    const out = new Map<string, Suggestion>();
    if (!allSets) return out;
    const byExercise = new Map<string, typeof allSets>();
    for (const s of allSets) {
      const list = byExercise.get(s.exercise);
      if (list) list.push(s);
      else byExercise.set(s.exercise, [s]);
    }
    for (const ex of GYM_DIAS[day].ex) {
      const r = readyToIncrease(ex.repsLabel, byExercise.get(ex.name) ?? [], sessionDate, ex.startKg != null || ex.startReps != null ? startDate(ex) : undefined);
      if (r) out.set(ex.name, r);
    }
    return out;
  }, [allSets, day, sessionDate]);
  const review = useMemo(
    () => (reviewOpen && allSets && sessionSets.length ? reviewSession(day, sessionDate, sessionSets, allSets) : null),
    [reviewOpen, allSets, sessionSets, day, sessionDate],
  );

  // A "start this session" request from elsewhere (the home screen) points this screen at that day and
  // date. Applied while rendering, from the request itself, instead of in an effect that sets state;
  // the effect only tells the parent the request was taken.
  const [handledStart, setHandledStart] = useState<typeof autoStart>(null);
  if (autoStart && autoStart !== handledStart) {
    setHandledStart(autoStart);
    setDay(autoStart.day);
    setSessionDate(autoStart.date);
  }
  useEffect(() => {
    if (autoStart) {
      seeded.current = true;
      onConsumeAutoStart();
    }
  }, [autoStart, onConsumeAutoStart]);

  const dayIdx = GYM_DAY_ORDER.indexOf(day);
  const swipe = useSwipe({
    onLeft: () => dayIdx < GYM_DAY_ORDER.length - 1 && setDay(GYM_DAY_ORDER[dayIdx + 1]),
    onRight: () => dayIdx > 0 && setDay(GYM_DAY_ORDER[dayIdx - 1]),
  });
  const target = targetSetsForDay(day);
  const done = sessionSets.length;
  const pct = target > 0 ? Math.min(1, done / target) : 0;
  const doneByExercise = useMemo(() => {
    const out = new Map<string, number>();
    for (const s of sessionSets) out.set(s.exercise, (out.get(s.exercise) ?? 0) + 1);
    return out;
  }, [sessionSets]);
  // Stalled exercises still to do today. Many badges at once is noise, so past a few they fold into one line.
  const stalledOpenList = GYM_DIAS[day].ex.filter((ex) => stalls.has(ex.name) && (doneByExercise.get(ex.name) ?? 0) < ex.series);
  const stallSessions = Math.max(0, ...stalledOpenList.map((ex) => stalls.get(ex.name)?.sessions ?? 0));
  const [stallsOpen, setStallsOpen] = useState(false);

  /** Resolves `true` once the set is really stored, `false` if it was not (busy or failed), so the form that asked can say so. */
  async function logSet(exerciseName: string, payload: LogSetPayload): Promise<boolean> {
    const record = personalRecord([...(allSets ?? []), ...sessionSets].filter((s) => s.exercise === exerciseName), { weight: payload.weight, reps: payload.reps });
    // setIndex is worked out inside the write's transaction from what is really stored.
    const saved = await guardedSave(saving, () =>
      addSetWithNextIndex({
        date: sessionDate,
        day,
        exercise: exerciseName,
        weight: payload.weight,
        reps: payload.reps,
        toFailure: payload.toFailure || null,
        rpe: payload.rpe,
        note: payload.note,
        createdAt: Date.now(),
      }),
    );
    if (saved.status === "busy") return false;
    if (saved.status === "error") {
      logError(saved.error, "logSet");
      showToast("No se pudo guardar la serie. Inténtalo de nuevo.");
      return false;
    }
    if (record) {
      const what = record.kind === "1rm" ? `${payload.weight} kg × ${payload.reps} (1RM est. ${record.estimate} kg)` : `${payload.reps} reps`;
      showToast(`Nuevo récord en ${exerciseName}: ${what}`);
      celebrate();
      haptic([30, 40, 30]);
    } else showToast("Serie guardada");
    timer.start(restSecondsFor(exerciseName, restSec, restShort));
    // Finishing the last series opens the session review, once per session.
    const autoKey = `performance_review_auto_${sessionDate}_${day}`;
    if (sessionSets.length + 1 >= target && !readFlag(autoKey)) {
      setFlag(autoKey);
      setOpenExercise(null);
      setGymOpen(false);
      setReviewOpen(true);
    }
    return true;
  }

  async function updateSet(id: number, payload: LogSetPayload) {
    await db.sets.update(id, {
      weight: payload.weight,
      reps: payload.reps,
      toFailure: payload.toFailure || null,
      rpe: payload.rpe,
      note: payload.note,
    });
    showToast("Serie actualizada");
  }

  async function deleteSet(id: number) {
    const row = await db.sets.get(id);
    await db.sets.delete(id);
    showToast("Serie eliminada", {
      action: {
        label: "Deshacer",
        onClick: () => {
          if (!row) return;
          const { id: _dropped, ...rest } = row;
          void db.sets.add(rest);
        },
      },
    });
  }

  async function copySummary() {
    const summary = await buildDailySummary(sessionDate);
    try {
      await navigator.clipboard.writeText(summary);
      showToast("Resumen copiado — pégalo en tu chat de progreso");
    } catch {
      showToast("No se pudo copiar");
    }
  }

  return (
    <div className="flex flex-col gap-4 enter" {...swipe}>
      <PageHeader
        eyebrow="Entreno"
        title={`Día ${day} · ${GYM_DIAS[day].nombre}`}
        subtitle={GYM_DIAS[day].grupo}
        right={
          <label className="flex flex-col items-end gap-1">
            <span className="text-[length:var(--fs-meta)] text-[var(--color-muted)]">Fecha</span>
            <DateField value={sessionDate} max={today} onChange={setSessionDate} size="sm" />
          </label>
        }
      />

      <Tabs
        items={GYM_DAY_ORDER.map((d) => ({ key: d, label: `Día ${d}` }))}
        value={day}
        onChange={setDay}
      />

      <Button variant="primary" className="h-14 w-full text-[length:var(--fs-body)]" onClick={() => setGymOpen(true)}>
        <Icon name="expand" size={18} /> Modo gimnasio
      </Button>

      <div>
        <div className="num mb-1.5 flex items-center justify-between text-[length:var(--fs-sm)] text-[var(--color-muted)]">
          <span>Progreso de la sesión</span>
          <span>
            {done} / {target} series
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
          role="progressbar"
          aria-label="Series de la sesión"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={Math.min(done, target)}
        >
          <div className="h-full rounded-full bg-[rgb(var(--accent-solid-rgb))]" style={{ width: `${pct * 100}%`, transition: "width 300ms ease-out" }} />
        </div>
      </div>

      {showStallSummary(stalledOpenList.length) ? (
        <div className="panel-surface">
          <button
            onClick={() => setStallsOpen((o) => !o)}
            aria-expanded={stallsOpen}
            className="flex min-h-[var(--control-h)] w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-[length:var(--fs-sm)]"
          >
            <span>
              <strong className="font-semibold text-[var(--color-warn)]">{stalledOpenList.length} ejercicios</strong> sin progreso en las últimas {stallSessions} sesiones
            </span>
            <span className={`flex-none text-[var(--color-muted)] transition-transform ${stallsOpen ? "rotate-90" : ""}`} aria-hidden>
              <Icon name="chevron-right" size={16} />
            </span>
          </button>
          {stallsOpen ? (
            <ul className="flex flex-col border-t border-[var(--color-line)]">
              {stalledOpenList.map((ex) => (
                <li key={ex.name}>
                  <button onClick={() => setOpenExercise(ex)} className="flex min-h-[var(--control-h)] w-full items-center justify-between gap-3 px-3.5 text-left text-[length:var(--fs-sm)] hover:bg-[rgb(var(--fg-rgb)/0.05)]">
                    <span className="min-w-0 truncate">{ex.name}</span>
                    <span className="flex-none text-[var(--color-muted)]">Ver consejo</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-6 gap-3">
        {GYM_DIAS[day].ex.map((ex, i, all) => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            done={doneByExercise.get(ex.name) ?? 0}
            stalled={showStallBadges(stalledOpenList.length) && stalls.has(ex.name)}
            ready={readyUps.get(ex.name)}
            onOpen={() => setOpenExercise(ex)}
            photo={resolvePhoto(ex.name, photos.get(ex.name))}
            layout={cardLayout(i, all.length)}
          />
        ))}
      </div>

      {done > 0 ? (
        <div className="flex flex-col gap-2">
          <Button variant={done >= target ? "primary" : "secondary"} className="w-full" onClick={() => setReviewOpen(true)}>
            Cierre de sesión
          </Button>
          <Button variant="ghost" className="w-full" onClick={copySummary}>
            Copiar resumen ({fmtDateHuman(sessionDate)})
          </Button>
        </div>
      ) : null}

      <Card>
        <h2 className="card-title">Cardio</h2>
        <p className="mt-1.5 text-[length:var(--fs-sm)] text-[var(--color-muted)]">{CARDIO_NOTA}</p>
      </Card>

      {gymOpen ? (
        <GymMode day={day} date={sessionDate} exercises={GYM_DIAS[day].ex} sessionSets={sessionSets} priorSets={allSets} timer={timer} onLogSet={logSet} onClose={() => setGymOpen(false)} />
      ) : null}

      <SessionReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        review={review}
        next={{ slot: slotAfter(day), then: slotAfter(slotAfter(day)) }}
        onGoDay={setDay}
      />

      <Sheet open={!!openExercise} onClose={() => setOpenExercise(null)} title={openExercise?.name ?? "Registrar serie"}>
        {openExercise ? (
          <ExerciseDetail
            day={day}
            date={sessionDate}
            exercise={openExercise}
            stall={stalls.get(openExercise.name) ?? null}
            onLogSet={(payload) => logSet(openExercise.name, payload)}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            allSessionSets={sessionSets}
            priorSets={allSets}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function ExerciseDetail({
  stall,
  day,
  date,
  exercise,
  onLogSet,
  onUpdateSet,
  onDeleteSet,
  allSessionSets,
  priorSets,
}: {
  stall: Stall | null;
  day: GymDay;
  date: string;
  exercise: ExerciseTarget;
  onLogSet: (payload: LogSetPayload) => Promise<boolean>;
  onUpdateSet: (id: number, payload: LogSetPayload) => Promise<void>;
  onDeleteSet: (id: number) => void;
  allSessionSets: ReturnType<typeof useSessionSets>;
  /** Everything logged before `date`, already loaded by the screen. */
  priorSets: SetRecord[] | undefined;
}) {
  const lastSession = useLastSession(exercise.name, date, { priorSets });
  const sets = allSessionSets.filter((s) => s.exercise === exercise.name && s.day === day).sort((a, b) => a.setIndex - b.setIndex);
  return (
    <ExerciseLogForm exercise={exercise} stall={stall} sets={sets} lastSession={lastSession} onLogSet={onLogSet} onUpdateSet={onUpdateSet} onDeleteSet={onDeleteSet} />
  );
}
