import type { SetRecord } from "@/db/db";
import { GYM_DIAS, startDate } from "@/data/gym";
import type { GymDay } from "./cycle";
import { epley1RM } from "./epley";

/** What a finished training session says about progress: per exercise, did
 * you beat last time (more weight, or more reps at the same weight), how the
 * total volume compares with the previous session of the same day, and how
 * long it took. Pure — the screen just renders it. */

export type Verdict = "weight-up" | "reps-up" | "same" | "down" | "start" | "first";

export interface ExerciseReview {
  name: string;
  sets: number;
  /** Heaviest weight used today (null for bodyweight work). */
  topWeight: number | null;
  /** Best reps at that weight. */
  topReps: number;
  volume: number;
  verdict: Verdict;
  /** What today is compared against ("14 sep" or "tu peso de partida"), and its numbers. */
  prev: { weight: number | null; reps: number | null; date: string | null } | null;
  deltaWeight: number | null;
  deltaReps: number | null;
  /** Best estimated 1RM ever for this exercise, beaten today. */
  pr: boolean;
}

export interface SessionReview {
  day: GymDay;
  date: string;
  setsDone: number;
  setsTarget: number;
  toFailure: number;
  durationMin: number | null;
  exercises: ExerciseReview[];
  improved: number;
  volume: number;
  prevVolume: number | null;
  prevDate: string | null;
  volumeDeltaPct: number | null;
}

const EPS = 0.01;

export function setVolume(s: Pick<SetRecord, "weight" | "reps">): number {
  return s.weight != null && s.reps != null ? s.weight * s.reps : 0;
}

/** Top weight of a group of sets and the best reps done at (about) that weight. */
function topOf(sets: Pick<SetRecord, "weight" | "reps">[]): { weight: number | null; reps: number } {
  const withReps = sets.filter((s) => s.reps != null && s.reps > 0);
  const weights = withReps.map((s) => s.weight).filter((w): w is number => w != null && w > 0);
  const weight = weights.length ? Math.max(...weights) : null;
  const atTop = weight == null ? withReps : withReps.filter((s) => (s.weight ?? 0) >= weight * 0.98);
  return { weight, reps: atTop.length ? Math.max(...atTop.map((s) => s.reps as number)) : 0 };
}

function compare(
  today: { weight: number | null; reps: number },
  prev: { weight: number | null; reps: number | null },
): { verdict: Verdict; deltaWeight: number | null; deltaReps: number | null } {
  if (today.weight != null && prev.weight != null) {
    const dw = today.weight - prev.weight;
    if (dw > EPS) return { verdict: "weight-up", deltaWeight: dw, deltaReps: null };
    if (dw < -EPS) return { verdict: "down", deltaWeight: dw, deltaReps: null };
  }
  if (prev.reps != null) {
    const dr = today.reps - prev.reps;
    if (dr > 0) return { verdict: "reps-up", deltaWeight: null, deltaReps: dr };
    if (dr < 0) return { verdict: "down", deltaWeight: null, deltaReps: dr };
    return { verdict: "same", deltaWeight: null, deltaReps: 0 };
  }
  // Same weight as the declared starting weight, and no reps to compare.
  return { verdict: "start", deltaWeight: null, deltaReps: null };
}

export function reviewSession(day: GymDay, date: string, sessionSets: SetRecord[], allSets: SetRecord[]): SessionReview {
  const def = GYM_DIAS[day];
  const exercises: ExerciseReview[] = [];

  for (const ex of def.ex) {
    const today = sessionSets.filter((s) => s.exercise === ex.name && s.date === date);
    if (!today.length) continue;

    const prior = allSets.filter((s) => s.exercise === ex.name && s.date < date);
    const lastDate = prior.reduce<string | null>((m, s) => (m == null || s.date > m ? s.date : m), null);
    const t = topOf(today);
    const hasStart = ex.startKg != null || ex.startReps != null;

    let prev: ExerciseReview["prev"] = null;
    if (hasStart && (lastDate == null || lastDate < startDate(ex))) {
      // Before the declared starting weights, they are the reference.
      prev = { weight: ex.startKg ?? null, reps: ex.startReps ?? null, date: null };
    } else if (lastDate) {
      const p = topOf(prior.filter((s) => s.date === lastDate));
      prev = { weight: p.weight, reps: p.reps, date: lastDate };
    }

    const priorBest = prior.reduce((m, s) => (s.weight != null && s.reps != null ? Math.max(m, epley1RM(s.weight, s.reps)) : m), 0);
    const todayBest = today.reduce((m, s) => (s.weight != null && s.reps != null ? Math.max(m, epley1RM(s.weight, s.reps)) : m), 0);

    const cmp = prev ? compare(t, prev) : { verdict: "first" as Verdict, deltaWeight: null, deltaReps: null };
    exercises.push({
      name: ex.name,
      sets: today.length,
      topWeight: t.weight,
      topReps: t.reps,
      volume: today.reduce((a, s) => a + setVolume(s), 0),
      prev,
      ...cmp,
      pr: priorBest > 0 && todayBest > priorBest * 1.005,
    });
  }

  const volume = exercises.reduce((a, e) => a + e.volume, 0);

  // The previous session of the same day (A/B/C) is the fair comparison for volume.
  const sameDayDates = new Set(allSets.filter((s) => s.day === day && s.date < date).map((s) => s.date));
  const prevDate = sameDayDates.size ? [...sameDayDates].sort().at(-1)! : null;
  const prevVolume = prevDate ? allSets.filter((s) => s.day === day && s.date === prevDate).reduce((a, s) => a + setVolume(s), 0) : null;

  const stamps = sessionSets.map((s) => s.createdAt).filter((n) => Number.isFinite(n));
  const span = stamps.length >= 2 ? (Math.max(...stamps) - Math.min(...stamps)) / 60000 : 0;

  return {
    day,
    date,
    setsDone: sessionSets.length,
    setsTarget: def.ex.reduce((a, e) => a + e.series, 0),
    toFailure: sessionSets.filter((s) => s.toFailure).length,
    // A gap of hours means sets were entered later, not that training took that long.
    durationMin: span >= 1 && span <= 240 ? Math.round(span) : null,
    exercises,
    improved: exercises.filter((e) => e.verdict === "weight-up" || e.verdict === "reps-up").length,
    volume,
    prevVolume: prevVolume && prevVolume > 0 ? prevVolume : null,
    prevDate: prevVolume && prevVolume > 0 ? prevDate : null,
    volumeDeltaPct: prevVolume && prevVolume > 0 ? ((volume - prevVolume) / prevVolume) * 100 : null,
  };
}
