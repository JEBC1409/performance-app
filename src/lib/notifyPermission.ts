/** Asks for permission to show notifications, whatever the browser's flavour of
 * the API: modern ones return a promise, old Safari returns undefined and takes
 * a callback instead (so `.catch` on the result throws a TypeError). Never
 * throws and never hangs on an old API; resolves to the permission state, or
 * "unsupported" when there are no notifications at all. */
export type NotifyPermission = NotificationPermission | "unsupported";

export function askNotificationPermission(): Promise<NotifyPermission> {
  if (typeof Notification === "undefined" || typeof Notification.requestPermission !== "function") return Promise.resolve("unsupported");
  return new Promise<NotifyPermission>((resolve) => {
    const current = (): NotifyPermission => {
      try {
        return Notification.permission;
      } catch {
        return "default";
      }
    };
    try {
      const done = (p: unknown) => resolve(p === "granted" || p === "denied" || p === "default" ? p : current());
      // The callback form covers old Safari; the return value covers the rest.
      const result = (Notification.requestPermission as (cb?: (p: NotificationPermission) => void) => unknown)(done);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<NotificationPermission>).then(done, () => resolve(current()));
      } else if (result !== undefined) {
        done(result);
      }
    } catch {
      resolve(current());
    }
  });
}
