import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useBible } from "@/hooks/useBible";
import { BIBLE_BOOKS } from "@/data/bible/books";
import { getChapter, chapterCount } from "@/data/bible/loader";
import { Eyebrow, Card, Sheet, Field, Select, Button } from "@/ui";
import { showToast } from "@/ui/Toast";

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
    <div className="flex flex-col gap-4 enter">
      <div>
        <Eyebrow>Kairos</Eyebrow>
        <h1 className="font-[var(--font-display)] text-xl mt-1.5">Biblia · Reina-Valera 1909</h1>
      </div>

      <div className="flex border border-[var(--color-line)]">
        <button
          onClick={() => setView("leer")}
          className={`tap-target flex-1 py-2.5 text-[12px] font-semibold uppercase tracking-wide ${view === "leer" ? "bg-[var(--color-red)] text-black" : "text-[var(--color-muted)]"}`}
        >
          Leer
        </button>
        <button
          onClick={() => setView("guardados")}
          className={`tap-target flex-1 py-2.5 text-[12px] font-semibold uppercase tracking-wide ${view === "guardados" ? "bg-[var(--color-red)] text-black" : "text-[var(--color-muted)]"}`}
        >
          Guardados ({saved?.length ?? 0})
        </button>
      </div>

      {view === "leer" ? (
        loading ? (
          <div className="text-center py-10 text-[13px] text-[var(--color-muted)]">Cargando biblia…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Libro">
                <Select
                  value={abbrev}
                  onChange={(e) => {
                    setAbbrev(e.target.value);
                    setChapter(1);
                  }}
                >
                  <optgroup label="Antiguo Testamento">
                    {BIBLE_BOOKS.filter((b) => b.testament === "AT").map((b) => (
                      <option key={b.abbrev} value={b.abbrev}>
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Nuevo Testamento">
                    {BIBLE_BOOKS.filter((b) => b.testament === "NT").map((b) => (
                      <option key={b.abbrev} value={b.abbrev}>
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </Field>
              <Field label="Capítulo">
                <Select value={chapter} onChange={(e) => setChapter(Number(e.target.value))}>
                  {Array.from({ length: chapters }, (_, i) => i + 1).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Card>
              <div className="text-[13px] font-semibold mb-3">
                {bookName} {chapter}
              </div>
              <div className="flex flex-col gap-2.5">
                {verses.map((text, i) => (
                  <button key={i} onClick={() => setPickedVerse({ verse: i + 1, text })} className="text-left group">
                    <span className="num text-[10.5px] text-[var(--color-red)] mr-1.5 align-top">{i + 1}</span>
                    <span className="text-[13.5px] leading-relaxed group-hover:text-[var(--color-ink)] text-[rgba(255,255,255,0.82)]">{text}</span>
                  </button>
                ))}
              </div>
            </Card>
          </>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <Field label="Buscar">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Texto, nota o libro…"
              className="bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
            />
          </Field>
          {filteredSaved.length ? (
            filteredSaved.map((v) => (
              <Card key={v.id}>
                <div className="text-[11px] text-[var(--color-red)] num font-semibold uppercase tracking-wide">
                  {v.bookName} {v.chapter}:{v.verse}
                </div>
                <p className="text-[13px] mt-1.5 leading-relaxed">{v.text}</p>
                {v.note ? <p className="text-[12px] text-[var(--color-muted)] mt-2 border-l-2 border-[var(--color-line-strong)] pl-2.5">{v.note}</p> : null}
                <div className="text-[10.5px] text-[var(--color-muted-2)] mt-2 num">{new Date(v.createdAt).toLocaleDateString("es-CO")}</div>
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
            <div className="text-[11px] text-[var(--color-red)] num font-semibold uppercase tracking-wide">
              {bookName} {chapter}:{pickedVerse.verse}
            </div>
            <p className="text-[13.5px] mt-2 leading-relaxed">{pickedVerse.text}</p>
            <Field label="Tu nota">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1 w-full bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
              />
            </Field>
            <Button variant="primary" className="w-full mt-3" onClick={saveVerse}>
              Guardar
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
