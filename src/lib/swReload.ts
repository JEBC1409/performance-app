const KEY = "performance_sw_reload_at";
/** A new service worker taking over needs exactly one reload. If we already
 * reloaded for one this recently, another controllerchange means something is
 * churning workers (two deployments alternating, a stuck update…) — reloading
 * again would just spin the page forever, so we stop and let it run. */
export const SW_RELOAD_COOLDOWN_MS = 30_000;

/** True when it's fine to reload for a service-worker takeover; records the attempt. */
export function claimServiceWorkerReload(now: number = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY));
    if (Number.isFinite(last) && last > 0 && now - last < SW_RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(KEY, String(now));
  } catch {
    /* no sessionStorage: fall back to the once-per-page-load guard in main.tsx */
  }
  return true;
}
