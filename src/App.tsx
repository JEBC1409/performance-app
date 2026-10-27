import { SkeletonCard, SkeletonTiles } from "@/ui/Skeleton";
import { Suspense, lazy, useEffect, useState, useSyncExternalStore } from "react";
import { isDbBlocked, subscribeDbBlocked } from "@/db/dbStatus";
import { useLiveQuery } from "dexie-react-hooks";
import { Shell } from "@/layout/Shell";
import { ToastHost } from "@/ui/Toast";
import { ConfirmHost } from "@/ui/Confirm";
import { readDeepLink } from "@/lib/deepLink";
import { startJarvisLink } from "@/lib/jarvisLink";
import { Guide } from "@/features/onboarding/Guide";
import { seedIfNeeded } from "@/db/seed";
import { db } from "@/db/db";
import { useReminders } from "@/hooks/useReminders";
import { useFocusWatcher } from "@/hooks/useFocusTimer";
import { useRestWatcher } from "@/hooks/useRestWatcher";
import { RestTimer } from "@/features/entreno/RestTimer";
import { useRestTimer } from "@/features/entreno/useRestTimer";
import { useScheduleNotifications } from "@/hooks/useScheduleNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useToday } from "@/hooks/useToday";
import { decideBoot, hasStoredSession } from "@/layout/bootGate";
import { Login } from "@/features/auth/Login";
import { Hoy } from "@/features/hoy/Hoy";
import { FocusPipHost } from "@/features/focus/FocusPip";
import { FocusMiniBar } from "@/features/focus/FocusMiniBar";
import { MusicHost } from "@/features/focus/MusicHost";
import { flushSync } from "react-dom";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import { ScreenError } from "@/ui/ScreenError";
import type { GymDay } from "@/lib/cycle";

// Every screen except Hoy loads on first visit, so the first paint ships far
// less code. They are warmed in the background once the app is idle.
const Entreno = lazy(() => import("@/features/entreno/Entreno").then((m) => ({ default: m.Entreno })));
const Habitos = lazy(() => import("@/features/habitos/Habitos").then((m) => ({ default: m.Habitos })));
const Datos = lazy(() => import("@/features/datos/Datos").then((m) => ({ default: m.Datos })));
const Horario = lazy(() => import("@/features/horario/Horario").then((m) => ({ default: m.Horario })));
const Focus = lazy(() => import("@/features/focus/Focus").then((m) => ({ default: m.Focus })));
const Kairos = lazy(() => import("@/features/kairos/Kairos").then((m) => ({ default: m.Kairos })));
const Mouredev = lazy(() => import("@/features/mouredev/Mouredev").then((m) => ({ default: m.Mouredev })));
const Perfil = lazy(() => import("@/features/perfil/Perfil").then((m) => ({ default: m.Perfil })));

// Only the two screens opened most often, a few seconds after the app is up (so it
// never competes with boot or the first sync) and never on Data Saver. The rest load
// on first visit, as lazy chunks.
const WARM_DELAY_MS = 4000;
const warmScreens = () =>
  Promise.all([import("@/features/entreno/Entreno"), import("@/features/habitos/Habitos")]).catch(() => {});
const saveDataOn = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

function ScreenFallback() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Cargando">
      <SkeletonCard lines={2} />
      <SkeletonTiles count={2} />
    </div>
  );
}

/** Dev-only: `VITE_DEV_SKIP_AUTH=1 npm run dev` shows the app without signing in, for checking screens. Compiled out of production builds. */
const DEV_SKIP_AUTH = import.meta.env.DEV && import.meta.env.VITE_DEV_SKIP_AUTH === "1";

export type Tab = "hoy" | "entreno" | "habitos" | "datos" | "mas" | "horario" | "focus" | "kairos" | "mouredev" | "perfil";

