import type { SetRecord } from "@/db/db";
import { groupForExercise, type MuscleGroup } from "@/data/muscleGroups";
import { epley1RM } from "./epley";

export interface RankTier {
  key: string;
  /** e.g. "oro" — shared by all three divisions of a major tier. */
  majorKey: string;
  /** e.g. "Oro II" */
  label: string;
  /** e.g. "Oro" */
  majorLabel: string;
  /** III (entry) → I (about to promote); null for Simétrico, which has none. */
  division: 3 | 2 | 1 | null;
  color: string;
  sides: number; // polygon sides for the badge shape; 0 = starburst (top tier)
}

/** Major tier ladder — same names, order, and colors as symmetry.club's own
 * physique-ranking system (symmetry.club/es/rangos), so "Rubí" isn't a LoL
 * invention: it's their actual 5th tier, sitting where "Platino" used to. */
const MAJOR_TIERS: { key: string; label: string; color: string; sides: number }[] = [
  { key: "hierro", label: "Hierro", color: "#9096a1", sides: 3 },
  { key: "bronce", label: "Bronce", color: "#b3773d", sides: 4 },
  { key: "plata", label: "Plata", color: "#c7cdd4", sides: 4 },
  { key: "oro", label: "Oro", color: "#e8b923", sides: 5 },
  { key: "rubi", label: "Rubí", color: "#df2531", sides: 6 },
  { key: "esmeralda", label: "Esmeralda", color: "#2fae66", sides: 6 },
  { key: "diamante", label: "Diamante", color: "#4fd1e8", sides: 8 },
  { key: "campeon", label: "Campeón", color: "#a970ff", sides: 8 },
];
const SIMETRICO: { key: string; label: string; color: string; sides: number } = {
  key: "simetrico",
  label: "Simétrico",
  color: "#ffffff",
  sides: 0,
};

/** Fraction of a muscle group's realistic 28-day capacity marking the start
 * of each major tier. Backloaded like real ranked distributions (symmetry.club
 * puts Rubí around the top 38%, Diamante around top 9%, Simétrico top 1%) —
 * early tiers come cheap, the top tier demands close to full adherence to the
 * routine's own cycle, not a 0-missed-day perfect score. */
const MAJOR_FRACTIONS = [0, 0.08, 0.18, 0.3, 0.44, 0.58, 0.72, 0.85, 0.95];

/** Every division of every tier, flattened in ascending order — Hierro III
 * first, Simétrico last — each carrying the capacity-fraction where it
 * starts. Divisions split their major tier's band into three equal thirds
 * (III → II → I), the same shape as League points within a division. */
export const RANK_TIERS: RankTier[] = (() => {
  const out: RankTier[] = [];
  const divisions: (3 | 2 | 1)[] = [3, 2, 1];
  const romanFor: Record<3 | 2 | 1, string> = { 3: "III", 2: "II", 1: "I" };
  for (const major of MAJOR_TIERS) {
    for (const division of divisions) {
      out.push({
        key: `${major.key}-${division}`,
        majorKey: major.key,
        label: `${major.label} ${romanFor[division]}`,
        majorLabel: major.label,
        division,
        color: major.color,
        sides: major.sides,
      });
    }
  }
  out.push({ key: SIMETRICO.key, majorKey: SIMETRICO.key, label: SIMETRICO.label, majorLabel: SIMETRICO.label, division: null, color: SIMETRICO.color, sides: SIMETRICO.sides });
  return out;
})();

/** Start-of-tier fraction for each entry in RANK_TIERS, same order/length. */
const TIER_START_FRACTIONS: number[] = (() => {
  const out: number[] = [];
  MAJOR_TIERS.forEach((_major, i) => {
    const start = MAJOR_FRACTIONS[i];
    const end = MAJOR_FRACTIONS[i + 1];
    for (let d = 0; d < 3; d++) out.push(start + (d / 3) * (end - start));
  });
  out.push(MAJOR_FRACTIONS[MAJOR_FRACTIONS.length - 1]);
  return out;
})();

