import { afterEach, describe, expect, it, vi } from "vitest";
import { askNotificationPermission } from "../notifyPermission";

function stubNotification(requestPermission: unknown, permission: NotificationPermission = "default") {
  vi.stubGlobal("Notification", { permission, requestPermission });
}

afterEach(() => vi.unstubAllGlobals());

describe("askNotificationPermission", () => {
  it("is 'unsupported' where there are no notifications", async () => {
    vi.stubGlobal("Notification", undefined);
    expect(await askNotificationPermission()).toBe("unsupported");
    stubNotification(undefined);
    expect(await askNotificationPermission()).toBe("unsupported");
  });

  it("handles the modern promise API", async () => {
    stubNotification(vi.fn().mockResolvedValue("granted"));
    expect(await askNotificationPermission()).toBe("granted");
  });

  it("handles old Safari: returns undefined and calls the callback (no .catch on undefined)", async () => {
    stubNotification((cb: (p: string) => void) => {
      setTimeout(() => cb("denied"), 0);
      return undefined;
    });
    expect(await askNotificationPermission()).toBe("denied");
  });

  it("handles an API that returns the value directly", async () => {
    stubNotification(() => "granted");
    expect(await askNotificationPermission()).toBe("granted");
  });

  it("never rejects: a rejecting or throwing API falls back to the current permission", async () => {
    stubNotification(vi.fn().mockRejectedValue(new Error("blocked")), "denied");
    expect(await askNotificationPermission()).toBe("denied");
    stubNotification(() => {
      throw new TypeError("boom");
    }, "default");
    expect(await askNotificationPermission()).toBe("default");
  });

  it("ignores garbage answers", async () => {
    stubNotification(vi.fn().mockResolvedValue(undefined), "granted");
    expect(await askNotificationPermission()).toBe("granted");
  });
});
