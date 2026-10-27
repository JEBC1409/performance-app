/**
 * What the app shows while it boots. The app is local-first: the data lives on the
 * device, so a person who signed in before must not stare at a loading screen (or a
 * dead one, offline) while Supabase tries to refresh an expired token. Pure on
 * purpose, so the rule is testable without React or a network.
 */

export type BootView = "loading" | "login" | "app";

export interface BootInput {
  /** Supabase has not told us yet whether there is a session. */
  authLoading: boolean;
  /** A confirmed session (set once Supabase answers or signs in). */
  hasSession: boolean;
  /** Evidence of a previous sign-in on this device (see hasStoredSession). */
  hasStoredSession: boolean;
  /** Dev-only bypass (VITE_DEV_SKIP_AUTH=1). */
  devSkipAuth: boolean;
  /** The local database is seeded and readable. */
  ready: boolean;
  /** The URL carries "?enter": the visitor came from the landing's call to action. */
  cameFromLanding: boolean;
}

export interface BootDecision {
  view: BootView;
  /** Tells public/boot-watchdog.js the app got past its loading screens. */
  booted: boolean;
}

export function decideBoot(i: BootInput): BootDecision {
  let view: BootView;
  if (i.devSkipAuth || i.hasSession) {
    view = i.ready ? "app" : "loading";
  } else if (i.authLoading) {
    // Unknown session. Evidence of a previous sign-in means the data on this device is
    // theirs: show it now and let auth settle in the background. No evidence: wait.
    view = i.hasStoredSession && i.ready ? "app" : "loading";
  } else {
    // Auth answered: no session. From the landing → sign-in form; otherwise the page
    // is redirecting to the landing, so keep the loading screen under it.
    view = i.cameFromLanding ? "login" : "loading";
  }
  // Signed-out visitors being redirected to the landing also count as booted.
  const booted = view !== "loading" || (!i.authLoading && !i.hasSession && !i.devSkipAuth);
  return { view, booted };
}

const SESSION_KEY = /^sb-.+-auth-token$/;

type StorageLike = Pick<Storage, "length" | "key" | "getItem">;

/**
 * True when localStorage holds a Supabase session saved by a previous sign-in
 * (`sb-<project>-auth-token` with a refresh token). It is only a hint for showing
 * local data sooner: Supabase still decides whether the session is valid, and a
 * revoked one sends the person to the sign-in screen as before. Never throws.
 */
export function hasStoredSession(storage: StorageLike | null | undefined = safeStorage()): boolean {
  if (!storage) return false;
  try {
    for (let n = 0; n < storage.length; n++) {
      const key = storage.key(n);
      if (!key || !SESSION_KEY.test(key)) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (carriesRefreshToken(parsed)) return true;
    }
  } catch {
    // unreadable storage or corrupt JSON: no evidence
  }
  return false;
}

function carriesRefreshToken(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as { refresh_token?: unknown; currentSession?: unknown };
  if (typeof o.refresh_token === "string" && o.refresh_token.length > 0) return true;
  return carriesRefreshToken(o.currentSession);
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
