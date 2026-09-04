import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useBible } from "@/hooks/useBible";
import { BIBLE_BOOKS } from "@/data/bible/books";
import { getChapter, chapterCount } from "@/data/bible/loader";
import { Eyebrow, Card, Sheet, Field, Input, Button } from "@/ui";
import { showToast } from "@/ui/Toast";
import { BookPicker } from "./BookPicker";
import { ChapterPicker } from "./ChapterPicker";

type View = "leer" | "guardados";

export function Kairos() {
  const [view, setView] = useState<View>("leer");
  const { bible, loading } = useBible();
  const [abbrev, setAbbrev] = useState("jo");
  const [chapter, setChapter] = useState(1);
  const [pickedVerse, setPickedVerse] = useState<{ verse: number; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");

  const chapters = bible ? chapterCount(bible, abbrev) : 0;
  const verses = bible ? getChapter(bible, abbrev, chapter) : [];
  const bookName = BIBLE_BOOKS.find((b) => b.abbrev === abbrev)?.name ?? abbrev;

  const saved = useLiveQuery(() => db.savedVerses.orderBy("createdAt").reverse().toArray(), []);
  const filteredSaved = useMemo(() => {
    if (!saved) return [];
    const q = query.trim().toLowerCase();
    if (!q) return saved;
    return saved.filter((s) => s.text.toLowerCase().includes(q) || s.note.toLowerCase().includes(q) || s.bookName.toLowerCase().includes(q));
  }, [saved, query]);

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
          <Eyebrow accent>Oración</Eyebrow>
          <h1 className="font-[var(--font-display)] text-xl mt-1.5">Biblia · Reina-Valera 1909</h1>
        </div>

        <div className="flex gap-1 p-1 rounded-full border border-[var(--color-line)]">
          <button
            onClick={() => setView("leer")}
            className={`tap-target flex-1 rounded-full py-2 text-[12px] font-semibold uppercase tracking-wide ${view === "leer" ? "bg-[var(--color-red)] text-black" : "text-[var(--color-muted)]"}`}
          >
            Leer
          </button>
          <button
            onClick={() => setView("guardados")}
            className={`tap-target flex-1 rounded-full py-2 text-[12px] font-semibold uppercase tracking-wide ${view === "guardados" ? "bg-[var(--color-red)] text-black" : "text-[var(--color-muted)]"}`}
          >
            Guardados ({saved?.length ?? 0})
          </button>
        </div>

        {view === "leer" ? (
          loading ? (
            <div className="text-center py-10 text-[13px] text-[var(--color-muted)]">Cargando biblia…</div>
          ) : (
            <>
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
                    <Eyebrow accent>Leyendo</Eyebrow>
                    <div className="text-[16px] font-bold mt-1">
                      {bookName} {chapter}
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--color-muted-2)] num uppercase tracking-wide">{verses.length} versículos</span>
                </div>
                <div className="flex flex-col divide-y divide-[var(--color-line)]">
                  {verses.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => setPickedVerse({ verse: i + 1, text })}
                      className="group flex items-start gap-3 py-3 text-left first:pt-0 last:pb-0"
                    >
                      <span className="num mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[9.5px] font-bold text-[var(--color-red)] transition-colors group-hover:bg-[var(--color-red)] group-hover:text-white">
                        {i + 1}
                      </span>
                      <span className="text-[14px] leading-relaxed text-[rgba(255,255,255,0.82)] transition-colors group-hover:text-[var(--color-ink)]">
                        {text}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Buscar">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Texto, nota o libro…" className="w-full" />
            </Field>
            {filteredSaved.length ? (
              filteredSaved.map((v) => (
                <Card key={v.id} className="panel-surface-glow">
                  <div className="inline-flex items-center rounded-full border border-[var(--color-red-soft)] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-red)] num">
                    {v.bookName} {v.chapter}:{v.verse}
                  </div>
                  <p className="text-[14px] mt-2.5 leading-relaxed">{v.text}</p>
                  {v.note ? (
                    <p className="text-[12px] text-[var(--color-muted)] mt-2.5 border-l-2 border-[var(--color-red-soft)] pl-3 italic">{v.note}</p>
                  ) : null}
                  <div className="text-[10.5px] text-[var(--color-muted-2)] mt-2.5 num">{new Date(v.createdAt).toLocaleDateString("es-CO")}</div>
                </Card>
              ))
            ) : (
              <div className="text-center py-10 text-[13px] text-[var(--color-muted)]">Sin versículos guardados.</div>
            )}
          </div>
        )}

        <Sheet open={!!pickedVerse} onClose={() => setPickedVerse(null)} title="Guardar versículo">
          {pickedVerse ? (
            <div>
              <div className="inline-flex items-center rounded-full border border-[var(--color-red-soft)] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-red)] num">
                {bookName} {chapter}:{pickedVerse.verse}
              </div>
              <p className="text-[13.5px] mt-3 leading-relaxed">{pickedVerse.text}</p>
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
