import { SkeletonCard, SkeletonTiles } from "@/ui/Skeleton";
import { Suspense, lazy, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Shell } from "@/layout/Shell";
import { ToastHost } from "@/ui/Toast";
import { ConfirmHost } from "@/ui/Confirm";
import { readDeepLink } from "@/lib/deepLink";
import { seedIfNeeded } from "@/db/seed";
import { db } from "@/db/db";
import { useReminders } from "@/hooks/useReminders";
import { useFocusWatcher } from "@/hooks/useFocusTimer";
import { useScheduleNotifications } from "@/hooks/useScheduleNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/features/auth/Login";
import { Hoy } from "@/features/hoy/Hoy";
import { FocusPipHost } from "@/features/focus/FocusPip";
import { FocusMiniBar } from "@/features/focus/FocusMiniBar";
import { flushSync } from "react-dom";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
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

const warmScreens = () =>
  Promise.all([
    import("@/features/entreno/Entreno"),
    import("@/features/habitos/Habitos"),
    import("@/features/datos/Datos"),
    import("@/features/horario/Horario"),
    import("@/features/focus/Focus"),
    import("@/features/kairos/Kairos"),
    import("@/features/mouredev/Mouredev"),
    import("@/features/perfil/Perfil"),
  ]).catch(() => {});

function ScreenFallback() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Cargando">
      <SkeletonCard lines={2} />
      <SkeletonTiles count={2} />
    </div>
  );
}

export type Tab = "hoy" | "entreno" | "habitos" | "datos" | "mas" | "horario" | "focus" | "kairos" | "mouredev" | "perfil";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-6" role="status" aria-label="Cargando PERFORMANCE">
      <div className="mx-auto flex max-w-[600px] flex-col gap-4">
        <div className="eyebrow pulse">PERFORMANCE</div>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={3} />
        <SkeletonTiles count={2} />
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

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
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
  useScheduleNotifications();
  useLandingRedirect(!authLoading && !session);

  useEffect(() => {
    seedIfNeeded().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(() => void warmScreens()) : window.setTimeout(() => void warmScreens(), 2500);
    return () => {
      if (!idle) window.clearTimeout(id);
    };
  }, [ready]);

  function startEntreno(day: GymDay, date: string) {
    setAutoStart({ day, date });
    setTab("entreno");
  }

  if (authLoading) return <LoadingScreen />;
  if (!session) {
    const cameFromLanding = new URLSearchParams(window.location.search).has("enter");
    return cameFromLanding ? <Login /> : <LoadingScreen />;
  }
  if (!ready) return <LoadingScreen />;

  return (
    <Shell active={tab} onChange={setTab}>
      <ErrorBoundary
        fallback={() => (
          <div className="panel-surface p-5 text-center" role="alert">
            <div className="eyebrow eyebrow-accent">No se pudo cargar esta pantalla</div>
            <p className="mt-2 text-[13px] text-[var(--color-muted)]">Puede ser la conexión. Tus datos están a salvo.</p>
            <button onClick={() => window.location.reload()} className="glass tap-target mt-4 rounded-full px-6 text-[12px] font-semibold uppercase tracking-[0.1em]">
              Reintentar
            </button>
          </div>
        )}
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
      <ConfirmHost />
      <ToastHost />
    </Shell>
  );
}
