/** Throws away what the app downloaded (service workers and their caches — never
 * the data in IndexedDB / localStorage) and reloads, so a phone stuck on a stale
 * build, or a screen whose code never arrived, fetches everything fresh. */
export async function repairAndReload(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* no service worker support: nothing to clear */
  }
  try {
    const keys = (await window.caches?.keys?.()) ?? [];
    await Promise.all(keys.map((k) => window.caches.delete(k)));
  } catch {
    /* no Cache Storage: nothing to clear */
  }
  window.location.reload();
}
