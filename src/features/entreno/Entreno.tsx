import { useEffect, useMemo, useState } from "react";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import { GYM_DAY_ORDER, GYM_DIAS, CARDIO_NOTA, targetSetsForDay } from "@/data/gym";
import { Tabs, Eyebrow, Card, Sheet, DateField, Button } from "@/ui";
import { showToast } from "@/ui/Toast";
import { todayISO, fmtDateHuman } from "@/lib/date";
import { buildDailySummary } from "@/lib/dailySummary";
import { slotAfter, type GymDay } from "@/lib/cycle";
import { reviewSession } from "@/lib/sessionReview";
import { SessionReviewSheet } from "./SessionReviewSheet";
import { useSessionSets, useLastSession } from "./useEntrenoData";
import { ExerciseCard } from "./ExerciseCard";
import { ExercisePhotoEditor } from "./ExercisePhoto";
import { resolvePhoto, useExercisePhotos } from "./photos";
import { ExerciseLogForm, type LogSetPayload } from "./ExerciseLogForm";
import { RestTimer } from "./RestTimer";
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
  const [day, setDay] = useState<GymDay>(autoStart?.day ?? "A");
  const [sessionDate, setSessionDate] = useState<string>(autoStart?.date ?? todayISO());
  const [openExercise, setOpenExercise] = useState<ExerciseTarget | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const timer = useRestTimer();
  const photos = useExercisePhotos();
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const restSec = settings?.defaultRestSec ?? DEFAULT_SETTINGS.defaultRestSec;
  const today = todayISO();
  const sessionSets = useSessionSets(day, sessionDate);
  const allSets = useLiveQuery(() => db.sets.toArray(), []);
  const review = useMemo(
    () => (reviewOpen && allSets && sessionSets.length ? reviewSession(day, sessionDate, sessionSets, allSets) : null),
    [reviewOpen, allSets, sessionSets, day, sessionDate],
  );

  useEffect(() => {
    if (autoStart) {
      setDay(autoStart.day);
      setSessionDate(autoStart.date);
      onConsumeAutoStart();
    }
  }, [autoStart, onConsumeAutoStart]);

  const target = targetSetsForDay(day);
  const done = sessionSets.length;
  const pct = target > 0 ? Math.min(1, done / target) : 0;

  async function logSet(exerciseName: string, payload: LogSetPayload) {
    const existing = sessionSets.filter((s) => s.exercise === exerciseName).length;
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
    showToast("Serie guardada");
    timer.start(restSec);
    // Finishing the last series opens the session review, once per session.
    const autoKey = `performance_review_auto_${sessionDate}_${day}`;
    if (sessionSets.length + 1 >= target && !readFlag(autoKey)) {
      setFlag(autoKey);
      setOpenExercise(null);
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
    await db.sets.delete(id);
    showToast("Serie eliminada");
  }

  async function copySummary() {
    const summary = await buildDailySummary(sessionDate);
    try {
      await navigator.clipboard.writeText(summary);
      showToast("Resumen copiado — pegalo en tu chat de progreso");
    } catch {
      showToast("No se pudo copiar");
    }
  }

  return (
    <div className="flex flex-col gap-4 enter">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Entreno</Eyebrow>
          <h1 className="font-[var(--font-display)] text-xl mt-1.5">
            Día {day} · {GYM_DIAS[day].nombre}
          </h1>
          <div className="text-[12px] text-[var(--color-muted)] mt-1">{GYM_DIAS[day].grupo}</div>
        </div>
        <label className="flex-none flex flex-col items-end gap-1">
          <span className="text-[10.5px] text-[var(--color-muted)] uppercase tracking-wide">Fecha</span>
          <DateField value={sessionDate} max={today} onChange={setSessionDate} size="sm" />
        </label>
      </div>

      <Tabs
        items={GYM_DAY_ORDER.map((d) => ({ key: d, label: `Día ${d}` }))}
        value={day}
        onChange={setDay}
      />

      <div>
        <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)] mb-1.5 num">
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
          return <ExerciseCard key={ex.name} exercise={ex} done={doneCount} onOpen={() => setOpenExercise(ex)} photo={resolvePhoto(ex.name, photos.get(ex.name))} />;
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
          className="glass tap-target w-full rounded-full py-2.5 text-[11.5px] font-semibold uppercase tracking-wide"
        >
          Copiar resumen ({fmtDateHuman(sessionDate)})
        </button>
      ) : null}

      <Card>
        <Eyebrow>Cardio</Eyebrow>
        <p className="text-[12.5px] text-[var(--color-muted)] mt-1.5">{CARDIO_NOTA}</p>
      </Card>

      <RestTimer timer={timer} />

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
  day,
  date,
  exercise,
  onLogSet,
  onUpdateSet,
  onDeleteSet,
  allSessionSets,
}: {
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
      <ExerciseLogForm exercise={exercise} sets={sets} lastSession={lastSession} onLogSet={onLogSet} onUpdateSet={onUpdateSet} onDeleteSet={onDeleteSet} />
    </>
  );
}
