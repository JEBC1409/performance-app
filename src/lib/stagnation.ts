/** Spots an exercise that has stopped progressing. Each session is reduced to
 * one number — its best estimated one-rep max (Epley: weight × (1 + reps/30)),
 * or just the best rep count for bodyweight work — and an exercise counts as
 * stalled when none of its last few sessions beat what came before them. */

export interface SetLike {
  date: string;
  weight: number | null;
  reps: number | null;
}

export interface SessionScore {
  date: string;
  score: number;
  /** Heaviest weight used that session (null for bodyweight work). */
  topWeight: number | null;
}

/** Sessions needed with no improvement before we say so. */
export const STALL_WINDOW = 3;
/** Beating the earlier best by less than this isn't progress. */
const MIN_GAIN = 0.005;

export function sessionScores(sets: SetLike[], before?: string): SessionScore[] {
  const byDate = new Map<string, SessionScore>();
  for (const s of sets) {
    if (before && s.date >= before) continue;
    const reps = s.reps ?? 0;
    if (reps <= 0) continue;
    const weight = s.weight != null && s.weight > 0 ? s.weight : null;
    const score = weight != null ? weight * (1 + reps / 30) : reps;
    const cur = byDate.get(s.date);
    if (!cur) byDate.set(s.date, { date: s.date, score, topWeight: weight });
    else {
      cur.score = Math.max(cur.score, score);
      if (weight != null) cur.topWeight = Math.max(cur.topWeight ?? 0, weight);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface Stall {
  /** Sessions in a row with no improvement. */
  sessions: number;
  topWeight: number | null;
}

/** null when there's progress, or too little history to say. */
export function detectStall(scores: SessionScore[], window: number = STALL_WINDOW): Stall | null {
  if (scores.length < window + 1) return null;
  const recent = scores.slice(-window);
  const earlier = scores.slice(0, -window);
  const bestBefore = Math.max(...earlier.map((s) => s.score));
  const bestRecent = Math.max(...recent.map((s) => s.score));
  if (bestRecent > bestBefore * (1 + MIN_GAIN)) return null;
  return { sessions: window, topWeight: recent[recent.length - 1].topWeight };
}

/** What to try: back off a little and rebuild, or change the stimulus. */
export function stallAdvice(stall: Stall): string {
  if (stall.topWeight != null) {
    const lighter = Math.max(0.5, Math.round(stall.topWeight * 0.9 * 2) / 2);
    return `${stall.sessions} sesiones sin mejorar. Prueba ${lighter} kg (−10 %) esta vez, sube desde ahí en las próximas, o cambia el ángulo o el agarre. A veces avanza más con una semana más suave.`;
  }
  return `${stall.sessions} sesiones sin mejorar. Prueba otra variante o añade lastre, y descansa un poco más entre series.`;
}
