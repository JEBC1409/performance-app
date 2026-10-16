import { useMemo, useState } from "react";
import type { SavedVerseRecord } from "@/db/db";
import { useVerseReview } from "@/hooks/useVerseReview";
import { todayISO } from "@/lib/date";
import { verseKey } from "@/lib/bibleHighlights";
import { dueKeys } from "@/lib/verseReview";
import { Card, CardTitle } from "@/ui";

/** Today's verses to recall: see the reference, say it from memory, check, and
 * grade yourself. Verses you know come back later and later. */
export function VerseReview({ saved }: { saved: SavedVerseRecord[] }) {
  const { state, grade } = useVerseReview();
  const today = todayISO();
  const [revealed, setRevealed] = useState(false);

  const byKey = useMemo(() => new Map(saved.map((v) => [verseKey(v.abbrev, v.chapter, v.verse), v])), [saved]);
  // Only verses still saved can be shown; the rest are skipped.
  const due = dueKeys(state, today).filter((k) => byKey.has(k));
  const learning = Object.keys(state).length;
  if (!learning) return null;

  const key = due[0];
  const verse = key ? byKey.get(key) : undefined;

  async function answer(knew: boolean) {
    if (!key) return;
    setRevealed(false);
    await grade(key, knew, today);
  }

  return (
    <Card className="panel-surface-glow">
      <CardTitle right={due.length ? `${due.length} por repasar` : `${learning} memorizando`}>Repaso de versículos</CardTitle>
      {verse ? (
        <div className="mt-3">
          <div className="num text-[12px] font-semibold uppercase tracking-wide text-[var(--color-gold)]">
            {verse.bookName} {verse.chapter}:{verse.verse}
          </div>
          {revealed ? (
            <>
              <p className="mt-2 text-[15px] leading-relaxed">{verse.text}</p>
              <p className="mt-3 text-[11.5px] text-[var(--color-muted)]">¿Lo dijiste bien?</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => void answer(true)} className="glass-on tap-target flex-1 rounded-full py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  Lo sabía
                </button>
                <button onClick={() => void answer(false)} className="glass tap-target flex-1 rounded-full py-2.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  Aún no
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-[13px] text-[var(--color-muted)]">Dilo de memoria, en voz alta o en tu mente. Luego míralo.</p>
              <button onClick={() => setRevealed(true)} className="glass tap-target mt-3 w-full rounded-full py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                Ver el versículo
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-[var(--color-good)]">Listo por hoy ✓</p>
      )}
    </Card>
  );
}
