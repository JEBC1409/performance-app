import { useEffect, useState } from "react";
import { db } from "@/db/db";
import { GYM_DAY_ORDER, GYM_DIAS, CARDIO_NOTA, targetSetsForDay } from "@/data/gym";
import { Tabs, Eyebrow, Card } from "@/ui";
import { showToast } from "@/ui/Toast";
import { todayISO } from "@/lib/date";
import type { GymDay } from "@/lib/cycle";
import { useTodaySets, useLastSession } from "./useEntrenoData";
import { ExerciseCard, type LogSetPayload } from "./ExerciseCard";
import { RestTimer } from "./RestTimer";
import { useRestTimer } from "./useRestTimer";
import { useLiveQuery } from "dexie-react-hooks";
import { DEFAULT_SETTINGS } from "@/db/db";
import type { ExerciseTarget } from "@/data/gym";

export function Entreno({ autoStartDay, onConsumeAutoStart }: { autoStartDay: GymDay | null; onConsumeAutoStart: () => void }) {
  const [day, setDay] = useState<GymDay>(autoStartDay ?? "A");
  const timer = useRestTimer();
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const restSec = settings?.defaultRestSec ?? DEFAULT_SETTINGS.defaultRestSec;
  const today = todayISO();
  const todaySets = useTodaySets(day);

  useEffect(() => {
    if (autoStartDay) {
      setDay(autoStartDay);
      onConsumeAutoStart();
    }
  }, [autoStartDay, onConsumeAutoStart]);

  const target = targetSetsForDay(day);
  const done = todaySets.length;
  const pct = target > 0 ? Math.min(1, done / target) : 0;

  async function logSet(exerciseName: string, payload: { weight: number | null; reps: number | null; toFailure: boolean; rpe: number | null; note: string }) {
    const existing = todaySets.filter((s) => s.exercise === exerciseName).length;
    await db.sets.add({
      date: today,
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
  }

  return (
    <div className="flex flex-col gap-4 enter">
      <div>
        <Eyebrow>Entreno</Eyebrow>
        <h1 className="font-[var(--font-display)] text-xl mt-1.5">
          Día {day} · {GYM_DIAS[day].nombre}
        </h1>
        <div className="text-[12px] text-[var(--color-muted)] mt-1">{GYM_DIAS[day].grupo}</div>
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
        <div className="h-1.5 bg-[var(--color-surface-2)] overflow-hidden">
          <div className="h-full bg-[var(--color-red)]" style={{ width: `${pct * 100}%`, transition: "width 300ms ease-out" }} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {GYM_DIAS[day].ex.map((ex) => (
          <ExerciseRow key={ex.name} day={day} exercise={ex} onLogSet={(payload) => logSet(ex.name, payload)} allTodaySets={todaySets} />
        ))}
      </div>

      <Card>
        <Eyebrow>Cardio</Eyebrow>
        <p className="text-[12.5px] text-[var(--color-muted)] mt-1.5">{CARDIO_NOTA}</p>
      </Card>

      <RestTimer timer={timer} />
    </div>
  );
}

function ExerciseRow({
  day,
  exercise,
  onLogSet,
  allTodaySets,
}: {
  day: GymDay;
  exercise: ExerciseTarget;
  onLogSet: (payload: LogSetPayload) => void;
  allTodaySets: ReturnType<typeof useTodaySets>;
}) {
  const today = todayISO();
  const lastSession = useLastSession(exercise.name, today);
  const sets = allTodaySets.filter((s) => s.exercise === exercise.name && s.day === day).sort((a, b) => a.setIndex - b.setIndex);
  return <ExerciseCard exercise={exercise} sets={sets} lastSession={lastSession} onLogSet={onLogSet} />;
}
