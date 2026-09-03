import type { MuscleGroup } from "@/data/muscleGroups";
import type { RankTier } from "@/lib/muscleRank";

interface RegionDef {
  group: MuscleGroup;
  path: string;
}

// Simplified front-view humanoid (200x400 viewBox). "Espalda" is approximated
// by the trapezius strip visible at the base of the neck, since the back
// proper isn't visible from a front silhouette.
const REGIONS: RegionDef[] = [
  { group: "espalda", path: "M80,52 h40 a4,4 0 0 1 4,4 v6 h-48 v-6 a4,4 0 0 1 4,-4 Z" },
  { group: "hombro", path: "M39,60 a16,16 0 1 1 0.1,0 Z" },
  { group: "hombro", path: "M161,60 a16,16 0 1 1 0.1,0 Z" },
  { group: "pecho", path: "M65,68 h70 a14,14 0 0 1 14,14 v42 a14,14 0 0 1 -14,14 h-70 a14,14 0 0 1 -14,-14 v-42 a14,14 0 0 1 14,-14 Z" },
  { group: "brazo", path: "M20,80 h22 a10,10 0 0 1 10,10 v100 a10,10 0 0 1 -10,10 h-22 a10,10 0 0 1 -10,-10 v-100 a10,10 0 0 1 10,-10 Z" },
  { group: "brazo", path: "M148,80 h22 a10,10 0 0 1 10,10 v100 a10,10 0 0 1 -10,10 h-22 a10,10 0 0 1 -10,-10 v-100 a10,10 0 0 1 10,-10 Z" },
  { group: "core", path: "M70,138 h60 a10,10 0 0 1 10,10 v35 a10,10 0 0 1 -10,10 h-60 a10,10 0 0 1 -10,-10 v-35 a10,10 0 0 1 10,-10 Z" },
  { group: "pierna", path: "M68,193 h28 a12,12 0 0 1 12,12 v106 a12,12 0 0 1 -12,12 h-28 a12,12 0 0 1 -12,-12 v-106 a12,12 0 0 1 12,-12 Z" },
  { group: "pierna", path: "M104,193 h28 a12,12 0 0 1 12,12 v106 a12,12 0 0 1 -12,12 h-28 a12,12 0 0 1 -12,-12 v-106 a12,12 0 0 1 12,-12 Z" },
];

export function MuscleBodyDiagram({
  rankByGroup,
  selected,
  onSelect,
}: {
  rankByGroup: Record<MuscleGroup, RankTier>;
  selected: MuscleGroup | null;
  onSelect: (g: MuscleGroup) => void;
}) {
  return (
    <svg viewBox="0 0 200 330" width="150" height="248" className="flex-none">
      <circle cx="100" cy="30" r="22" fill="var(--color-surface-2)" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      {REGIONS.map((r, i) => {
        const tier = rankByGroup[r.group];
        const isSelected = selected === r.group;
        return (
          <path
            key={i}
            d={r.path}
            fill={tier ? `${tier.color}${isSelected ? "55" : "2e"}` : "var(--color-surface-2)"}
            stroke={tier ? tier.color : "var(--color-line-strong)"}
            strokeWidth={isSelected ? 2.5 : 1.3}
            style={{ cursor: "pointer", transition: "fill 150ms ease, stroke-width 150ms ease" }}
            onClick={() => onSelect(r.group)}
          />
        );
      })}
    </svg>
  );
}
