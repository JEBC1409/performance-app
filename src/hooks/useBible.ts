import { useEffect, useState } from "react";
import { loadBible, loadVerseOfDay, type RawBibleBook, type VerseRef } from "@/data/bible/loader";

export function useBible(): { bible: RawBibleBook[] | null; loading: boolean } {
  const [bible, setBible] = useState<RawBibleBook[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadBible().then((data) => {
      if (alive) setBible(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { bible, loading: bible === null };
}

/** Today's verse without loading the whole Bible (that stays for Oración). */
export function useVerseOfDay(): VerseRef | null {
  const [verse, setVerse] = useState<VerseRef | null>(null);

  useEffect(() => {
    let alive = true;
    loadVerseOfDay().then((v) => {
      if (alive) setVerse(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  return verse;
}