/** Elite-level bodyweight-ratio ceiling per muscle group — the "100%" mark
 * the tier ladder below is scaled against, so a rank reflects actual load
 * lifted relative to bodyweight (how liftoffrank.com's ranked system works:
 * bodyweight + 1RM per exercise, not time spent or sets done), rather than
 * training volume. Pecho/espalda/hombro are adapted from published
 * strength-standard tables for their closest classic barbell lift (bench
 * press, deadlift, and overhead press respectively — Liftoff's own cutoffs
 * aren't published, so these come from public strength-standard research
 * instead). Pierna uses leg-press/hack-squat standards rather than free
 * squat: this routine's heaviest "pierna" exercise is a plate-loaded
 * leg/hack press (see data/muscleGroups.ts), and a machine's mechanical
 * leverage lets the same person move ~40% more there than on a free squat —
 * scoring it against squat standards falsely maxes the rank out. Brazo/core
 * have no comparable published bodyweight-ratio standard for an isolation
 * lift, so those two are a rough scaled-down estimate, not a cited number
 * like the other four. */
const GROUP_ELITE_RATIO: Record<MuscleGroup, number> = {
  pecho: 1.85,
  pierna: 3.5,
  espalda: 2.75,
  hombro: 1.25,
  brazo: 0.7,
  core: 0.7,
};

export function groupEliteRatio(group: MuscleGroup): number {
  return GROUP_ELITE_RATIO[group];
}

/** Best estimated one-rep max ever logged for a muscle group, as a fraction
 * of bodyweight — the "load" a rank is based on now. Looks across every
 * logged set rather than a recent window: a PR doesn't expire just because
 * it hasn't been repeated lately. */
export function groupStrengthRatio(sets: SetRecord[], group: MuscleGroup, bodyweightKg: number): number {
  if (bodyweightKg <= 0) return 0;
  let best = 0;
  for (const s of sets) {
    if (s.weight == null || s.reps == null) continue;
    if (groupForExercise(s.exercise) !== group) continue;
    const oneRm = epley1RM(s.weight, s.reps);
    if (oneRm > best) best = oneRm;
  }
  return best / bodyweightKg;
}

/** The minimum value for each entry in RANK_TIERS, for a given ceiling —
 * not rounded to an integer, since a strength ratio's ceiling is a small
 * float (e.g. 1.85) where rounding would collapse almost every threshold
 * to 0 or 1. */
export function tierThresholds(capacity: number): number[] {
  return TIER_START_FRACTIONS.map((f) => f * capacity);
}

export function nextRankTier(tier: RankTier): RankTier | null {
  const i = RANK_TIERS.findIndex((t) => t.key === tier.key);
  return i >= 0 && i < RANK_TIERS.length - 1 ? RANK_TIERS[i + 1] : null;
}

export interface RankProgress {
  tier: RankTier;
  next: RankTier | null;
  /** 0–1 fill through the current division's range, LP-bar style. */
  pct: number;
  /** Raw gap to the next tier's threshold, in whatever unit `value` was
   * given in (a strength ratio here) — the caller converts it to something
   * displayable (e.g. kg needed). */
  gapToNext: number | null;
}

/** Everything a rank card needs in one shot: current tier, next tier, and
 * how far through the current division's band `value` sits — the "LP bar"
 * equivalent, so a rank feels like it's *progressing* instead of just
 * snapping from one badge to the next. */
export function rankProgress(value: number, capacity: number): RankProgress {
  const thresholds = tierThresholds(capacity);
  const idx = RANK_TIERS.findIndex((_t, i) => {
    const lower = thresholds[i];
    const upper = thresholds[i + 1] ?? Infinity;
    return value >= lower && value < upper;
  });
  const i = idx === -1 ? RANK_TIERS.length - 1 : idx;
  const tier = RANK_TIERS[i];
  const next = nextRankTier(tier);
  const lower = thresholds[i];
  const upper = thresholds[i + 1];
  const pct = next && upper != null && upper > lower ? Math.min(1, (value - lower) / (upper - lower)) : 1;
  return { tier, next, pct, gapToNext: next && upper != null ? Math.max(0, upper - value) : null };
}
