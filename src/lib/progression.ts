/** Suggested load for the next session of an exercise, by double
 * progression: stay at a weight until every working set reaches the top of
 * the rep range, then add weight and start again at the bottom of the range.
 * It's the same rule Heavy Duty is built on (beat the log, a little, every
 * time) turned into a concrete "today: 47.5 kg × 8". */

export interface RepRange {
  min: number;
  max: number;
}

/** "8-10", "10-12 c/lado" and "12" are ranges; "al fallo" means take it to
 * failure with no target (returns "fail"); anything else ("rondas") has no
 * load to progress. */
export function parseRepRange(label: string): RepRange | "fail" | null {
  const l = label.toLowerCase();
  if (l.includes("fallo")) return "fail";
  const m = l.match(/(\d+)\s*(?:-\s*(\d+))?/);
  if (!m) return null;
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : min;
  return min > 0 && max >= min ? { min, max } : null;
}

export interface LoggedSet {
  weight: number | null;
  reps: number | null;
}

export type SuggestionKind = "increase" | "repeat" | "reduce";

export interface Suggestion {
  kind: SuggestionKind;
  /** null for bodyweight work with no load logged. */
  weight: number | null;
  reps: number;
  /** Change vs the last working weight (kg), when the weight moves. */
  delta: number | null;
  reason: string;
}

const roundHalf = (n: number) => Math.round(n * 2) / 2;

/** How much to add when a weight is outgrown: ~5%, but never under 1 kg or
 * over 5 kg, in half-kilo steps — small enough for isolation work, big enough
 * to matter on compounds. */
export function weightIncrement(weight: number): number {
  return roundHalf(Math.min(5, Math.max(1, weight * 0.05)));
}

export function suggestNext(range: RepRange | "fail" | null, last: LoggedSet[]): Suggestion | null {
  if (!range) return null;
  const sets = last.filter((s) => s.reps != null && s.reps > 0);
  if (!sets.length) return null;

  const weights = sets.map((s) => s.weight).filter((w): w is number => w != null && w > 0);
  const top = weights.length ? Math.max(...weights) : null;
  // The working sets are the ones at the heaviest weight; lighter ones are
  // warm-ups or drop-set back-offs and shouldn't drag the verdict down.
  const working = top == null ? sets : sets.filter((s) => (s.weight ?? 0) >= top * 0.98);
  const reps = working.map((s) => s.reps as number);
  const best = Math.max(...reps);

  if (range === "fail") {
    return { kind: "repeat", weight: top, reps: best + 1, delta: null, reason: `Última vez llegaste a ${best}: intenta ${best + 1} al fallo.` };
  }

  if (reps.every((r) => r >= range.max)) {
    if (top == null) {
      return { kind: "increase", weight: null, reps: range.max + 1, delta: null, reason: `Llegaste al tope (${range.max}): intenta ${range.max + 1}, o añade lastre.` };
    }
    const next = roundHalf(top + weightIncrement(top));
    return {
      kind: "increase",
      weight: next,
      reps: range.min,
      delta: next - top,
      reason: `Llegaste a ${range.max} reps en todas: sube a ${next} kg y vuelve a ${range.min}.`,
    };
  }

  if (best < range.min - 1 && top != null) {
    const next = Math.max(0.5, roundHalf(top * 0.9));
    return {
      kind: "reduce",
      weight: next,
      reps: range.min,
      delta: next - top,
      reason: `Solo ${best} reps (rango ${range.min}-${range.max}): baja a ${next} kg para trabajar en rango.`,
    };
  }

  const target = Math.min(range.max, best + 1);
  return {
    kind: "repeat",
    weight: top,
    reps: target,
    delta: null,
    reason: `Mismo peso. Última vez tu mejor serie fue de ${best}: apunta a ${target}.`,
  };
}

/** Where to start when there's no logged history yet, from the weight (and
 * reps) you told the app you're at today. No "increase" here: the first
 * session is about matching it and logging it, and from the second one the
 * real progression rule takes over. */
export function suggestFromStart(range: RepRange | "fail" | null, startKg: number | undefined, startReps: number | undefined): Suggestion | null {
  if (!range) return null;
  if (startKg == null && startReps == null) return null;
  if (range === "fail") {
    const reps = (startReps ?? 0) + 1;
    return { kind: "repeat", weight: startKg ?? null, reps, delta: null, reason: `Vienes haciendo ${startReps}: intenta ${reps} al fallo.` };
  }
  const reps = Math.min(range.max, Math.max(range.min, startReps ?? range.min));
  return {
    kind: "repeat",
    weight: startKg ?? null,
    reps,
    delta: null,
    reason: `Tu peso actual. Apunta a ${reps} reps; si llegas a ${range.max} en todas, la próxima te digo cuánto subir.`,
  };
}
