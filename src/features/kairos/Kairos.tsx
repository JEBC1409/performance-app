import { Skeleton } from "@/ui/Skeleton";
import { newestFirst } from "@/db/safeQuery";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import type { SavedVerseRecord } from "@/db/db";
import { useBible } from "@/hooks/useBible";
import { useNarrator } from "@/hooks/useNarrator";
import { useBibleHighlights } from "@/hooks/useBibleHighlights";
import { HIGHLIGHT_COLORS, colorRgb, verseKey } from "@/lib/bibleHighlights";
import { MIN_QUERY_CHARS, searchBible } from "@/lib/bibleSearch";
import { useVerseReview } from "@/hooks/useVerseReview";
import { dueKeys } from "@/lib/verseReview";
import { shareVerse } from "@/lib/verseImage";
import { VerseReview } from "./VerseReview";
import { BIBLE_BOOKS } from "@/data/bible/books";
import { getChapter, chapterCount } from "@/data/bible/loader";
import { PageHeader, Card, Sheet, Field, Input, Button, FlameGlyph } from "@/ui";
import { Icon } from "@/ui/Icon";
import { Section } from "@/ui/Section";
import { confirmAction } from "@/lib/confirm";
import { showToast } from "@/ui/Toast";
import { currentStreak } from "@/lib/streak";
import { todayISO } from "@/lib/date";
import { BookPicker } from "./BookPicker";
import { ChapterPicker } from "./ChapterPicker";
import { MarkReadChip, ReadingPlanButton } from "./ReadingPlan";
import { ListenButton, NarratorBar, VoiceSheet } from "./NarratorUI";

type View = "leer" | "guardados";

function BookmarkGlyph({ filled = false, className = "" }: { filled?: boolean; className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 10 10" className={className} aria-hidden>
      <path
        d="M2.5 1h5a.5.5 0 0 1 .5.5v7l-3-2-3 2v-7a.5.5 0 0 1 .5-.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 20 20" />
    </svg>
  );
}

