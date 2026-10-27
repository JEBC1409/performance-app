import { afterEach, describe, expect, it, vi } from "vitest";
import { uuid } from "../uuid";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe("uuid", () => {
  it("uses crypto.randomUUID when it exists", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111" });
    expect(uuid()).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("falls back to getRandomValues (v4 format) when randomUUID is missing", () => {
    const getRandomValues = vi.fn((a: Uint8Array) => {
      a.fill(255);
      return a;
    });
    vi.stubGlobal("crypto", { getRandomValues });
    const id = uuid();
    expect(getRandomValues).toHaveBeenCalled();
    expect(id).toMatch(V4);
    expect(id).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  });

  it("falls back to getRandomValues when randomUUID throws (insecure context)", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        throw new Error("not allowed");
      },
      getRandomValues: (a: Uint8Array) => a.fill(0),
    });
    expect(uuid()).toBe("00000000-0000-4000-8000-000000000000");
  });

  it("uses Math.random as a last resort and still returns a v4 uuid", () => {
    vi.stubGlobal("crypto", undefined);
    const ids = new Set(Array.from({ length: 50 }, () => uuid()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(V4);
  });

  it("works with the real crypto too", () => {
    expect(uuid()).toMatch(V4);
    expect(uuid()).not.toBe(uuid());
  });
});
