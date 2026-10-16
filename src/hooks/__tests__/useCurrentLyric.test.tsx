import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let state = { started: true, playing: true, videoId: "vid1", title: "T", author: "A" };
let now = 0;
const ticks = new Set<() => void>();
let lyrics: { status: string; lines: { t: number; text: string }[] } = { status: "found", lines: [] };

vi.mock("@/lib/focusMusic", () => ({
  getMusicState: () => state,
  subscribeMusic: () => () => {},
  getMusicTime: () => ({ t: now, duration: 200 }),
}));
vi.mock("@/lib/ticker", () => ({
  subscribeTick: (cb: () => void) => {
    ticks.add(cb);
    return () => ticks.delete(cb);
  },
}));
vi.mock("@/hooks/useLyrics", () => ({ useLyrics: () => lyrics }));

const { useCurrentLyric } = await import("../useCurrentLyric");

const LINES = [
  { t: 5, text: "primera" },
  { t: 10, text: "" },
  { t: 15, text: "tercera" },
];
const tick = () => act(() => ticks.forEach((t) => t()));

beforeEach(() => {
  state = { started: true, playing: true, videoId: "vid1", title: "T", author: "A" };
  lyrics = { status: "found", lines: LINES };
  now = 0;
  ticks.clear();
  localStorage.removeItem("performance_focus_lyrics_v1");
});

describe("useCurrentLyric", () => {
  it("follows the song: nothing before the first line, then the line being sung, ♪ in a gap", () => {
    const { result } = renderHook(() => useCurrentLyric());
    expect(result.current).toBeNull();
    now = 6;
    tick();
    expect(result.current).toBe("primera");
    now = 11;
    tick();
    expect(result.current).toBe("♪");
    now = 16;
    tick();
    expect(result.current).toBe("tercera");
  });

  it("is null when the music is paused, the lyrics were not found, or they are turned off", () => {
    now = 6;
    state = { ...state, playing: false };
    expect(renderHook(() => useCurrentLyric()).result.current).toBeNull();

    state = { ...state, playing: true };
    lyrics = { status: "none", lines: [] };
    expect(renderHook(() => useCurrentLyric()).result.current).toBeNull();

    lyrics = { status: "found", lines: LINES };
    localStorage.setItem("performance_focus_lyrics_v1", "0");
    // the preference store reads its stored value at load; flip it through the setter
    return import("@/lib/lyricsPref").then(({ setLyricsPref }) => {
      setLyricsPref(false);
      expect(renderHook(() => useCurrentLyric()).result.current).toBeNull();
      setLyricsPref(true);
    });
  });
});
