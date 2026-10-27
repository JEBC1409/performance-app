const KEY = "performance_persist_asked";

let askedThisSession = false;

/** Asks the browser not to evict this app's IndexedDB under storage pressure
 * (Safari in particular clears the data of sites it considers idle). Fire and
 * forget: asked at most once per session, the answer is kept in localStorage
 * under `performance_persist_asked` ("1" granted, "0" refused) for diagnostics,
 * and nothing here ever throws. Resolves to whether storage is persistent. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (askedThisSession) return false;
  askedThisSession = true;
  try {
    const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
    if (!storage || typeof storage.persist !== "function") return false;
    if (typeof storage.persisted === "function" && (await storage.persisted())) {
      remember("1");
      return true;
    }
    const granted = await storage.persist();
    remember(granted ? "1" : "0");
    return granted === true;
  } catch {
    return false;
  }
}

function remember(value: string): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* no storage: nothing to keep */
  }
}

/** For tests: forget that this session already asked. */
export function resetPersistentStorageAsk(): void {
  askedThisSession = false;
}
