import { GYM_DIAS } from "@/data/gym";
import { groupForExercise, type MuscleGroup } from "@/data/muscleGroups";

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

/** The minimum set count for each entry in RANK_TIERS, for a given capacity. */
export function tierThresholds(capacity: number): number[] {
  return TIER_START_FRACTIONS.map((f) => Math.round(f * capacity));
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
  /** 0–1 fill through the current division's range, LP-bar style. */
  pct: number;
  setsToNext: number | null;
}

/** Everything a rank card needs in one shot: current tier, next tier, and
 * how far through the current division's band the set count sits — the "LP
 * bar" equivalent, so a rank feels like it's *progressing* instead of just
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
