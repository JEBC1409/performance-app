export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Styles the confirm button as a destructive action. */
  danger?: boolean;
}

export interface ConfirmPending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let host: ((p: ConfirmPending) => void) | null = null;

/** Called by the mounted ConfirmHost; returns its unregister function. */
export function registerConfirmHost(fn: (p: ConfirmPending) => void): () => void {
  host = fn;
  return () => {
    if (host === fn) host = null;
  };
}

/** Asks the user to confirm, in-app (a sheet, not the browser's dialog).
 * Resolves true if they confirm. Without a mounted host (tests, early boot)
 * it falls back to window.confirm. */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  if (!host) return Promise.resolve(typeof window !== "undefined" && window.confirm(`${opts.title}${opts.message ? `

${opts.message}` : ""}`));
  return new Promise<boolean>((resolve) => host?.({ ...opts, resolve }));
}
