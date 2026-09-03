import { useEffect, useState } from "react";
import { loadBible, type RawBibleBook } from "@/data/bible/loader";

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
