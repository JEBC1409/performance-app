/** Keeps the screen on while `hold()` is active (training screen), best-effort:
 * unsupported browsers just let the screen sleep. Re-acquires after the tab
 * comes back to the front, since the browser drops the lock when it's hidden. */
export function holdScreenAwake(): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let stopped = false;

  async function acquire() {
    try {
      if (stopped || !("wakeLock" in navigator)) return;
      sentinel = await navigator.wakeLock.request("screen");
    } catch {
      /* denied (low battery, no gesture…) — carry on without it */
    }
  }
  const onVisible = () => {
    if (document.visibilityState === "visible") void acquire();
  };

  void acquire();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    void sentinel?.release().catch(() => {});
  };
}
