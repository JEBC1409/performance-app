import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { CONFIG_READING_PLAN, sanitizePlan } from "@/lib/readingPlan";
import type { PlanState } from "@/lib/readingPlan";
import { resetConfig, saveConfig } from "@/lib/appConfig";

/** The saved reading plan, kept in the synced app config so it follows you between devices. */
export function useReadingPlan(): { plan: PlanState | null; ready: boolean; save: (p: PlanState) => Promise<unknown>; clear: () => Promise<void> } {
  const row = useLiveQuery(async () => ({ value: (await db.appConfig.get(CONFIG_READING_PLAN))?.value }), []);
  const plan = useMemo(() => sanitizePlan(row?.value), [row]);
  return {
    plan,
    ready: row !== undefined,
    save: (p) => saveConfig(CONFIG_READING_PLAN, p),
    clear: () => resetConfig(CONFIG_READING_PLAN),
  };
}
