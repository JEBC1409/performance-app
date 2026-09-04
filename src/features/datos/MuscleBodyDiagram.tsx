import { useMemo, useState } from "react";
import Model, { type Muscle, type IExerciseData } from "react-body-highlighter";
import type { MuscleGroup } from "@/data/muscleGroups";
import { RANK_TIERS, type RankTier } from "@/lib/muscleRank";

type View = "anterior" | "posterior";

/** Which of the library's real anatomical regions belong to each of our
 * muscle groups, split by which side of the body they're visible from —
 * "pierna" spans both (quads up front, hamstrings/glutes on the back), so
 * a single silhouette can't show the whole story; this backs a front/back
 * toggle instead. */
const GROUP_MUSCLES: Record<MuscleGroup, Partial<Record<View, Muscle[]>>> = {
  espalda: { posterior: ["trapezius", "upper-back", "lower-back"] },
  pecho: { anterior: ["chest"] },
  hombro: { anterior: ["front-deltoids"], posterior: ["back-deltoids"] },
  brazo: { anterior: ["biceps", "forearm"], posterior: ["triceps"] },
  pierna: { anterior: ["quadriceps", "adductor"], posterior: ["hamstring", "calves", "gluteal", "abductors"] },
  core: { anterior: ["abs", "obliques"] },
};

const MUSCLE_TO_GROUP: Partial<Record<Muscle, MuscleGroup>> = {};
(Object.keys(GROUP_MUSCLES) as MuscleGroup[]).forEach((group) => {
  const byView = GROUP_MUSCLES[group];
  (["anterior", "posterior"] as View[]).forEach((view) => {
    byView[view]?.forEach((muscle) => {
      MUSCLE_TO_GROUP[muscle] = group;
    });
  });
});

const HIGHLIGHTED_COLORS = RANK_TIERS.map((t) => t.color);

export function MuscleBodyDiagram({
  rankByGroup,
  // The library has no per-polygon selection hook to draw a ring around, so
  // "selected" is reflected by the muscle-group button grid below the
  // diagram (VolumenTab) instead — kept in the signature so the diagram and
  // that grid share one prop contract.
  selected: _selected,
  onSelect,
}: {
  rankByGroup: Record<MuscleGroup, RankTier>;
  selected: MuscleGroup | null;
  onSelect: (g: MuscleGroup) => void;
}) {
  const [view, setView] = useState<View>("anterior");

  const data: IExerciseData[] = useMemo(() => {
    const out: IExerciseData[] = [];
    (Object.keys(GROUP_MUSCLES) as MuscleGroup[]).forEach((group) => {
      const muscles = GROUP_MUSCLES[group][view];
      if (!muscles?.length) return;
      const tierIndex = RANK_TIERS.findIndex((t) => t.key === rankByGroup[group]?.key);
      if (tierIndex < 0) return;
      out.push({ name: group, muscles, frequency: tierIndex + 1 });
    });
    return out;
  }, [rankByGroup, view]);

  return (
    <div className="flex-none flex flex-col items-center gap-2">
      <div className="flex gap-1 rounded-full border border-[var(--color-line-strong)] p-0.5">
        {(["anterior", "posterior"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-3 py-1 text-[9.5px] font-semibold uppercase tracking-wide transition-colors ${
              view === v ? "bg-[var(--color-red)] text-white" : "text-[var(--color-muted)]"
            }`}
          >
            {v === "anterior" ? "Frente" : "Espalda"}
          </button>
        ))}
      </div>
      <Model
        type={view}
        data={data}
        bodyColor="var(--color-surface-2)"
        highlightedColors={HIGHLIGHTED_COLORS}
        style={{ width: 150, height: 260 }}
        svgStyle={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}
        onClick={({ muscle }) => {
          const group = MUSCLE_TO_GROUP[muscle];
          if (group) onSelect(group);
        }}
      />
    </div>
  );
}
