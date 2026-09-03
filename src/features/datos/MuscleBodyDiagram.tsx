import type { MuscleGroup } from "@/data/muscleGroups";
import type { RankTier } from "@/lib/muscleRank";

interface RegionDef {
  group: MuscleGroup;
  path: string;
}

// Anatomical front-view figure (200x350 viewBox) — organic muscle shapes
// (traps, delts, pecs, biceps, abs, quads) instead of plain boxes, matching
// the reference muscle-map style. "Espalda" is approximated by the trapezius
// yoke visible at the base of the neck, since the back proper isn't visible
// from a front silhouette.
const REGIONS: RegionDef[] = [
  { group: "espalda", path: "M76,52 L124,52 L134,66 Q100,77 66,66 Z" },
  {
    group: "hombro",
    path: "M40,62 C27,62 19,73 19,86 C19,99 29,108 42,105 C51,103 55,90 53,77 C51,67 47,62 40,62 Z",
  },
  {
    group: "hombro",
    path: "M160,62 C173,62 181,73 181,86 C181,99 171,108 158,105 C149,103 145,90 147,77 C149,67 153,62 160,62 Z",
  },
  {
    group: "pecho",
    path: "M62,68 C49,71 43,85 46,103 C49,122 64,133 100,133 C136,133 151,122 154,103 C157,85 151,71 138,68 C123,64 110,68 100,77 C90,68 77,64 62,68 Z",
  },
  {
    group: "brazo",
    path: "M17,87 C9,94 7,106 12,124 C7,147 9,175 17,199 C21,209 36,209 40,199 C44,175 42,147 38,124 C42,106 38,94 30,87 C26,85 21,85 17,87 Z",
  },
  {
    group: "brazo",
    path: "M183,87 C191,94 193,106 188,124 C193,147 191,175 183,199 C179,209 164,209 160,199 C156,175 158,147 162,124 C158,106 162,94 170,87 C174,85 179,85 183,87 Z",
  },
  {
    group: "core",
    path: "M74,137 C67,137 63,142 63,149 L63,183 C63,191 70,196 78,196 L122,196 C130,196 137,191 137,183 L137,149 C137,142 133,137 126,137 Z",
  },
  {
    group: "pierna",
    path: "M65,200 C55,206 51,222 55,251 C49,280 51,314 59,336 C63,344 80,344 84,336 C90,314 88,280 90,251 C92,222 90,206 82,200 Z",
  },
  {
    group: "pierna",
    path: "M135,200 C145,206 149,222 145,251 C151,280 149,314 141,336 C137,344 120,344 116,336 C110,314 112,280 110,251 C108,222 110,206 118,200 Z",
  },
];

// Purely decorative muscle-definition strokes, drawn above the fills with no
// pointer events — sternum line, ab segments, bicep/quad creases.
const DEFINITION_LINES = [
  "M100,78 L100,128", // sternum
  "M75,148 L125,148",
  "M75,163 L125,163",
  "M75,178 L125,178",
  "M100,140 L100,192", // ab center line
  "M30,100 Q26,140 30,190", // left bicep crease
  "M170,100 Q174,140 170,190", // right bicep crease
  "M74,240 Q69,270 74,320", // left quad crease
  "M126,240 Q131,270 126,320", // right quad crease
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
    <svg viewBox="0 0 200 350" width="160" height="280" className="flex-none">
      <circle cx="100" cy="28" r="19" fill="var(--color-surface-2)" stroke="var(--color-line-strong)" strokeWidth="1.5" />
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
            strokeLinejoin="round"
            style={{ cursor: "pointer", transition: "fill 150ms ease, stroke-width 150ms ease" }}
            onClick={() => onSelect(r.group)}
          />
        );
      })}
      <g fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeLinecap="round" pointerEvents="none">
        {DEFINITION_LINES.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
