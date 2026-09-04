import { GYM_DIAS } from "@/data/gym";
import { groupForExercise, type MuscleGroup } from "@/data/muscleGroups";

export interface RankTier {
  key: string;
  label: string;
  color: string;
  sides: number; // polygon sides for the badge shape; 0 = starburst (top tier)
}

/** Tier ladder, styled after League of Legends' Iron→Challenger progression:
 * a name, a color, a badge shape — no thresholds here, since how many sets a
 * tier actually takes depends on the muscle group (see groupCapacity below). */
export const RANK_TIERS: RankTier[] = [
  { key: "hierro", label: "Hierro", color: "#9096a1", sides: 3 },
  { key: "bronce", label: "Bronce", color: "#b3773d", sides: 4 },
  { key: "plata", label: "Plata", color: "#c7cdd4", sides: 4 },
  { key: "oro", label: "Oro", color: "#e8b923", sides: 5 },
  { key: "platino", label: "Platino", color: "#df2531", sides: 6 },
  { key: "esmeralda", label: "Esmeralda", color: "#2fae66", sides: 6 },
  { key: "diamante", label: "Diamante", color: "#4fd1e8", sides: 8 },
  { key: "campeon", label: "Campeón", color: "#a970ff", sides: 8 },
  { key: "simetrico", label: "Simétrico", color: "#4d7fff", sides: 0 },
];

/** Fraction of a muscle group's realistic 28-day capacity needed to reach
 * each tier. Backloaded like real ranked distributions (LoL: most players
 * sit Iron–Gold, under 5% ever see Diamond, under 0.5% Master+) — early
 * tiers come cheap, the top tier demands close to full adherence to the
 * routine's own cycle, not a 0-missed-day perfect score. */
const TIER_FRACTIONS = [0, 0.08, 0.18, 0.3, 0.44, 0.58, 0.72, 0.85, 0.95];

const CYCLE_DAYS = 4; // A → B → C → descanso
const WINDOW_DAYS = 28;

let capacityCache: Partial<Record<MuscleGroup, number>> = {};

/** How many sets of a muscle group the routine itself produces in 28 days if
 * every A/B/C session in the cycle actually happens — the realistic ceiling
 * a tier ladder should be scaled against, per group (leg day alone throws
 * far more volume than, say, core, so a single global threshold table either
 * maxes out "pierna" immediately or leaves "core" stuck at Hierro forever). */
export function groupCapacity(group: MuscleGroup): number {
  if (capacityCache[group] != null) return capacityCache[group]!;
  let perCycle = 0;
  for (const day of Object.values(GYM_DIAS)) {
    for (const ex of day.ex) {
      if (groupForExercise(ex.name) === group) perCycle += ex.series;
    }
  }
  const capacity = Math.max(1, Math.round((perCycle * WINDOW_DAYS) / CYCLE_DAYS));
  capacityCache[group] = capacity;
  return capacity;
}

/** The minimum set count for each tier, for a given group's capacity. */
export function tierThresholds(capacity: number): number[] {
  return TIER_FRACTIONS.map((f) => Math.round(f * capacity));
}

export function rankForVolume(setCount: number, capacity: number): RankTier {
  const thresholds = tierThresholds(capacity);
  let tier = RANK_TIERS[0];
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (setCount >= thresholds[i]) tier = RANK_TIERS[i];
  }
  return tier;
}

export function nextRankTier(tier: RankTier): RankTier | null {
  const i = RANK_TIERS.findIndex((t) => t.key === tier.key);
  return i >= 0 && i < RANK_TIERS.length - 1 ? RANK_TIERS[i + 1] : null;
}

export interface RankProgress {
  tier: RankTier;
  next: RankTier | null;
  /** 0–1 fill through the current tier's range, LP-bar style. */
  pct: number;
  setsToNext: number | null;
}

/** Everything a rank card needs in one shot: current tier, next tier, and
 * how far through the current tier's band the set count sits — the "LP bar"
 * equivalent, so a rank feels like it's *progressing* instead of just
 * snapping from one badge to the next. */
export function rankProgress(setCount: number, capacity: number): RankProgress {
  const thresholds = tierThresholds(capacity);
  const idx = RANK_TIERS.findIndex((_t, i) => {
    const lower = thresholds[i];
    const upper = thresholds[i + 1] ?? Infinity;
    return setCount >= lower && setCount < upper;
  });
  const i = idx === -1 ? RANK_TIERS.length - 1 : idx;
  const tier = RANK_TIERS[i];
  const next = nextRankTier(tier);
  const lower = thresholds[i];
  const upper = thresholds[i + 1];
  const pct = next && upper != null && upper > lower ? Math.min(1, (setCount - lower) / (upper - lower)) : 1;
  return { tier, next, pct, setsToNext: next && upper != null ? Math.max(0, upper - setCount) : null };
}
