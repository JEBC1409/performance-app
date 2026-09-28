import { Skeleton } from "@/ui/Skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import type { SavedVerseRecord } from "@/db/db";
import { useBible } from "@/hooks/useBible";
import { BIBLE_BOOKS } from "@/data/bible/books";
import { getChapter, chapterCount } from "@/data/bible/loader";
import { Eyebrow, Card, Sheet, Field, Input, Button, FlameGlyph } from "@/ui";
import { Icon } from "@/ui/Icon";
import { Section } from "@/ui/Section";
import { confirmAction } from "@/lib/confirm";
import { showToast } from "@/ui/Toast";
import { currentStreak } from "@/lib/streak";
import { todayISO } from "@/lib/date";
import { BookPicker } from "./BookPicker";
import { ChapterPicker } from "./ChapterPicker";

type View = "leer" | "guardados";

function BookmarkGlyph({ filled = false, className = "" }: { filled?: boolean; className?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 10 10" className={className} aria-hidden>
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

export function Kairos() {
  const [view, setView] = useState<View>("leer");
  const { bible, loading } = useBible();
  const [abbrev, setAbbrev] = useState("jo");
  const [chapter, setChapter] = useState(1);
  const [pickedVerse, setPickedVerse] = useState<{ verse: number; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [scrollToVerse, setScrollToVerse] = useState<number | null>(null);

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

  const chapters = bible ? chapterCount(bible, abbrev) : 0;
  const verses = bible ? getChapter(bible, abbrev, chapter) : [];
  const bookName = BIBLE_BOOKS.find((b) => b.abbrev === abbrev)?.name ?? abbrev;
  const bookmarkBookName = bookmark ? (BIBLE_BOOKS.find((b) => b.abbrev === bookmark.abbrev)?.name ?? bookmark.abbrev) : null;
  const isAtBookmark = !!bookmark && bookmark.abbrev === abbrev && bookmark.chapter === chapter;

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

  const saved = useLiveQuery(() => db.savedVerses.orderBy("createdAt").reverse().toArray(), []);
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

      <div className="flex flex-col gap-4 enter">
        <div>
          <Eyebrow gold>Oración</Eyebrow>
          <h1 className="font-[var(--font-display)] text-xl mt-1.5">Biblia · Reina-Valera 1909</h1>
        </div>

        <div className="glass-track flex gap-1 p-1 rounded-full">
          <button
            onClick={() => setView("leer")}
            className={`tap-target flex-1 rounded-full py-2 text-[12px] font-semibold uppercase tracking-wide ${view === "leer" ? "glass-on" : "glass-flat text-[var(--color-muted)]"}`}
          >
            Leer
          </button>
          <button
            onClick={() => setView("guardados")}
            className={`tap-target flex-1 rounded-full py-2 text-[12px] font-semibold uppercase tracking-wide ${view === "guardados" ? "glass-on" : "glass-flat text-[var(--color-muted)]"}`}
          >
            Guardados ({saved?.length ?? 0})
          </button>
        </div>

        {bibleStreak > 0 ? (
          <div className="flex items-center gap-2 px-1">
            <FlameGlyph size={16} className="flame-glow flex-none" />
            <span className="text-[11.5px] text-[var(--color-muted)]">
              <span className="num font-semibold text-[var(--color-ink)]">{bibleStreak}</span> {bibleStreak === 1 ? "día seguido leyendo" : "días seguidos leyendo"}
            </span>
          </div>
        ) : null}

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
                  className="glass-gold flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-left"
                >
                  <BookmarkGlyph filled className="flex-none text-[var(--color-red)]" />
                  <span className="text-[12px] text-[var(--color-ink)]">
                    Ibas en <span className="font-semibold">{bookmarkBookName} {bookmark.chapter}{bookmark.verse ? `:${bookmark.verse}` : ""}</span>
                  </span>
                  <span className="ml-auto flex-none text-[11px] uppercase tracking-wide text-[var(--color-red)]">Continuar →</span>
                </button>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Libro">
                  <BookPicker
                    value={abbrev}
                    books={BIBLE_BOOKS}
                    onChange={(next) => {
                      setAbbrev(next);
                      setChapter(1);
                    }}
                  />
                </Field>
                <Field label="Capítulo">
                  <ChapterPicker value={chapter} count={chapters} onChange={setChapter} />
                </Field>
              </div>

              <Card className="panel-surface-glow">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-line)]">
                  <div>
                    <Eyebrow gold>Leyendo</Eyebrow>
                    <div className="text-[16px] font-bold mt-1">
                      {bookName} {chapter}
                    </div>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1.5">
                    <span className="text-[11px] text-[var(--color-muted-2)] num uppercase tracking-wide">{verses.length} versículos</span>
                    <button
                      onClick={markHere}
                      disabled={isAtBookmark}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${
                        isAtBookmark ? "glass-gold" : "glass text-[var(--color-muted)] hover:text-[var(--color-gold)]"
                      }`}
                    >
                      <BookmarkGlyph filled={isAtBookmark} />
                      {isAtBookmark ? "Aquí voy" : "Marcar aquí"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col divide-y divide-[var(--color-line)]">
                  {verses.map((text, i) => {
                    const vNum = i + 1;
                    const noted = notedVerses.has(vNum);
                    const isBookmarked = bookmark?.abbrev === abbrev && bookmark?.chapter === chapter && bookmark?.verse === vNum;
                    return (
                      <button
                        key={i}
                        id={`kairos-verse-${vNum}`}
                        onClick={() => setPickedVerse({ verse: vNum, text })}
                        className={`group flex items-start gap-3 py-3 text-left first:pt-0 last:pb-0 ${isBookmarked ? "-mx-2 rounded-xl px-2 bg-[rgb(var(--accent-rgb)/0.07)]" : ""}`}
                      >
                        <span className="relative num mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[10.5px] font-bold text-[var(--color-red)] transition-colors group-hover:bg-[var(--color-red)] group-hover:text-white">
                          {vNum}
                          {noted ? (
                            <span
                              aria-hidden
                              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-gold)] ring-2 ring-[var(--color-surface)]"
                            />
                          ) : null}
                        </span>
                        <span className="text-[14px] leading-relaxed text-[rgb(var(--fg-rgb)/0.82)] transition-colors group-hover:text-[var(--color-ink)]">
                          {text}
                          {isBookmarked ? <span className="sr-only"> · aquí vas</span> : null}
                          {noted ? <span className="sr-only"> · tienes una nota guardada aquí</span> : null}
                        </span>
                        {isBookmarked ? <BookmarkGlyph filled className="mt-1 flex-none self-center text-[var(--color-red)]" /> : null}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Buscar">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Texto, nota o libro…" className="w-full" />
            </Field>
            {!filteredSaved.length ? (
              <div className="text-center py-10 text-[13px] text-[var(--color-muted)]">
                {query ? "Nada coincide con esa búsqueda." : "Sin versículos guardados."}
              </div>
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

        <Sheet open={!!pickedVerse} onClose={() => setPickedVerse(null)} title="Guardar versículo">
          {pickedVerse ? (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="inline-flex items-center rounded-full border border-[var(--color-red-soft)] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-red)] num">
                  {bookName} {chapter}:{pickedVerse.verse}
                </div>
                <button
                  onClick={() => markVerseHere(pickedVerse.verse)}
                  className="glass-gold tap-target flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink)]"
                >
                  <BookmarkGlyph filled />
                  Marcar aquí
                </button>
              </div>
              <p className="text-[13.5px] mt-3 leading-relaxed">{pickedVerse.text}</p>
              {existingForPicked.length ? (
                <div className="mt-3 flex flex-col gap-2">
                  <span className="eyebrow eyebrow-accent">
                    Ya guardaste esto {existingForPicked.length > 1 ? `(${existingForPicked.length} veces)` : ""}
                  </span>
                  {existingForPicked.map((v) => (
                    <div key={v.id} className="flex items-start gap-2 rounded-xl border border-[var(--color-line-strong)] px-3 py-2">
                      <div className="min-w-0 flex-1">
                        {v.note ? (
                          <p className="text-[12px] italic text-[var(--color-muted)]">{v.note}</p>
                        ) : (
                          <p className="text-[12px] text-[var(--color-muted-2)]">Sin nota — solo el versículo.</p>
                        )}
                        <div className="text-[10.5px] text-[var(--color-muted-2)] mt-1 num">{new Date(v.createdAt).toLocaleDateString("es-CO")}</div>
                      </div>
                      <button
                        onClick={() => deleteSaved(v)}
                        aria-label="Eliminar este guardado"
                        className="hit flex h-6 w-6 flex-none items-center justify-center rounded-full text-[var(--color-muted-2)] hover:bg-[var(--color-red)] hover:text-white"
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <Field label="Tu nota">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
                />
              </Field>
              <Button variant="primary" className="w-full mt-3" onClick={saveVerse}>
                Guardar
              </Button>
            </div>
          ) : null}
        </Sheet>
      </div>
    </>
  );
}

function SavedCard({ v, onDelete }: { v: SavedVerseRecord; onDelete: (v: SavedVerseRecord) => void }) {
  return (
    <Card className="panel-surface-glow">
      <div className="flex items-start justify-between gap-2">
        <div className="inline-flex items-center rounded-full border border-[var(--color-red-soft)] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-red)] num">
          {v.bookName} {v.chapter}:{v.verse}
        </div>
        <button
          onClick={() => onDelete(v)}
          aria-label="Eliminar guardado"
          className="hit flex h-6 w-6 flex-none items-center justify-center rounded-full text-[var(--color-muted-2)] hover:bg-[var(--color-red)] hover:text-white"
        >
          <Icon name="close" size={11} />
        </button>
      </div>
      <p className="text-[14px] mt-2.5 leading-relaxed">{v.text}</p>
      {v.note ? <p className="text-[12px] text-[var(--color-muted)] mt-2.5 border-l-2 border-[var(--color-red-soft)] pl-3 italic">{v.note}</p> : null}
      <div className="text-[10.5px] text-[var(--color-muted-2)] mt-2.5 num">{new Date(v.createdAt).toLocaleDateString("es-CO")}</div>
    </Card>
  );
}
