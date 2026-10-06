import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { saveConfig } from "@/lib/appConfig";
import { CONFIG_PRIORITIES, prune, sanitizePriorities } from "@/lib/priorities";
import type { PrioritiesState } from "@/lib/priorities";
import { todayISO } from "@/lib/date";

/** The priorities by day (synced). `update` applies a change to the latest saved copy, so two quick edits can't overwrite each other. */
export function usePriorities(): { state: PrioritiesState; update: (change: (s: PrioritiesState) => PrioritiesState) => Promise<void> } {
  const row = useLiveQuery(async () => ({ value: (await db.appConfig.get(CONFIG_PRIORITIES))?.value }), []);
  const state = useMemo(() => sanitizePriorities(row?.value), [row]);
  return {
    state,
    update: async (change) => {
      const latest = sanitizePriorities((await db.appConfig.get(CONFIG_PRIORITIES))?.value);
      await saveConfig(CONFIG_PRIORITIES, prune(change(latest), todayISO()));
    },
  };
}
