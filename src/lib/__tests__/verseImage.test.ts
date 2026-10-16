import { describe, expect, it } from "vitest";
import { wrapText } from "../verseImage";

const measure = (s: string) => s.length * 10; // 10 px per character

describe("wrapText", () => {
  it("breaks at word boundaries within the width", () => {
    expect(wrapText("Porque de tal manera amó Dios al mundo", 150, measure)).toEqual(["Porque de tal", "manera amó Dios", "al mundo"]);
  });

  it("keeps a word longer than the line on its own line", () => {
    expect(wrapText("a supercalifragilistico b", 60, measure)).toEqual(["a", "supercalifragilistico", "b"]);
  });

  it("handles empty text and extra spaces", () => {
    expect(wrapText("   ", 100, measure)).toEqual([]);
    expect(wrapText("uno   dos", 1000, measure)).toEqual(["uno dos"]);
  });
});
