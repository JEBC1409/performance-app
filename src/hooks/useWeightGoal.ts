import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { resetConfig, saveConfig } from "@/lib/appConfig";
import { CONFIG_WEIGHT_GOAL, sanitizeGoal } from "@/lib/weightGoal";
import type { WeightGoal } from "@/lib/weightGoal";

/** The weight goal, kept in the synced app config. */
export function useWeightGoal(): { goal: WeightGoal | null; save: (g: WeightGoal) => Promise<unknown>; clear: () => Promise<void> } {
  const row = useLiveQuery(async () => ({ value: (await db.appConfig.get(CONFIG_WEIGHT_GOAL))?.value }), []);
  const goal = useMemo(() => sanitizeGoal(row?.value), [row]);
  return { goal, save: (g) => saveConfig(CONFIG_WEIGHT_GOAL, g), clear: () => resetConfig(CONFIG_WEIGHT_GOAL) };
}