function LoadingScreen() {
  const blocked = useSyncExternalStore(subscribeDbBlocked, isDbBlocked, isDbBlocked);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-6" role="status" aria-label="Cargando PERFORMANCE">
      <div className="mx-auto flex max-w-[600px] flex-col gap-4">
        <div className="eyebrow pulse">PERFORMANCE</div>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={3} />
        <SkeletonTiles count={2} />
        {blocked || slow ? (
          <div className="panel-surface p-4 text-center" role="alert">
            <p className="text-[13px] text-[var(--color-ink)]">
              {blocked ? "Hay otra ventana de la app abierta que bloquea la actualización." : "Está tardando más de lo normal."}
            </p>
            <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
              {blocked
                ? "Cierra las demás pestañas o la app instalada (deslízala fuera de las recientes) y reintenta. Tus datos están a salvo."
                : "Revisa tu conexión y reintenta. Tus datos están a salvo en este dispositivo."}
            </p>
            <button onClick={() => window.location.reload()} className="glass tap-target mt-3 rounded-full px-6 text-[12px] font-semibold uppercase tracking-[0.1em]">
              Reintentar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The Dr. Discipline landing (public/dr-discipline/) is the app's presentation layer:
 * logged-out visitors land there first, and its CTAs link to /?enter=1 to reach this
 * login screen directly. Bookmarking / refreshing "/" while logged out sends you back
 * to the landing rather than dropping you straight on the OTP form. */
function useLandingRedirect(shouldRedirect: boolean) {
  useEffect(() => {
    if (!shouldRedirect) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("enter")) {
      window.location.replace("/dr-discipline/index.html");
    }
  }, [shouldRedirect]);
}

/** The rest countdown, on whichever screen you are: it keeps running when you leave Entreno. */
function RestPill() {
  const timer = useRestTimer();
  return <RestTimer timer={timer} />;
}

export default function App() {
  const { session, loading: authLoading, offlineTrusted } = useAuth();
  const [ready, setReady] = useState(false);
  // The day, kept current: when it changes (app reopened next morning, or midnight
  // passes) the screens below remount, so none of them keeps showing "yesterday".
  const today = useToday();
  // Evidence of a previous sign-in on this device, read once: local-first boot (see bootGate).
  const [storedSession] = useState(hasStoredSession);
  const [tab, setTabRaw] = useState<Tab>(() => {
    const linked = readDeepLink(window.location.search);
    if (linked) {
      // Keep "?enter" (the app gate) but drop the one-shot "go".
      const url = new URL(window.location.href);
      url.searchParams.delete("go");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    return linked ?? "hoy";
  });
  // Screens cross-fade/slide where the browser supports View Transitions.
  const setTab = (next: Tab) => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    type VT = { ready?: Promise<unknown>; finished?: Promise<unknown>; updateCallbackDone?: Promise<unknown> };
    const start = (document as Document & { startViewTransition?: (cb: () => void) => VT }).startViewTransition;
    if (typeof start === "function" && !reduce && next !== tab && document.visibilityState === "visible") {
      const vt = start.call(document, () => flushSync(() => setTabRaw(next)));
      // A transition can be skipped (tab hidden, another one started): that is fine, not an error.
      vt.ready?.catch(() => {});
      vt.finished?.catch(() => {});
      vt.updateCallbackDone?.catch(() => {});
    } else setTabRaw(next);
  };
  const [autoStart, setAutoStart] = useState<{ day: GymDay; date: string } | null>(null);
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  useReminders(settings);
  useFocusWatcher();
  useRestWatcher();
  useScheduleNotifications();
  useLandingRedirect(!authLoading && !session && !offlineTrusted);

  useEffect(() => {
    seedIfNeeded().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || saveDataOn()) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => void warmScreens());
      else void warmScreens();
    }, WARM_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
    };
  }, [ready]);

  // Voice link to JARVIS (the desktop assistant): lets it open screens, run the
  // Focus timer and log sets or habits. Only once signed in and seeded.
  useEffect(() => {
    if (!session || !ready) return;
    return startJarvisLink({ navigate: setTab });
    // setTab is recreated every render and only reads the current tab to skip a no-op.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, ready]);

  function startEntreno(day: GymDay, date: string) {
    setAutoStart({ day, date });
    setTab("entreno");
  }

  // Local-first boot: with evidence of a previous sign-in the app opens from its local
  // data as soon as it is seeded, instead of waiting for Supabase (which, with an expired
  // token and no network, retried for ~26 s). Without evidence nothing of the app shows.
  const boot = decideBoot({
    authLoading,
    hasSession: Boolean(session) || offlineTrusted,
    hasStoredSession: storedSession,
    devSkipAuth: DEV_SKIP_AUTH,
    ready,
    cameFromLanding: new URLSearchParams(window.location.search).has("enter"),
  });

  // Tells public/boot-watchdog.js the app got past its loading screens.
  useEffect(() => {
    if (boot.booted) document.documentElement.dataset.booted = "1";
  }, [boot.booted]);

  if (boot.view === "loading") return <LoadingScreen />;
  if (boot.view === "login") return <Login />;

  return (
    <Shell active={tab} onChange={setTab}>
      {/* keyed by screen (one that crashes must not leave every other screen showing its error)
          and by day (a new day remounts the screen so it re-reads "today") */}
      <ErrorBoundary
        key={`${tab}:${today}`}
        fallback={(reset, error) => <ScreenError error={error} reset={reset} />}
      >
      <Suspense fallback={<ScreenFallback />}>
      {tab === "hoy" ? <Hoy onStartEntreno={startEntreno} onNavigate={setTab} /> : null}
      {tab === "entreno" ? <Entreno autoStart={autoStart} onConsumeAutoStart={() => setAutoStart(null)} /> : null}
      {tab === "habitos" ? <Habitos /> : null}
      {tab === "datos" ? <Datos /> : null}
      {tab === "horario" ? <Horario /> : null}
      {tab === "focus" ? <Focus /> : null}
      {tab === "kairos" ? <Kairos /> : null}
      {tab === "mouredev" ? <Mouredev /> : null}
      {tab === "perfil" ? <Perfil /> : null}
      </Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={() => null}>
        <FocusPipHost />
      </ErrorBoundary>
      <ErrorBoundary fallback={() => null}>
        <FocusMiniBar visible={tab !== "focus"} onOpen={() => setTab("focus")} />
      </ErrorBoundary>
      <ErrorBoundary fallback={() => null}>
        <RestPill />
      </ErrorBoundary>
      <ErrorBoundary fallback={() => null}>
        <MusicHost />
      </ErrorBoundary>
      <Guide onNavigate={setTab} />
      <ConfirmHost />
      <ToastHost />
    </Shell>
  );
}
