import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSavedFlash } from "../useSavedFlash";

describe("useSavedFlash", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows the message, then clears it by itself", () => {
    const { result } = renderHook(() => useSavedFlash(1000));
    expect(result.current[0]).toBeNull();
    act(() => result.current[1]("Serie 1 guardada"));
    expect(result.current[0]).toBe("Serie 1 guardada");
    act(() => void vi.advanceTimersByTime(999));
    expect(result.current[0]).toBe("Serie 1 guardada");
    act(() => void vi.advanceTimersByTime(2));
    expect(result.current[0]).toBeNull();
  });

  it("a second save restarts the clock and replaces the text", () => {
    const { result } = renderHook(() => useSavedFlash(1000));
    act(() => result.current[1]("Serie 1 guardada"));
    act(() => void vi.advanceTimersByTime(800));
    act(() => result.current[1]("Serie 2 guardada"));
    act(() => void vi.advanceTimersByTime(800));
    expect(result.current[0]).toBe("Serie 2 guardada");
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current[0]).toBeNull();
  });
});
