import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

/**
 * `null` when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set — callers must check
 * `supabaseConfigured` first. Kept nullable rather than throwing so the app can still boot
 * (and explain what's missing) before the project is wired up.
 *
 * detectSessionInUrl stays on: until the project has a custom SMTP provider + an email
 * template that includes {{ .Token }}, Supabase's default "Magic link or OTP" email only
 * contains a clickable link, not a visible code. This lets that link log the user in too,
 * so the app works end-to-end today — typing a code becomes the (nicer) primary path the
 * moment a real code shows up in the email.
 */
export const supabase = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
