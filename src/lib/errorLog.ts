const KEY = "performance_error_log";
const MAX = 6;

export interface LoggedError {
  at: number;
  msg: string;
  stack?: string;
}

/** Keeps the last few errors in localStorage so /reparar.html (which works even
 * when the app itself won't load) can show what went wrong on this device. */
export function logError(error: unknown, extra?: string): void {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const list = readErrors();
    list.push({ at: Date.now(), msg: (extra ? extra + ": " : "") + e.message.slice(0, 300), stack: e.stack?.split("\n").slice(0, 4).join(" | ").slice(0, 500) });
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* no storage: nothing to keep */
  }
}

export function readErrors(): LoggedError[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
