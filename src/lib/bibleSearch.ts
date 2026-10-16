import type { RawBibleBook } from "@/data/bible/loader";
import { BIBLE_BOOKS } from "@/data/bible/books";

export interface SearchHit {
  abbrev: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export const MIN_QUERY_CHARS = 3;

/** Lower case, no accents: "Él" finds "el", "fué" finds "fue". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// The Bible is searched often while typing: normalise each verse once.
const normalized = new WeakMap<RawBibleBook[], string[][][]>();
function normalizedText(bible: RawBibleBook[]): string[][][] {
  let n = normalized.get(bible);
  if (!n) {
    n = bible.map((b) => b.chapters.map((c) => c.map(normalize)));
    normalized.set(bible, n);
  }
  return n;
}

/** Verses containing every word of the query, in Bible order. `total` counts all
 * matches even though only the first `limit` come back. */
export function searchBible(bible: RawBibleBook[], query: string, limit = 60): { hits: SearchHit[]; total: number } {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (normalize(query).replace(/\s+/g, "").length < MIN_QUERY_CHARS) return { hits: [], total: 0 };
  const names = new Map(BIBLE_BOOKS.map((b) => [b.abbrev, b.name]));
  const norm = normalizedText(bible);
  const hits: SearchHit[] = [];
  let total = 0;
  bible.forEach((book, bi) => {
    book.chapters.forEach((chapter, ci) => {
      chapter.forEach((text, vi) => {
        const hay = norm[bi][ci][vi];
        if (!words.every((w) => hay.includes(w))) return;
        total++;
        if (hits.length < limit) hits.push({ abbrev: book.abbrev, bookName: names.get(book.abbrev) ?? book.abbrev, chapter: ci + 1, verse: vi + 1, text });
      });
    });
  });
  return { hits, total };
}
