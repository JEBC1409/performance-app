import { BIBLE_BOOKS } from "./books";

export interface RawBibleBook {
  abbrev: string;
  chapters: string[][]; // chapters[chapterIndex][verseIndex] = text
}

let cache: RawBibleBook[] | null = null;
let inflight: Promise<RawBibleBook[]> | null = null;

export function loadBible(): Promise<RawBibleBook[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/bible/rvr1909.json")
    .then((r) => r.json())
    .then((data: RawBibleBook[]) => {
      cache = data;
      return data;
    });
  return inflight;
}

export function getChapter(bible: RawBibleBook[], abbrev: string, chapter: number): string[] {
  const book = bible.find((b) => b.abbrev === abbrev);
  return book?.chapters[chapter - 1] ?? [];
}

export function chapterCount(bible: RawBibleBook[], abbrev: string): number {
  return bible.find((b) => b.abbrev === abbrev)?.chapters.length ?? 0;
}

/** Deterministic verse of the day: rotates through a curated list of well-known references by day-of-year. */
const VERSE_OF_DAY_REFS: { abbrev: string; chapter: number; verse: number }[] = [
  { abbrev: "jo", chapter: 3, verse: 16 },
  { abbrev: "ps", chapter: 23, verse: 1 },
  { abbrev: "prv", chapter: 3, verse: 5 },
  { abbrev: "is", chapter: 41, verse: 10 },
  { abbrev: "ph", chapter: 4, verse: 13 },
  { abbrev: "rm", chapter: 8, verse: 28 },
  { abbrev: "js", chapter: 1, verse: 9 },
  { abbrev: "gl", chapter: 6, verse: 9 },
  { abbrev: "mt", chapter: 6, verse: 33 },
  { abbrev: "ps", chapter: 46, verse: 1 },
  { abbrev: "prv", chapter: 16, verse: 3 },
  { abbrev: "1co", chapter: 10, verse: 13 },
  { abbrev: "jm", chapter: 1, verse: 2 },
  { abbrev: "hb", chapter: 11, verse: 1 },
  { abbrev: "ps", chapter: 37, verse: 4 },
];

export interface VerseRef {
  abbrev: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export function verseOfDay(bible: RawBibleBook[], date: Date = new Date()): VerseRef | null {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const ref = VERSE_OF_DAY_REFS[dayOfYear % VERSE_OF_DAY_REFS.length];
  const text = getChapter(bible, ref.abbrev, ref.chapter)[ref.verse - 1];
  if (!text) return null;
  const name = BIBLE_BOOKS.find((b) => b.abbrev === ref.abbrev)?.name ?? ref.abbrev;
  return { abbrev: ref.abbrev, bookName: name, chapter: ref.chapter, verse: ref.verse, text };
}
