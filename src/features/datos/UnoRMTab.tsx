import { EmptyState } from "@/ui/EmptyState";
import { useConfigVersion } from "@/hooks/useConfigVersion";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type SetRecord } from "@/db/db";
import { BarChart, Button, Card, DeltaChip, Headline, type BarPoint } from "@/ui";
import { addDays, startOfWeek, fmtDateHuman, todayISO } from "@/lib/date";
import { GYM_DIAS, GYM_DAY_ORDER, allExerciseNames, startDate } from "@/data/gym";
import { loadChange, weeklyBest } from "./series";

/** The working weights you set for each routine exercise (Perfil › Mi rutina),
 * shown as the starting point of each chart so every routine exercise has a
 * current load, even before its first logged set. */
interface StartInfo {
  kg: number;
  note?: string;
  /** ISO date the weight was set (its week anchors the chart). */
  asOf: string;
}

/** Weeks of history read for this tab: enough for 12 logged weeks even if you skip some. */
const HISTORY_WEEKS = 26;
/** Logged weeks drawn per lift. */
const CHART_WEEKS = 12;
/** Lifts shown before "Ver todos". */
const FIRST_LIFTS = 6;

function buildStarts(): Map<string, StartInfo> {
  const starts = new Map<string, StartInfo>();
  GYM_DAY_ORDER.forEach((d) =>
    GYM_DIAS[d].ex.forEach((e) => {
      if (e.startKg != null) starts.set(e.name, { kg: e.startKg, note: e.loadNote, asOf: startDate(e) });
    }),
  );
  return starts;
}

export function UnoRMTab() {
  const configVersion = useConfigVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const STARTS = useMemo(buildStarts, [configVersion]);
  // Only the recent weeks: every figure here (weekly best, 28-day comparison) lives inside them.
  const sets = useLiveQuery(() => db.sets.where("date").aboveOrEqual(addDays(todayISO(), -7 * HISTORY_WEEKS)).toArray(), []);
  const [all, setAll] = useState(false);

  const byExercise = useMemo(() => {
    const map = new Map<string, SetRecord[]>();
    (sets ?? []).forEach((s) => {
      if (s.weight == null) return;
      if (!map.has(s.exercise)) map.set(s.exercise, []);
      map.get(s.exercise)!.push(s);
    });
    return map;
  }, [sets]);

  // Only what's in the current routine: exercises you've dropped (their old
  // sets stay in your history and volume, they just don't clutter this view).
  // Most recently trained first, so what you're working on now is on top.
  const exercises = useMemo(() => {
    const lastDate = (name: string) => (byExercise.get(name) ?? []).reduce((d, s) => (s.date > d ? s.date : d), "");
    return allExerciseNames()
      .filter((name) => STARTS.has(name) || byExercise.has(name))
      .sort((a, b) => lastDate(b).localeCompare(lastDate(a)) || a.localeCompare(b, "es"));
  }, [byExercise, STARTS]);

  // How many exercises reached a heavier best weight in the last 28 days than in the 28 before.
  const rising = useMemo(() => {
    const today = todayISO();
    const from = addDays(today, -28);
    const prevFrom = addDays(today, -56);
    let up = 0;
    let compared = 0;
    byExercise.forEach((list) => {
      let cur = 0;
      let prev = 0;
      list.forEach((st) => {
        if (st.date >= from) cur = Math.max(cur, st.weight ?? 0);
        else if (st.date >= prevFrom) prev = Math.max(prev, st.weight ?? 0);
      });
      if (cur > 0 && prev > 0) {
        compared++;
        if (cur > prev) up++;
      }
    });
    return { up, compared };
  }, [byExercise]);

  if (!exercises.length) {
    return (
      <Card>
        <h2 className="card-title">Carga por semana</h2>
        <EmptyState icon="dumbbell" title="Aún no hay series con peso" hint="Registra tu primera serie en Entreno y aquí verás tu carga semana a semana." />
      </Card>
    );
  }

  const shown = all ? exercises : exercises.slice(0, FIRST_LIFTS);
  const hidden = exercises.length - shown.length;

  return (
    <div className="flex flex-col gap-4">
      {rising.compared > 0 ? (
        <Card className="panel-surface-glow">
          <h2 className="card-title">Carga por semana</h2>
          <div className="mt-3">
            <Headline
              value={rising.up}
              unit={"de " + rising.compared + " ejercicios"}
              caption="subieron su mejor peso en los últimos 28 días, comparado con los 28 anteriores"
            />
          </div>
          <p className="mt-3 text-meta text-[var(--color-muted)]">Debajo, el mejor peso de cada semana en cada ejercicio.</p>
        </Card>
      ) : (
        <div>
          <h2 className="card-title">Carga por semana</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Mejor peso de cada semana en cada ejercicio de tu rutina.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sidebar:grid-cols-2">
        {shown.map((ex) => (
          <LoadProgressCard key={ex} exercise={ex} sets={byExercise.get(ex) ?? []} start={STARTS.get(ex)} />
        ))}
      </div>
      {hidden > 0 || (all && exercises.length > FIRST_LIFTS) ? (
        <Button variant="secondary" className="w-full" aria-expanded={all} aria-pressed={undefined} onClick={() => setAll((v) => !v)}>
          {all ? "Ver menos" : `Ver los ${hidden} ejercicios restantes`}
        </Button>
      ) : null}
    </div>
  );
}

function LoadProgressCard({ exercise, sets, start }: { exercise: string; sets: SetRecord[]; start?: StartInfo }) {
  const weeks = useMemo(() => weeklyBest(sets, start, CHART_WEEKS), [sets, start]);
  const points: BarPoint[] = weeks.map((w, i) => ({ label: fmtDateHuman(w.weekStart), value: w.value, highlight: i === weeks.length - 1 }));
  // With a declared current weight, progress is measured from it (see loadChange).
  const diff = loadChange(weeks, start ? startOfWeek(start.asOf) : undefined);

  return (
    <div className="panel-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{exercise}</h3>
          {start?.note ? <div className="mt-0.5 text-meta text-[var(--color-muted)]">{start.note}</div> : null}
        </div>
        {diff != null ? (
          <div className="flex-none">
            <DeltaChip diff={diff} unit="kg" digits={Number.isInteger(diff * 10) ? 1 : 2} />
          </div>
        ) : null}
      </div>
      <div className="datos-bars mt-3">
        <BarChart points={points} height={90} unit="kg" />
      </div>
    </div>
  );
}
