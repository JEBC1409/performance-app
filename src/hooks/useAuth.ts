import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { hasStoredSession } from "@/layout/bootGate";

export interface AuthState {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  /**
   * Supabase could not answer (offline / network error while refreshing an expired token)
   * but this device holds the session of a previous sign-in. The app keeps working from its
   * local data; it is NOT a confirmed session (cloud sync waits for a real one) and it
   * clears itself if the server later rejects the session (SIGNED_OUT).
   */
  offlineTrusted: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [offlineTrusted, setOfflineTrusted] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        setSession(data.session);
        // A refresh that failed for lack of network is not a sign-out: the stored session is kept.
        const unreachable = error?.name === "AuthRetryableFetchError" || navigator.onLine === false;
        setOfflineTrusted(!data.session && unreachable && hasStoredSession());
      })
      .catch(() => {
        setOfflineTrusted(hasStoredSession());
      })
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession || event === "SIGNED_OUT") setOfflineTrusted(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, loading, configured: supabaseConfigured, offlineTrusted };
}
