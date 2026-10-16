import { describe, expect, it } from "vitest";
import { normalize, searchBible } from "../bibleSearch";
import { CONFIG_BIBLE_HIGHLIGHTS, sanitizeHighlights, verseKey, withHighlight } from "../bibleHighlights";

const BIBLE = [
  { abbrev: "gn", chapters: [["En el principio creó Dios los cielos y la tierra.", "Y la tierra estaba desordenada y vacía."]] },
  { abbrev: "jo", chapters: [["EN el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.", "Este era en el principio con Dios."]] },
];

describe("bible search", () => {
  it("ignores case and accents", () => {
    expect(normalize("Él FUÉ")).toBe("el fue");
    expect(searchBible(BIBLE, "creo").hits).toHaveLength(1);
    expect(searchBible(BIBLE, "CREÓ").hits[0]).toMatchObject({ abbrev: "gn", chapter: 1, verse: 1, bookName: "Génesis" });
  });

  it("needs every word and returns Bible order", () => {
    const r = searchBible(BIBLE, "principio dios");
    expect(r.hits.map((h) => `${h.abbrev} ${h.verse}`)).toEqual(["gn 1", "jo 1", "jo 2"]);
    expect(searchBible(BIBLE, "principio verbo").hits).toHaveLength(1);
  });

  it("returns nothing for a too-short query and caps the list but not the count", () => {
    expect(searchBible(BIBLE, "de").total).toBe(0);
    const r = searchBible(BIBLE, "principio", 2);
    expect(r.hits).toHaveLength(2);
    expect(r.total).toBe(3);
  });
});

describe("highlights", () => {
  it("cleans stored data and adds/removes a colour", () => {
    expect(sanitizeHighlights({ "jo.3.16": "amarillo", "jo.3.17": "fucsia", bad: "azul", "x.1": "verde" })).toEqual({ "jo.3.16": "amarillo" });
    expect(sanitizeHighlights(null)).toEqual({});
    const a = withHighlight({}, verseKey("jo", 3, 16), "rosa");
    expect(a).toEqual({ "jo.3.16": "rosa" });
    expect(withHighlight(a, "jo.3.16", null)).toEqual({});
    expect(CONFIG_BIBLE_HIGHLIGHTS).toBe("bible_highlights");
  });
});
