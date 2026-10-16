import { describe, expect, it } from "vitest";
import { OFFSET_LIMIT, formatOffset, getLyricsOffset, setLyricsOffset } from "../lyricsOffset";

describe("lyrics offset", () => {
  it("remembers a nudge per song, in half-second steps, and forgets it at zero", () => {
    expect(getLyricsOffset("abc")).toBe(0);
    setLyricsOffset("abc", 0.5);
    setLyricsOffset("abc", 1.0);
    expect(getLyricsOffset("abc")).toBe(1);
    expect(getLyricsOffset("other")).toBe(0);
    setLyricsOffset("abc", 0);
    expect(getLyricsOffset("abc")).toBe(0);
    expect(JSON.parse(localStorage.getItem("performance_lyrics_offset_v1") ?? "{}")).toEqual({});
  });

  it("snaps to the step and stays within the limit", () => {
    setLyricsOffset("x", 0.7);
    expect(getLyricsOffset("x")).toBe(0.5);
    setLyricsOffset("x", 999);
    expect(getLyricsOffset("x")).toBe(OFFSET_LIMIT);
    setLyricsOffset("x", -999);
    expect(getLyricsOffset("x")).toBe(-OFFSET_LIMIT);
    setLyricsOffset("x", 0);
  });

  it("ignores a song with no id and formats the value", () => {
    setLyricsOffset("", 2);
    expect(getLyricsOffset("")).toBe(0);
    expect(formatOffset(0)).toBe("0 s");
    expect(formatOffset(1.5)).toBe("+1.5 s");
    expect(formatOffset(-0.5)).toBe("−0.5 s");
  });
});