export function Kairos() {
  const [view, setView] = useState<View>("leer");
  const { bible, loading } = useBible();
  const [abbrev, setAbbrev] = useState("jo");
  const [chapter, setChapter] = useState(1);
  const [pickedVerse, setPickedVerse] = useState<{ verse: number; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [scrollToVerse, setScrollToVerse] = useState<number | null>(null);
  const [bibleQuery, setBibleQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const deferredBibleQuery = useDeferredValue(bibleQuery);
  const { highlights, set: setHighlight } = useBibleHighlights();
  const review = useVerseReview();

  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const bookmark = settings?.readingProgress ?? null;
  const loadedBookmarkRef = useRef(false);
  useEffect(() => {
    if (loadedBookmarkRef.current || !settings) return;
    loadedBookmarkRef.current = true;
    if (settings.readingProgress) {
      setAbbrev(settings.readingProgress.abbrev);
      setChapter(settings.readingProgress.chapter);
    }
  }, [settings]);

  function closeSearch() {
    setSearchOpen(false);
    setBibleQuery("");
  }

  async function markHere() {
    await db.settings.put({ ...(settings ?? DEFAULT_SETTINGS), readingProgress: { abbrev, chapter } });
    showToast("Marcado — aquí vas");
  }

  /** Pins the bookmark to one exact verse (not just the chapter), so
   * "Continuar" can drop you back at, say, Marcos 7:13 instead of the top. */
  async function markVerseHere(verse: number) {
    await db.settings.put({ ...(settings ?? DEFAULT_SETTINGS), readingProgress: { abbrev, chapter, verse } });
    showToast(`Marcado — vas en ${bookName} ${chapter}:${verse}`);
    setPickedVerse(null);
  }

  /** Opens a chapter in the reader (from the reading plan) and brings it into view. */
  function openChapter(nextAbbrev: string, nextChapter: number) {
    setAbbrev(nextAbbrev);
    setChapter(nextChapter);
    window.setTimeout(() => document.getElementById("kairos-reader")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const chapters = bible ? chapterCount(bible, abbrev) : 0;
  const verses = bible ? getChapter(bible, abbrev, chapter) : [];
  const bookName = BIBLE_BOOKS.find((b) => b.abbrev === abbrev)?.name ?? abbrev;
  const searchResult = useMemo(() => (bible && deferredBibleQuery.trim().length >= MIN_QUERY_CHARS ? searchBible(bible, deferredBibleQuery) : null), [bible, deferredBibleQuery]);
  const bookmarkBookName = bookmark ? (BIBLE_BOOKS.find((b) => b.abbrev === bookmark.abbrev)?.name ?? bookmark.abbrev) : null;
  const isAtBookmark = !!bookmark && bookmark.abbrev === abbrev && bookmark.chapter === chapter;

  // Reading aloud. When a chapter ends it carries on into the next one (and the
  // next book), so you can listen through without touching the screen.
  const autoPlayNext = useRef(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const narrator = useNarrator(verses, `${abbrev}:${chapter}`, () => {
    if (chapter < chapters) {
      autoPlayNext.current = true;
      setChapter(chapter + 1);
      return;
    }
    const nextBook = BIBLE_BOOKS[BIBLE_BOOKS.findIndex((b) => b.abbrev === abbrev) + 1];
    if (nextBook) {
      autoPlayNext.current = true;
      setAbbrev(nextBook.abbrev);
      setChapter(1);
    }
  });
  const { play: narratorPlay, status: narratorStatus, current: spokenIdx } = narrator;
  useEffect(() => {
    if (!autoPlayNext.current || !verses.length) return;
    autoPlayNext.current = false;
    narratorPlay(0);
    document.getElementById("kairos-reader")?.scrollIntoView({ behavior: "smooth", block: "start" });
    // `verses` is a fresh array every render; its length plus the chapter say when the next one is on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abbrev, chapter, verses.length, narratorPlay]);
  // Keep the verse being read in view.
  useEffect(() => {
    if (narratorStatus !== "playing" || spokenIdx < 0) return;
    document.getElementById(`kairos-verse-${spokenIdx + 1}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [narratorStatus, spokenIdx]);

  // Jump-to-verse after "Continuar": set once the target chapter is picked,
  // then scroll as soon as that chapter's verses (and thus the verse's own
  // element) are actually on the page.
  useEffect(() => {
    if (scrollToVerse == null) return;
    const el = document.getElementById(`kairos-verse-${scrollToVerse}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollToVerse(null);
    // `verses` itself isn't a dep: it's a fresh array every render, but this
    // only needs to re-check once the target chapter has actually rendered —
    // which `abbrev`/`chapter` changing already signals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToVerse, abbrev, chapter]);

  // A day counts as "read" the moment a chapter is actually on screen — once
  // per day, written automatically rather than something you have to tick.
  const readDays = useLiveQuery(() => db.bibleReadDays.toArray(), []);
  useEffect(() => {
    if (view !== "leer" || loading || !verses.length || !readDays) return;
    const today = todayISO();
    if (readDays.some((d) => d.date === today)) return;
    void db.bibleReadDays.put({ date: today });
  }, [view, loading, verses.length, readDays]);
  const bibleStreak = useMemo(
    () => currentStreak((readDays ?? []).map((d) => ({ date: d.date, done: ["bible"] })), "bible"),
    [readDays],
  );

  const saved = useLiveQuery(() => newestFirst(db.savedVerses, "createdAt"), []);
  // Which verses of *this* chapter already have something saved — shown as a
  // small dot while reading, so you can see at a glance where you left a note.
  const notedVerses = useMemo(() => new Set((saved ?? []).filter((s) => s.abbrev === abbrev && s.chapter === chapter).map((s) => s.verse)), [saved, abbrev, chapter]);
  const existingForPicked = useMemo(
    () => (pickedVerse ? (saved ?? []).filter((s) => s.abbrev === abbrev && s.chapter === chapter && s.verse === pickedVerse.verse) : []),
    [saved, abbrev, chapter, pickedVerse],
  );
  const filteredSaved = useMemo(() => {
    if (!saved) return [];
    const q = query.trim().toLowerCase();
    if (!q) return saved;
    return saved.filter((s) => s.text.toLowerCase().includes(q) || s.note.toLowerCase().includes(q) || s.bookName.toLowerCase().includes(q));
  }, [saved, query]);

  // Grouped by book (in Bible order) so a growing pile of notes stays
  // findable — scanning one long list by date makes it hard to land back on
  // a teaching you remember writing. The book you saved to most recently
  // opens by default; the rest stay collapsed until you go looking.
  const bookOrder = useMemo(() => new Map(BIBLE_BOOKS.map((b, i) => [b.abbrev, i])), []);
  const groupedSaved = useMemo(() => {
    const byBook = new Map<string, SavedVerseRecord[]>();
    for (const v of filteredSaved) {
      const list = byBook.get(v.abbrev);
      if (list) list.push(v);
      else byBook.set(v.abbrev, [v]);
    }
    const groups = [...byBook.entries()].map(([bookAbbrev, items]) => ({
      abbrev: bookAbbrev,
      bookName: items[0].bookName,
      // Canonical reading order within a book — it reads like your own
      // study notes in Bible order, not a jumble sorted by when you wrote them.
      items: [...items].sort((a, b) => a.chapter - b.chapter || a.verse - b.verse || a.createdAt - b.createdAt),
    }));
    groups.sort((a, b) => (bookOrder.get(a.abbrev) ?? 0) - (bookOrder.get(b.abbrev) ?? 0));
    return groups;
  }, [filteredSaved, bookOrder]);
  const mostRecentAbbrev = saved?.[0]?.abbrev;

  async function deleteSaved(v: SavedVerseRecord) {
    if (!(await confirmAction({ title: "¿Eliminar este guardado?", message: `${v.bookName} ${v.chapter}:${v.verse}`, confirmLabel: "Eliminar", danger: true }))) return;
    await db.savedVerses.delete(v.id!);
    showToast("Guardado eliminado", {
      action: {
        label: "Deshacer",
        onClick: () => {
          const { id: _dropped, ...rest } = v;
          void db.savedVerses.add(rest);
        },
      },
    });
  }

  async function saveVerse() {
    if (!pickedVerse) return;
    await db.savedVerses.add({
      abbrev,
      bookName,
      chapter,
      verse: pickedVerse.verse,
      text: pickedVerse.text,
      note,
      createdAt: Date.now(),
    });
    showToast("Versículo guardado");
    setPickedVerse(null);
    setNote("");
  }

  const pickedKey = pickedVerse ? verseKey(abbrev, chapter, pickedVerse.verse) : "";
  const streakLine =
    bibleStreak > 0 ? (
      <span className="inline-flex items-center gap-1.5 align-middle">
        <FlameGlyph size={14} className="flame-glow flex-none" />
        <span>
          <span className="num font-semibold text-[var(--color-ink)]">{bibleStreak}</span> {bibleStreak === 1 ? "día seguido leyendo" : "días seguidos leyendo"}
        </span>
      </span>
    ) : null;

  return (
    <>
      {/* ── Decoración lateral (desktop, en el margen vacío) — fuera del
         contenedor "enter": un `transform` de animación con fill-mode
         forwards sigue estableciendo containing block para los `fixed`
         hijos incluso cuando termina en transform:none, así que estas
         imágenes deben vivir fuera de ese contenedor. ── */}
      <img
        src="/images/kairos-cross.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed left-2 top-20 z-[-1] hidden h-[30vh] max-w-[160px] object-contain object-top mix-blend-screen opacity-90 sidebar:block"
      />
      <img
        src="/images/kairos-knight.webp"
        alt=""
        aria-hidden="true"
        className="kairos-knight-img pointer-events-none fixed bottom-0 right-2 z-[-1] hidden h-[60vh] max-w-[220px] object-contain object-bottom sidebar:block"
      />

      <div className="flex flex-col gap-3 enter">
        <PageHeader
          gold
          eyebrow="Oración · Reina-Valera 1909"
          title="Biblia"
          subtitle={streakLine}
          right={
            view === "leer" ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setSearchOpen(true)} aria-label="Buscar en la Biblia" className="glass flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--color-ink)]">
                  <SearchGlyph />
                </button>
                <ReadingPlanButton onOpen={openChapter} />
              </div>
            ) : null
          }
        />

        <div className="glass-track flex gap-1 rounded-full p-1" role="group" aria-label="Vista">
          <button onClick={() => setView("leer")} aria-pressed={view === "leer"} className="glass-flat tap-target flex-1 rounded-full text-sm font-semibold text-[var(--color-muted)]">
            Leer
          </button>
          <button onClick={() => setView("guardados")} aria-pressed={view === "guardados"} className="glass-flat tap-target flex-1 rounded-full text-sm font-semibold text-[var(--color-muted)]">
            Guardados ({saved?.length ?? 0})
            {dueKeys(review.state, todayISO()).length ? <span role="img" className="ml-1.5 inline-block h-2 w-2 rounded-full bg-[var(--color-gold)]" aria-label="Tienes versículos por repasar" /> : null}
          </button>
        </div>

        {view === "leer" ? (
          loading ? (
            <div className="flex flex-col gap-3 py-4" role="status" aria-label="Cargando biblia">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? "w-3/5" : ""}`} />
              ))}
            </div>
          ) : (
            <>
              {bookmark && !isAtBookmark ? (
                <button
                  onClick={() => {
                    setAbbrev(bookmark.abbrev);
                    setChapter(bookmark.chapter);
                    setScrollToVerse(bookmark.verse ?? null);
                  }}
                  className="glass-gold tap-target flex items-center gap-2 rounded-xl px-3.5 text-left"
                >
                  <BookmarkGlyph filled className="flex-none" />
                  <span className="min-w-0 truncate text-sm text-[var(--color-ink)]">
                    Ibas en{" "}
                    <span className="font-semibold">
                      {bookmarkBookName} {bookmark.chapter}
                      {bookmark.verse ? `:${bookmark.verse}` : ""}
                    </span>
                  </span>
                  <span className="ml-auto flex flex-none items-center gap-1 text-sm font-semibold">
                    Continuar <Icon name="arrow-right" size={14} />
                  </span>
                </button>
              ) : null}

              <Card id="kairos-reader" className="panel-gold scroll-mt-20">
                <h2 className="sr-only">
                  {bookName} {chapter} · {verses.length} versículos
                </h2>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <BookPicker
                      value={abbrev}
                      books={BIBLE_BOOKS}
                      onChange={(next) => {
                        setAbbrev(next);
                        setChapter(1);
                      }}
                    />
                  </div>
                  <div className="w-[8.75rem] flex-none">
                    <ChapterPicker value={chapter} count={chapters} onChange={setChapter} />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {narrator.supported ? (
                    <div className="flex items-center">
                      <ListenButton narrator={narrator} className="rounded-r-none" />
                      <button onClick={() => setVoiceOpen(true)} aria-label="Elegir la voz del narrador" className="glass tap-target -ml-px rounded-full rounded-l-none px-3.5 text-sm font-semibold text-[var(--color-muted)]">
                        Voz
                      </button>
                    </div>
                  ) : null}
                  <button
                    onClick={isAtBookmark ? undefined : markHere}
                    aria-pressed={isAtBookmark}
                    className={`tap-target flex items-center gap-2 rounded-full px-3.5 text-sm font-semibold ${isAtBookmark ? "glass-gold" : "glass text-[var(--color-muted)]"}`}
                  >
                    <BookmarkGlyph filled={isAtBookmark} />
                    {isAtBookmark ? "Aquí voy" : "Marcar aquí"}
                  </button>
                  <MarkReadChip abbrev={abbrev} chapter={chapter} />
                </div>

                <div className="mt-3 flex flex-col divide-y divide-[var(--color-line)] border-t border-[var(--color-line)] pt-3">
                  {verses.map((text, i) => {
                    const vNum = i + 1;
                    const isSpoken = narratorStatus !== "idle" && spokenIdx === i;
                    const tint = highlights[verseKey(abbrev, chapter, vNum)];
                    const noted = notedVerses.has(vNum);
                    const isBookmarked = bookmark?.abbrev === abbrev && bookmark?.chapter === chapter && bookmark?.verse === vNum;
                    return (
                      <button
                        key={i}
                        id={`kairos-verse-${vNum}`}
                        onClick={() => setPickedVerse({ verse: vNum, text })}
                        className={`group flex items-start gap-3 py-3 text-left first:pt-0 last:pb-0 ${isBookmarked ? "-mx-2 rounded-xl px-2 bg-[rgb(var(--gold-rgb)/0.14)]" : ""} ${isSpoken ? "-mx-2 rounded-xl px-2 bg-[rgb(var(--accent-rgb)/0.16)]" : ""} ${tint && !isSpoken && !isBookmarked ? "-mx-2 rounded-xl px-2" : ""}`}
                        style={tint && !isSpoken ? { backgroundColor: `rgb(${colorRgb(tint)} / 0.18)` } : undefined}
                      >
                        <span className="relative num mt-1 flex h-6 min-w-6 flex-none items-center justify-center rounded-full bg-[var(--color-surface-2)] px-1 text-meta font-bold text-[var(--color-gold)]">
                          {vNum}
                          {noted ? <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-gold)] ring-2 ring-[var(--color-surface)]" /> : null}
                        </span>
                        <span className={`text-base leading-relaxed ${isSpoken ? "text-[var(--color-ink)]" : "text-[rgb(var(--fg-rgb)/0.88)]"}`}>
                          {text}
                          {isBookmarked ? <span className="sr-only"> · aquí vas</span> : null}
                          {noted ? <span className="sr-only"> · tienes una nota guardada aquí</span> : null}
                        </span>
                        {isBookmarked ? <BookmarkGlyph filled className="mt-1.5 flex-none self-start text-[var(--color-gold)]" /> : null}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <VerseReview />
            <Field label="Buscar">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Texto, nota o libro…" className="w-full" />
            </Field>
            {!filteredSaved.length ? (
              <div className="py-10 text-center text-sm text-[var(--color-muted)]">{query ? "Nada coincide con esa búsqueda." : "Sin versículos guardados."}</div>
            ) : query ? (
              // While actively searching, grouping only gets in the way — the flat list is already narrow.
              <div className="flex flex-col gap-3">
                {filteredSaved.map((v) => (
                  <SavedCard key={v.id} v={v} onDelete={deleteSaved} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {groupedSaved.map((g) => (
                  <Section
                    key={g.abbrev}
                    id={`kairos-${g.abbrev}`}
                    title={g.bookName}
                    summary={`${g.items.length} guardado${g.items.length === 1 ? "" : "s"} · último ${new Date(Math.max(...g.items.map((i) => i.createdAt))).toLocaleDateString("es-CO")}`}
                    defaultOpen={g.abbrev === mostRecentAbbrev}
                  >
                    {g.items.map((v) => (
                      <SavedCard key={v.id} v={v} onDelete={deleteSaved} />
                    ))}
                  </Section>
                ))}
              </div>
            )}
          </div>
        )}

        <Sheet open={searchOpen} onClose={closeSearch} title="Buscar en la Biblia">
          <input
            type="search"
            autoFocus
            value={bibleQuery}
            onChange={(e) => setBibleQuery(e.target.value)}
            placeholder="Ej. “fe”, “no temas”"
            aria-label="Buscar en la Biblia"
            className="w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-base"
          />
          <div className="mt-3" role="region" aria-label="Resultados de la búsqueda" aria-live="polite">
            {searchResult ? (
              searchResult.total === 0 ? (
                <p className="px-1 py-3 text-sm text-[var(--color-muted)]">No encontré versículos con eso.</p>
              ) : (
                <>
                  <div className="num pb-1 text-meta text-[var(--color-muted)]">
                    {searchResult.total} {searchResult.total === 1 ? "versículo" : "versículos"}
                    {searchResult.total > searchResult.hits.length ? ` · mostrando ${searchResult.hits.length}` : ""}
                  </div>
                  <ul className="flex max-h-[50vh] flex-col divide-y divide-[var(--color-line)] overflow-y-auto">
                    {searchResult.hits.map((h) => (
                      <li key={`${h.abbrev}.${h.chapter}.${h.verse}`}>
                        <button
                          onClick={() => {
                            setAbbrev(h.abbrev);
                            setChapter(h.chapter);
                            setScrollToVerse(h.verse);
                            closeSearch();
                          }}
                          className="min-h-[var(--control-h)] w-full px-1 py-2.5 text-left"
                        >
                          <span className="num text-sm font-semibold text-[var(--color-gold)]">
                            {h.bookName} {h.chapter}:{h.verse}
                          </span>
                          <span className="mt-0.5 block text-sm leading-snug text-[rgb(var(--fg-rgb)/0.85)]">{h.text}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )
            ) : (
              <p className="px-1 py-2 text-sm text-[var(--color-muted)]">Escribe al menos {MIN_QUERY_CHARS} letras para buscar en toda la Biblia.</p>
            )}
          </div>
        </Sheet>

        <Sheet open={!!pickedVerse} onClose={() => setPickedVerse(null)} title="Guardar versículo">
          {pickedVerse ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="num inline-flex items-center rounded-full border border-[rgb(var(--gold-rgb)/0.5)] px-3 py-1 text-sm font-semibold text-[var(--color-gold)]">
                  {bookName} {chapter}:{pickedVerse.verse}
                </div>
                <button onClick={() => markVerseHere(pickedVerse.verse)} className="glass-gold tap-target flex flex-none items-center gap-2 rounded-full px-4 text-sm font-semibold">
                  <BookmarkGlyph filled />
                  Marcar aquí
                </button>
              </div>
              <p className="mt-3 text-base leading-relaxed">{pickedVerse.text}</p>
              <div className="mt-3 flex items-center gap-2" role="group" aria-label="Resaltar versículo">
                <span className="mr-1 text-sm text-[var(--color-muted)]">Resaltar</span>
                {HIGHLIGHT_COLORS.map((c) => {
                  const on = highlights[pickedKey] === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => void setHighlight(pickedKey, on ? null : c.key)}
                      aria-label={`${c.label}${on ? " (quitar)" : ""}`}
                      aria-pressed={on}
                      className="hit h-9 w-9 rounded-full border-2"
                      style={{ backgroundColor: `rgb(${c.rgb} / 0.55)`, borderColor: on ? `rgb(${c.rgb})` : "transparent" }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    void (pickedKey in review.state ? review.stop(pickedKey) : review.start(pickedKey, todayISO()));
                    showToast(pickedKey in review.state ? "Quitado del repaso" : "A memorizar — te lo recuerdo en Guardados");
                  }}
                  className="glass tap-target rounded-full px-4 text-sm font-semibold text-[var(--color-muted)]"
                >
                  {pickedKey in review.state ? "Dejar de memorizar" : "Memorizar"}
                </button>
                <button
                  onClick={async () => {
                    const r = await shareVerse(`${bookName} ${chapter}:${pickedVerse.verse}`, pickedVerse.text);
                    if (r === "downloaded") showToast("Imagen guardada");
                    else if (r === "failed") showToast("No se pudo crear la imagen");
                  }}
                  className="glass tap-target rounded-full px-4 text-sm font-semibold text-[var(--color-muted)]"
                >
                  Compartir imagen
                </button>
                {narrator.supported ? (
                  <button
                    onClick={() => {
                      const from = pickedVerse.verse - 1;
                      setPickedVerse(null);
                      narrator.play(from);
                    }}
                    className="glass tap-target rounded-full px-4 text-sm font-semibold text-[var(--color-muted)]"
                  >
                    Escuchar desde aquí
                  </button>
                ) : null}
              </div>
              {existingForPicked.length ? (
                <div className="mt-3 flex flex-col gap-2">
                  <span className="eyebrow eyebrow-accent">Ya guardaste esto {existingForPicked.length > 1 ? `(${existingForPicked.length} veces)` : ""}</span>
                  {existingForPicked.map((v) => (
                    <div key={v.id} className="flex items-start gap-2 rounded-xl border border-[var(--color-line-strong)] py-2 pl-3 pr-1.5">
                      <div className="min-w-0 flex-1">
                        {v.note ? <p className="text-sm italic text-[var(--color-muted)]">{v.note}</p> : <p className="text-sm text-[var(--color-muted)]">Sin nota — solo el versículo.</p>}
                        <div className="num mt-1 text-meta text-[var(--color-muted)]">{new Date(v.createdAt).toLocaleDateString("es-CO")}</div>
                      </div>
                      <button
                        onClick={() => deleteSaved(v)}
                        aria-label="Eliminar este guardado"
                        className="hit flex h-8 w-8 flex-none items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[rgb(var(--fg-rgb)/0.08)] hover:text-[var(--color-accent-text)]"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-4">
                <Field label="Tu nota">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-base"
                  />
                </Field>
              </div>
              <Button variant="primary" className="mt-3 w-full" onClick={saveVerse}>
                Guardar
              </Button>
            </div>
          ) : null}
        </Sheet>
        <NarratorBar narrator={narrator} where={`${bookName} ${chapter}:${Math.max(1, spokenIdx + 1)}`} onVoice={() => setVoiceOpen(true)} />
        <VoiceSheet narrator={narrator} open={voiceOpen} onClose={() => setVoiceOpen(false)} />
      </div>
    </>
  );
}

function SavedCard({ v, onDelete }: { v: SavedVerseRecord; onDelete: (v: SavedVerseRecord) => void }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="num inline-flex items-center rounded-full border border-[rgb(var(--gold-rgb)/0.5)] px-3 py-1 text-sm font-semibold text-[var(--color-gold)]">
          {v.bookName} {v.chapter}:{v.verse}
        </div>
        <button
          onClick={() => onDelete(v)}
          aria-label="Eliminar guardado"
          className="hit flex h-8 w-8 flex-none items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[rgb(var(--fg-rgb)/0.08)] hover:text-[var(--color-accent-text)]"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      <p className="mt-2.5 text-base leading-relaxed">{v.text}</p>
      {v.note ? <p className="mt-2.5 rounded-xl bg-[rgb(var(--fg-rgb)/0.05)] px-3 py-2 text-sm italic text-[var(--color-muted)]">{v.note}</p> : null}
      <div className="num mt-2.5 text-meta text-[var(--color-muted)]">{new Date(v.createdAt).toLocaleDateString("es-CO")}</div>
    </Card>
  );
}
