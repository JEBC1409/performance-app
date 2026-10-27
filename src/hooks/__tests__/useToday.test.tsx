import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { msUntilNextMidnight, useToday } from "../useToday";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const at = (iso: string) => vi.setSystemTime(new Date(iso));

describe("msUntilNextMidnight", () => {
  it("counts to the next local midnight", () => {
    expect(msUntilNextMidnight(new Date(2026, 9, 27, 23, 59, 50))).toBe(11_000);
    expect(msUntilNextMidnight(new Date(2026, 9, 27, 0, 0, 0))).toBe(24 * 3600 * 1000 + 1000);
  });
});

describe("useToday", () => {
  it("returns today's ISO date", () => {
    at("2026-10-27T10:00:00");
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-27");
  });

  it("rolls over by itself at midnight (23:59:50 → 00:00:20)", () => {
    at("2026-10-27T23:59:50");
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-27");
    act(() => {
      vi.advanceTimersByTime(30_000); // the clock now reads 00:00:20
    });
    expect(result.current).toBe("2026-10-28");
  });

  it("keeps rolling over on the following nights (timer is re-armed)", () => {
    at("2026-10-27T23:59:50");
    const { result } = renderHook(() => useToday());
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current).toBe("2026-10-28");
    act(() => {
      vi.advanceTimersByTime(24 * 3600 * 1000);
    });
    expect(result.current).toBe("2026-10-29");
  });

  it("catches up when the app returns to the foreground the next day", () => {
    at("2026-10-27T22:00:00");
    const { result } = renderHook(() => useToday());
    // A suspended PWA: the clock moved on but no timer ran.
    vi.setSystemTime(new Date("2026-10-28T08:00:00"));
    expect(result.current).toBe("2026-10-27");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe("2026-10-28");
  });

  it.each([
    ["pageshow", () => window.dispatchEvent(new Event("pageshow"))],
    ["focus", () => window.dispatchEvent(new Event("focus"))],
  ])("catches up on %s", (_name, fire) => {
    at("2026-10-27T22:00:00");
    const { result } = renderHook(() => useToday());
    vi.setSystemTime(new Date("2026-10-29T07:00:00"));
    act(() => {
      fire();
    });
    expect(result.current).toBe("2026-10-29");
  });

  it("ignores visibilitychange while the page is hidden", () => {
    at("2026-10-27T22:00:00");
    const { result } = renderHook(() => useToday());
    vi.setSystemTime(new Date("2026-10-28T08:00:00"));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe("2026-10-27");
  });

  it("does not re-render when the day has not changed", () => {
    at("2026-10-27T10:00:00");
    let renders = 0;
    renderHook(() => {
      renders++;
      return useToday();
    });
    const before = renders;
    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(renders).toBe(before);
  });

  it("cleans up its listeners and timer on unmount", () => {
    at("2026-10-27T10:00:00");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useToday());
    unmount();
    expect(remove).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
