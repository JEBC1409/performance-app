import { describe, expect, it } from "vitest";
import { decideBoot, hasStoredSession, type BootInput } from "../bootGate";

const base: BootInput = {
  authLoading: false,
  hasSession: false,
  hasStoredSession: false,
  devSkipAuth: false,
  ready: true,
  cameFromLanding: false,
};
const d = (o: Partial<BootInput>) => decideBoot({ ...base, ...o });

describe("decideBoot", () => {
  it("with a previous session, shows the app as soon as the local data is ready, without waiting for auth", () => {
    expect(d({ authLoading: true, hasStoredSession: true, ready: true })).toEqual({ view: "app", booted: true });
  });

  it("with a previous session but data not ready yet, keeps the loading screen (not booted)", () => {
    expect(d({ authLoading: true, hasStoredSession: true, ready: false })).toEqual({ view: "loading", booted: false });
  });

  it("without evidence of a session, waits for auth and shows nothing of the app", () => {
    expect(d({ authLoading: true, hasStoredSession: false, ready: true })).toEqual({ view: "loading", booted: false });
  });

  it("a confirmed session shows the app once ready", () => {
    expect(d({ hasSession: true, ready: true }).view).toBe("app");
    expect(d({ hasSession: true, ready: false }).view).toBe("loading");
  });

  it("auth answered 'no session' while the stored hint was stale: never the app, even if ready", () => {
    expect(d({ hasStoredSession: true, cameFromLanding: true }).view).toBe("login");
    expect(d({ hasStoredSession: true, cameFromLanding: false }).view).toBe("loading");
  });

  it("signed out and coming from the landing → sign-in form", () => {
    expect(d({ cameFromLanding: true })).toEqual({ view: "login", booted: true });
  });

  it("signed out on a bare URL → loading under the redirect to the landing, but counted as booted", () => {
    expect(d({})).toEqual({ view: "loading", booted: true });
  });

  it("dev bypass shows the app once ready, regardless of auth", () => {
    expect(d({ devSkipAuth: true, authLoading: true, ready: true }).view).toBe("app");
    expect(d({ devSkipAuth: true, ready: false })).toEqual({ view: "loading", booted: false });
  });
});

function fakeStorage(entries: Record<string, string>) {
  const keys = Object.keys(entries);
  return {
    get length() {
      return keys.length;
    },
    key: (n: number) => keys[n] ?? null,
    getItem: (k: string) => entries[k] ?? null,
  };
}

describe("hasStoredSession", () => {
  const session = JSON.stringify({ access_token: "a", refresh_token: "r", expires_at: 1, user: { id: "u" } });

  it("detects a Supabase session saved by a previous sign-in", () => {
    expect(hasStoredSession(fakeStorage({ "sb-abcdef-auth-token": session }))).toBe(true);
  });

  it("understands the older wrapped format", () => {
    expect(hasStoredSession(fakeStorage({ "sb-abcdef-auth-token": JSON.stringify({ currentSession: { refresh_token: "r" } }) }))).toBe(true);
  });

  it("ignores unrelated keys, the PKCE verifier and sessions without a refresh token", () => {
    expect(hasStoredSession(fakeStorage({ theme: "dark", "sb-abcdef-auth-token-code-verifier": session }))).toBe(false);
    expect(hasStoredSession(fakeStorage({ "sb-abcdef-auth-token": JSON.stringify({ access_token: "a" }) }))).toBe(false);
  });

  it("treats corrupt, empty or unreadable storage as no evidence", () => {
    expect(hasStoredSession(fakeStorage({ "sb-abcdef-auth-token": "{not json" }))).toBe(false);
    expect(hasStoredSession(fakeStorage({ "sb-abcdef-auth-token": "null" }))).toBe(false);
    expect(hasStoredSession(fakeStorage({}))).toBe(false);
    expect(hasStoredSession(null)).toBe(false);
    const throwing = {
      length: 1,
      key: () => {
        throw new Error("denied");
      },
      getItem: () => null,
    };
    expect(hasStoredSession(throwing)).toBe(false);
  });

  it("reads the real localStorage by default", () => {
    localStorage.clear();
    expect(hasStoredSession()).toBe(false);
    localStorage.setItem("sb-proj-auth-token", session);
    expect(hasStoredSession()).toBe(true);
    localStorage.clear();
  });
});
