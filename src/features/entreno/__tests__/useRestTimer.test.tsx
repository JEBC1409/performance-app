import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { skipRest } from "@/lib/restTimer";
import { useRestTimer } from "../useRestTimer";

afterEach(() => skipRest());

describe("useRestTimer", () => {
  it("keeps running when the screen that started it goes away", () => {
    const first = renderHook(() => useRestTimer());
    act(() => first.result.current.start(90));
    expect(first.result.current.running).toBe(true);
    expect(first.result.current.remaining).toBeGreaterThan(85);

    // leaving Entreno unmounts its hook; the rest must still be there for the next reader
    first.unmount();
    const second = renderHook(() => useRestTimer());
    expect(second.result.current.running).toBe(true);
    expect(second.result.current.total).toBe(90);
  });

  it("adds time and can be skipped", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => result.current.start(60));
    act(() => result.current.addTime(30));
    expect(result.current.total).toBe(90);
    act(() => result.current.skip());
    expect(result.current.running).toBe(false);
    expect(result.current.remaining).toBe(0);
  });
});
