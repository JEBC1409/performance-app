import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeUtterance {
  text: string;
  voice: unknown;
  lang: string;
  rate: number;
  pitch: number;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

let spoken: FakeUtterance[] = [];
const cancel = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  spoken = [];
  cancel.mockClear();
  class Utter {
    text: string;
    voice: unknown = null;
    lang = "";
    rate = 1;
    pitch = 1;
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal("SpeechSynthesisUtterance", Utter);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      speak: (u: FakeUtterance) => spoken.push(u),
      cancel,
      getVoices: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  // @ts-expect-error cleanup of the stub
  delete window.speechSynthesis;
});

const { useNarrator } = await import("../useNarrator");

const VERSES = ["Uno.", "Dos.", "Tres."];
const flush = () => act(() => void vi.advanceTimersByTime(50));

describe("useNarrator", () => {
  it("reads verse by verse, reporting which one, and finishes once", () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useNarrator(VERSES, "jo:1", onFinish));

    act(() => result.current.play(0));
    flush();
    expect(result.current.status).toBe("playing");
    expect(result.current.current).toBe(0);
    expect(spoken[0].text).toBe("Uno.");
    expect(spoken[0].rate).toBeLessThan(1); // slower than normal by default

    act(() => spoken[0].onend?.());
    flush();
    expect(result.current.current).toBe(1);
    expect(spoken[1].text).toBe("Dos.");

    act(() => spoken[1].onend?.());
    flush();
    act(() => spoken[2].onend?.());
    flush();
    expect(result.current.status).toBe("idle");
    expect(result.current.current).toBe(-1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("pauses where it is and resumes from that verse; a stale end event does nothing", () => {
    const { result } = renderHook(() => useNarrator(VERSES, "jo:1"));
    act(() => result.current.play(1));
    flush();
    const first = spoken[0];

    act(() => result.current.pause());
    expect(result.current.status).toBe("paused");
    expect(result.current.current).toBe(1);
    act(() => first.onend?.()); // the cancelled utterance reports back late
    flush();
    expect(spoken).toHaveLength(1);

    act(() => result.current.play());
    flush();
    expect(spoken[1].text).toBe("Dos.");
  });

  it("skips by verse and stops without calling onFinish", () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useNarrator(VERSES, "jo:1", onFinish));
    act(() => result.current.play(0));
    flush();
    act(() => result.current.next());
    flush();
    expect(result.current.current).toBe(1);
    act(() => result.current.prev());
    flush();
    expect(result.current.current).toBe(0);
    act(() => result.current.stop());
    expect(result.current.status).toBe("idle");
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("goes quiet when the chapter changes", () => {
    const { result, rerender } = renderHook(({ k }) => useNarrator(VERSES, k), { initialProps: { k: "jo:1" } });
    act(() => result.current.play(0));
    flush();
    expect(result.current.status).toBe("playing");
    cancel.mockClear();
    rerender({ k: "jo:2" });
    expect(result.current.status).toBe("idle");
    expect(cancel).toHaveBeenCalled();
  });
});
