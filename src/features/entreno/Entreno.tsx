import { useEffect, useMemo, useRef, useState } from "react";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import { GYM_DAY_ORDER, GYM_DIAS, CARDIO_NOTA, startDate, targetSetsForDay } from "@/data/gym";
import { Tabs, PageHeader, Card, Sheet, DateField, Button } from "@/ui";
import { showToast } from "@/ui/Toast";
import { todayISO, fmtDateHuman } from "@/lib/date";
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
import { ExercisePhotoEditor } from "./ExercisePhoto";
import { resolvePhoto, useExercisePhotos } from "./photos";
import { ExerciseLogForm, type LogSetPayload } from "./ExerciseLogForm";
import { useRestTimer } from "./useRestTimer";
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
  const photos = useExercisePhotos();
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const restSec = settings?.defaultRestSec ?? DEFAULT_SETTINGS.defaultRestSec;
  const restShort = useUiPrefs().restShort;
  const today = todayISO();
  const sessionSets = useSessionSets(day, sessionDate);
  // Everything logged before this session's date — all that stall, progress and
  // review checks look at. A range query, so logging a set today doesn't re-read
  // (or recompute over) the whole history.
  const allSets = useLiveQuery(() => db.sets.where("date").below(sessionDate).toArray(), [sessionDate]);
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

  useEffect(() => {
    if (autoStart) {
      seeded.current = true;
      setDay(autoStart.day);
      setSessionDate(autoStart.date);
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

  async function logSet(exerciseName: string, payload: LogSetPayload) {
    const existing = sessionSets.filter((s) => s.exercise === exerciseName).length;
    const record = personalRecord([...(allSets ?? []), ...sessionSets].filter((s) => s.exercise === exerciseName), { weight: payload.weight, reps: payload.reps });
    await db.sets.add({
      date: sessionDate,
      day,
      exercise: exerciseName,
      setIndex: existing + 1,
      weight: payload.weight,
      reps: payload.reps,
      toFailure: payload.toFailure || null,
      rpe: payload.rpe,
      note: payload.note,
      createdAt: Date.now(),
    });
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
            <span className="text-[12px] text-[var(--color-muted)] uppercase tracking-wide">Fecha</span>
            <DateField value={sessionDate} max={today} onChange={setSessionDate} size="sm" />
          </label>
        }
      />

      <Tabs
        items={GYM_DAY_ORDER.map((d) => ({ key: d, label: `Día ${d}` }))}
        value={day}
        onChange={setDay}
      />

      <Button variant="primary" className="w-full py-3.5 text-[13px]" onClick={() => setGymOpen(true)}>
        Modo gimnasio
      </Button>

      <div>
        <div className="flex items-center justify-between text-[12px] text-[var(--color-muted)] mb-1.5 num">
          <span>Progreso de la sesión</span>
          <span>
            {done} / {target} series
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--color-red)]" style={{ width: `${pct * 100}%`, transition: "width 300ms ease-out" }} />
        </div>
      </div>

      <div className="grid grid-cols-2 sidebar:grid-cols-3 gap-3">
        {GYM_DIAS[day].ex.map((ex) => {
          const doneCount = sessionSets.filter((s) => s.exercise === ex.name).length;
          return <ExerciseCard key={ex.name} exercise={ex} done={doneCount} stalled={stalls.has(ex.name)} ready={readyUps.get(ex.name)} onOpen={() => setOpenExercise(ex)} photo={resolvePhoto(ex.name, photos.get(ex.name))} />;
        })}
      </div>

      {done > 0 ? (
        <Button variant="primary" className="w-full py-3" onClick={() => setReviewOpen(true)}>
          Cierre de sesión
        </Button>
      ) : null}

      {done > 0 ? (
        <button
          onClick={copySummary}
          className="glass tap-target w-full rounded-full py-2.5 text-[12px] font-semibold uppercase tracking-wide"
        >
          Copiar resumen ({fmtDateHuman(sessionDate)})
        </button>
      ) : null}

      <Card>
        <h2 className="card-title">Cardio</h2>
        <p className="text-[12.5px] text-[var(--color-muted)] mt-1.5">{CARDIO_NOTA}</p>
      </Card>

      {gymOpen ? (
        <GymMode day={day} date={sessionDate} exercises={GYM_DIAS[day].ex} sessionSets={sessionSets} timer={timer} onLogSet={logSet} onClose={() => setGymOpen(false)} />
      ) : null}

      <SessionReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        review={review}
        next={{ slot: slotAfter(day), then: slotAfter(slotAfter(day)) }}
        onGoDay={setDay}
      />

      <Sheet open={!!openExercise} onClose={() => setOpenExercise(null)} title="Registrar serie">
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
}: {
  stall: Stall | null;
  day: GymDay;
  date: string;
  exercise: ExerciseTarget;
  onLogSet: (payload: LogSetPayload) => void;
  onUpdateSet: (id: number, payload: LogSetPayload) => void;
  onDeleteSet: (id: number) => void;
  allSessionSets: ReturnType<typeof useSessionSets>;
}) {
  const lastSession = useLastSession(exercise.name, date);
  const sets = allSessionSets.filter((s) => s.exercise === exercise.name && s.day === day).sort((a, b) => a.setIndex - b.setIndex);
  return (
    <>
      <ExercisePhotoEditor name={exercise.name} />
      <ExerciseLogForm exercise={exercise} stall={stall} sets={sets} lastSession={lastSession} onLogSet={onLogSet} onUpdateSet={onUpdateSet} onDeleteSet={onDeleteSet} />
    </>
  );
}
