export interface RankTier {
  key: string;
  label: string;
  color: string;
  sides: number; // polygon sides for the badge shape; 0 = starburst (top tier)
  min: number; // minimum 28-day set count for this tier
}

/** Set-count thresholds per tier over a 28-day window — loosely tuned around a
 * realistic 2x/week body-part split (roughly 8-16 sets/muscle/month = mid tiers). */
export const RANK_TIERS: RankTier[] = [
  { key: "hierro", label: "Hierro", color: "#9096a1", sides: 3, min: 0 },
  { key: "bronce", label: "Bronce", color: "#b3773d", sides: 4, min: 3 },
  { key: "plata", label: "Plata", color: "#c7cdd4", sides: 4, min: 6 },
  { key: "oro", label: "Oro", color: "#e8b923", sides: 5, min: 9 },
  { key: "platino", label: "Platino", color: "#df2531", sides: 6, min: 12 },
  { key: "esmeralda", label: "Esmeralda", color: "#2fae66", sides: 6, min: 15 },
  { key: "diamante", label: "Diamante", color: "#4fd1e8", sides: 8, min: 18 },
  { key: "campeon", label: "Campeón", color: "#a970ff", sides: 8, min: 21 },
  { key: "simetrico", label: "Simétrico", color: "#4d7fff", sides: 0, min: 24 },
];

export function rankForVolume(setCount: number): RankTier {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (setCount >= t.min) tier = t;
  }
  return tier;
}

export function nextRankTier(tier: RankTier): RankTier | null {
  const i = RANK_TIERS.findIndex((t) => t.key === tier.key);
  return i >= 0 && i < RANK_TIERS.length - 1 ? RANK_TIERS[i + 1] : null;
}
