import { describe, expect, it } from "vitest";
import { activeLineIndex, cleanTrack, parseLrc, pickBest } from "../lyrics";

describe("parseLrc", () => {
  it("reads timestamps, ignores metadata and sorts repeated-chorus lines", () => {
    const lines = parseLrc("[ar:Someone]\n[ti:Song]\n[00:10.50] second\n[00:01.00][01:00.25] chorus\n[00:05.5] mid");
    expect(lines).toEqual([
      { t: 1, text: "chorus" },
      { t: 5.5, text: "mid" },
      { t: 10.5, text: "second" },
      { t: 60.25, text: "chorus" },
    ]);
  });

  it("collapses runs of empty lines into one gap and drops a leading one", () => {
    const lines = parseLrc("[00:01.00] \n[00:02.00] a\n[00:03.00]\n[00:04.00]\n[00:05.00] b");
    expect(lines.map((l) => l.text)).toEqual(["a", "", "b"]);
  });

  it("returns nothing for plain text", () => {
    expect(parseLrc("just words\nno stamps")).toEqual([]);
  });
});

describe("activeLineIndex", () => {
  const lines = [
    { t: 5, text: "a" },
    { t: 10, text: "b" },
    { t: 20, text: "c" },
  ];
  it("finds the line being sung", () => {
    expect(activeLineIndex(lines, 0)).toBe(-1);
    expect(activeLineIndex(lines, 5)).toBe(0);
    expect(activeLineIndex(lines, 9.99)).toBe(0);
    expect(activeLineIndex(lines, 10)).toBe(1);
    expect(activeLineIndex(lines, 999)).toBe(2);
    expect(activeLineIndex([], 3)).toBe(-1);
  });
});

describe("cleanTrack", () => {
  it("splits 'Artist - Song' and strips video decoration", () => {
    expect(cleanTrack("The Weeknd - Blinding Lights (Official Video)", "TheWeekndVEVO")).toEqual({ artist: "The Weeknd", track: "Blinding Lights" });
    expect(cleanTrack("Coldplay - Yellow [Lyrics] | HD", "Coldplay")).toEqual({ artist: "Coldplay", track: "Yellow" });
  });

  it("uses the channel as the artist when the title has none, and drops '- Topic'", () => {
    expect(cleanTrack("Yellow", "Coldplay - Topic")).toEqual({ artist: "Coldplay", track: "Yellow" });
  });

  it("keeps meaningful brackets", () => {
    expect(cleanTrack("Artist - Song (feat. Other)", "Artist").track).toBe("Song (feat. Other)");
  });
});

describe("pickBest", () => {
  const lrc = "[00:01.00] hola\n[00:02.00] mundo";
  it("takes the synced result closest in length and name", () => {
    const lines = pickBest(
      [
        { trackName: "Other", artistName: "X", duration: 300, syncedLyrics: "[00:01.00] wrong" },
        { trackName: "Song", artistName: "Artist", duration: 201, syncedLyrics: lrc },
      ],
      "Song",
      "Artist",
      200,
    );
    expect(lines?.map((l) => l.text)).toEqual(["hola", "mundo"]);
  });

  it("refuses a version whose length is far off, instrumentals and unsynced results", () => {
    expect(pickBest([{ trackName: "Song", duration: 400, syncedLyrics: lrc }], "Song", "", 200)).toBeNull();
    expect(pickBest([{ trackName: "Song", duration: 200, instrumental: true, syncedLyrics: lrc }], "Song", "", 200)).toBeNull();
    expect(pickBest([{ trackName: "Song", duration: 200, syncedLyrics: null }], "Song", "", 200)).toBeNull();
  });

  it("still matches by name when the player hasn't reported the length yet", () => {
    expect(pickBest([{ trackName: "Song", duration: 123, syncedLyrics: lrc }], "Song", "", 0)).not.toBeNull();
  });
});
