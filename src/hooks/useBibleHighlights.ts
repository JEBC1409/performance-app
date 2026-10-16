import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { saveConfig } from "@/lib/appConfig";
import { CONFIG_BIBLE_HIGHLIGHTS, sanitizeHighlights, withHighlight } from "@/lib/bibleHighlights";
import type { HighlightColor, Highlights } from "@/lib/bibleHighlights";

/** The verses you've coloured, synced with the rest of your configuration. */
export function useBibleHighlights(): { highlights: Highlights; set: (key: string, color: HighlightColor | null) => Promise<unknown> } {
  const row = useLiveQuery(async () => ({ value: (await db.appConfig.get(CONFIG_BIBLE_HIGHLIGHTS))?.value }), []);
  const highlights = useMemo(() => sanitizeHighlights(row?.value), [row]);
  return {
    highlights,
    set: async (key, color) => {
      // Read the stored value fresh so two quick taps don't overwrite each other.
      const current = sanitizeHighlights((await db.appConfig.get(CONFIG_BIBLE_HIGHLIGHTS))?.value);
      return saveConfig(CONFIG_BIBLE_HIGHLIGHTS, withHighlight(current, key, color));
    },
  };
}
