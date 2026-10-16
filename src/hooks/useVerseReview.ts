import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { saveConfig } from "@/lib/appConfig";
import { CONFIG_VERSE_REVIEW, gradeReview, sanitizeReview, startReview, stopReview } from "@/lib/verseReview";
import type { ReviewState } from "@/lib/verseReview";

/** The verses you're memorising, kept in the synced app config. */
export function useVerseReview(): { state: ReviewState; start: (key: string, today: string) => Promise<unknown>; stop: (key: string) => Promise<unknown>; grade: (key: string, knew: boolean, today: string) => Promise<unknown> } {
  const row = useLiveQuery(async () => ({ value: (await db.appConfig.get(CONFIG_VERSE_REVIEW))?.value }), []);
  const state = useMemo(() => sanitizeReview(row?.value), [row]);
  // Always apply the change to what's stored right now, so two quick taps don't overwrite each other.
  const update = async (fn: (s: ReviewState) => ReviewState) => saveConfig(CONFIG_VERSE_REVIEW, fn(sanitizeReview((await db.appConfig.get(CONFIG_VERSE_REVIEW))?.value)));
  return {
    state,
    start: (key, today) => update((s) => startReview(s, key, today)),
    stop: (key) => update((s) => stopReview(s, key)),
    grade: (key, knew, today) => update((s) => gradeReview(s, key, knew, today)),
  };
}
