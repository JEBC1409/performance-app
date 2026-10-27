import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestPersistentStorage, resetPersistentStorageAsk } from "../storage";

const KEY = "performance_persist_asked";

function stubStorage(storage: unknown) {
  vi.stubGlobal("navigator", { ...navigator, storage });
}

beforeEach(() => {
  localStorage.clear();
  resetPersistentStorageAsk();
});
afterEach(() => vi.unstubAllGlobals());

describe("requestPersistentStorage", () => {
  it("asks the browser and remembers a yes", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    stubStorage({ persist, persisted: vi.fn().mockResolvedValue(false) });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(KEY)).toBe("1");
  });

  it("remembers a no", async () => {
    stubStorage({ persist: vi.fn().mockResolvedValue(false) });
    expect(await requestPersistentStorage()).toBe(false);
    expect(localStorage.getItem(KEY)).toBe("0");
  });

  it("asks only once per session", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    stubStorage({ persist });
    await requestPersistentStorage();
    await requestPersistentStorage();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("doesn't ask again when storage is already persistent", async () => {
    const persist = vi.fn();
    stubStorage({ persist, persisted: vi.fn().mockResolvedValue(true) });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBe("1");
  });

  it("never throws: no API, a rejecting API, or a throwing one", async () => {
    stubStorage(undefined);
    expect(await requestPersistentStorage()).toBe(false);
    resetPersistentStorageAsk();
    stubStorage({ persist: vi.fn().mockRejectedValue(new Error("nope")) });
    expect(await requestPersistentStorage()).toBe(false);
    resetPersistentStorageAsk();
    stubStorage({
      persist: () => {
        throw new Error("sync boom");
      },
    });
    expect(await requestPersistentStorage()).toBe(false);
  });

  it("still works when localStorage is unavailable", async () => {
    stubStorage({ persist: vi.fn().mockResolvedValue(true) });
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(await requestPersistentStorage()).toBe(true);
    spy.mockRestore();
  });
});
