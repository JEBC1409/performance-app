import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { saveConfig } from "@/lib/appConfig";
import { todayISO } from "@/lib/date";
import { CONFIG_MOOD, sanitizeMood, withMood } from "@/lib/mood";
import type { MoodMap } from "@/lib/mood";

/** The daily mood log, synced with the rest of your configuration. */
export function useMood(): { mood: MoodMap; ready: boolean; set: (date: string, value: number | null) => Promise<unknown> } {
  const row = useLiveQuery(async () => ({ value: (await db.appConfig.get(CONFIG_MOOD))?.value }), []);
  const mood = useMemo(() => sanitizeMood(row?.value), [row]);
  return {
    mood,
    ready: row !== undefined,
    set: async (date, value) => saveConfig(CONFIG_MOOD, withMood(sanitizeMood((await db.appConfig.get(CONFIG_MOOD))?.value), date, value, todayISO())),
  };
}
