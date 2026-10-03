import { beforeEach, describe, expect, it } from "vitest";
import { claimServiceWorkerReload, SW_RELOAD_COOLDOWN_MS } from "../swReload";

beforeEach(() => sessionStorage.clear());

describe("claimServiceWorkerReload", () => {
  it("allows the first reload for a new service worker", () => {
    expect(claimServiceWorkerReload(1_000_000)).toBe(true);
  });

  it("refuses to reload again right away, so a churning worker can't loop the page", () => {
    expect(claimServiceWorkerReload(1_000_000)).toBe(true);
    expect(claimServiceWorkerReload(1_000_000 + 2_000)).toBe(false);
    expect(claimServiceWorkerReload(1_000_000 + SW_RELOAD_COOLDOWN_MS - 1)).toBe(false);
  });

  it("allows another reload once the cooldown has passed (a genuinely newer deploy)", () => {
    expect(claimServiceWorkerReload(1_000_000)).toBe(true);
    expect(claimServiceWorkerReload(1_000_000 + SW_RELOAD_COOLDOWN_MS)).toBe(true);
  });
});
