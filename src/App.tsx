import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Shell } from "@/layout/Shell";
import { ToastHost } from "@/ui/Toast";
import { seedIfNeeded } from "@/db/seed";
import { db } from "@/db/db";
import { useReminders } from "@/hooks/useReminders";
import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/features/auth/Login";
import { Hoy } from "@/features/hoy/Hoy";
import { Entreno } from "@/features/entreno/Entreno";
import { Habitos } from "@/features/habitos/Habitos";
import { Datos } from "@/features/datos/Datos";
import { Horario } from "@/features/horario/Horario";
import { Kairos } from "@/features/kairos/Kairos";
import { Mouredev } from "@/features/mouredev/Mouredev";
import { Perfil } from "@/features/perfil/Perfil";
import type { GymDay } from "@/lib/cycle";

export type Tab = "hoy" | "entreno" | "habitos" | "datos" | "mas" | "horario" | "kairos" | "mouredev" | "perfil";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="eyebrow pulse">Cargando PERFORMANCE…</div>
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
  const [tab, setTab] = useState<Tab>("hoy");
  const [autoStartDay, setAutoStartDay] = useState<GymDay | null>(null);
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  useReminders(settings);
  useLandingRedirect(!authLoading && !session);

  useEffect(() => {
    seedIfNeeded().finally(() => setReady(true));
  }, []);

  function startEntreno(day: GymDay) {
    setAutoStartDay(day);
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
      {tab === "hoy" ? <Hoy onStartEntreno={startEntreno} onNavigate={setTab} /> : null}
      {tab === "entreno" ? <Entreno autoStartDay={autoStartDay} onConsumeAutoStart={() => setAutoStartDay(null)} /> : null}
      {tab === "habitos" ? <Habitos /> : null}
      {tab === "datos" ? <Datos /> : null}
      {tab === "horario" ? <Horario /> : null}
      {tab === "kairos" ? <Kairos /> : null}
      {tab === "mouredev" ? <Mouredev /> : null}
      {tab === "perfil" ? <Perfil /> : null}
      <ToastHost />
    </Shell>
  );
}
