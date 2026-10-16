import { useState } from "react";
import { BIBLE_BOOKS } from "@/data/bible/books";
import { getChapter } from "@/data/bible/loader";
import { useBible } from "@/hooks/useBible";
import { useVerseReview } from "@/hooks/useVerseReview";
import { todayISO } from "@/lib/date";
import { dueKeys } from "@/lib/verseReview";
import { Card, CardTitle } from "@/ui";

interface Passage {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

/** "jo.3.16" → the passage and its text, straight from the Bible (so a verse can
 * be memorised without having been saved). Null while the Bible loads or if it doesn't exist. */
function passageFor(key: string, bible: ReturnType<typeof useBible>["bible"]): Passage | null {
  if (!bible) return null;
  const [abbrev, c, v] = key.split(".");
  const chapter = Number(c);
  const verse = Number(v);
  const text = getChapter(bible, abbrev, chapter)[verse - 1];
  const bookName = BIBLE_BOOKS.find((b) => b.abbrev === abbrev)?.name;
  return text && bookName ? { bookName, chapter, verse, text } : null;
}

/** Today's verses to recall: see the reference, say it from memory, check, and
 * grade yourself. Verses you know come back later and later. */
export function VerseReview() {
  const { state, grade } = useVerseReview();
  const { bible } = useBible();
  const today = todayISO();
  const [revealed, setRevealed] = useState(false);

  const learning = Object.keys(state).length;
  if (!learning) return null;

  const due = dueKeys(state, today);
  const key = due.find((k) => passageFor(k, bible)) ?? null;
  const passage = key ? passageFor(key, bible) : null;

  async function answer(knew: boolean) {
    if (!key) return;
    setRevealed(false);
    await grade(key, knew, today);
  }

  return (
    <Card className="panel-surface-glow">
      <CardTitle right={due.length ? `${due.length} por repasar` : `${learning} memorizando`}>Repaso de versículos</CardTitle>
      {passage ? (
        <div className="mt-3">
          <div className="num text-[12px] font-semibold uppercase tracking-wide text-[var(--color-gold)]">
            {passage.bookName} {passage.chapter}:{passage.verse}
          </div>
          {revealed ? (
            <>
              <p className="mt-2 text-[15px] leading-relaxed">{passage.text}</p>
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
      ) : due.length && !bible ? (
        <p className="mt-2 text-[13px] text-[var(--color-muted)]">Cargando…</p>
      ) : (
        <p className="mt-2 text-[13px] text-[var(--color-good)]">Listo por hoy ✓</p>
      )}
    </Card>
  );
}
