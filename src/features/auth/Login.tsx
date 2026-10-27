import { useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { AmbientBackground } from "@/ui";
import { OtpInput, OTP_LENGTH } from "./OtpInput";

type Step = "email" | "code";

const RESEND_COOLDOWN_SEC = 30;

const ERROR_MESSAGES: Record<string, string> = {
  "Token has expired or is invalid": "El código expiró o es incorrecto. Pide uno nuevo.",
  "Email rate limit exceeded": "Pediste demasiados códigos seguidos. Espera un minuto e inténtalo de nuevo.",
  "Signups not allowed for this instance": "Este correo no tiene acceso todavía.",
};

function friendlyError(message: string): string {
  return ERROR_MESSAGES[message] ?? message;
}

export function Login() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!supabase || !email.trim() || loading || cooldown > 0) return;
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (err) {
      setError(friendlyError(err.message));
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(RESEND_COOLDOWN_SEC);
  }

  async function verifyCode() {
    if (!supabase || code.length !== OTP_LENGTH || loading) return;
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "email",
    });
    setLoading(false);
    if (err) {
      setError(friendlyError(err.message));
      return;
    }
    // Success: the auth listener in App.tsx picks up the new session automatically.
  }

  useEffect(() => {
    if (step === "code" && code.length === OTP_LENGTH) verifyCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  if (!supabaseConfigured) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
        <AmbientBackground calm />
        <div className="login-card p-6 max-w-sm w-full">
          <h1 className="font-[var(--font-display)] text-title">Falta conectar Supabase</h1>
          <p className="text-sm text-[var(--color-muted)] mt-3 leading-relaxed">
            El login por código necesita un proyecto de Supabase. Crea uno en{" "}
            <span className="text-[var(--color-ink)]">supabase.com</span>, copia la Project URL y el anon key desde{" "}
            <span className="text-[var(--color-ink)]">Settings → API</span>, y agrégalos a un archivo{" "}
            <code className="text-[var(--color-accent-text)]">.env.local</code> en la raíz del proyecto como{" "}
            <code className="text-[var(--color-accent-text)]">VITE_SUPABASE_URL</code> y{" "}
            <code className="text-[var(--color-accent-text)]">VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
      <AmbientBackground calm />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-[var(--font-display)] text-base tracking-[0.14em]">
            PERFORMANCE<span className="text-[var(--color-accent-text)]">.</span>
          </div>
        </div>

        <div className="login-card p-6">
          {step === "email" ? (
            <form onSubmit={sendCode} className="flex flex-col gap-5">
              <div>
                <h1 className="font-[var(--font-display)] text-title">Iniciar sesión</h1>
                <p className="text-sm text-[var(--color-muted)] mt-2 leading-relaxed">
                  Te enviamos un código de un solo uso a tu correo. Sin contraseña.
                </p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--color-muted)]">Correo</span>
                <input
                  ref={emailInputRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] rounded-xl px-3.5 py-3 text-base"
                />
              </label>

              {error ? <div role="alert" className="rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] px-3 py-2 text-sm text-[var(--color-accent-text)]">{error}</div> : null}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full min-h-[48px] rounded-full px-5 text-base"
              >
                {loading ? "Enviando…" : "Enviar código"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-[var(--font-display)] text-title">Ingresa el código</h1>
                <p className="text-sm text-[var(--color-muted)] mt-2 leading-relaxed">
                  Enviado a <span className="text-[var(--color-ink)] font-medium">{email}</span>
                </p>
              </div>

              <OtpInput value={code} onChange={setCode} disabled={loading} />
              <p className="text-meta text-[var(--color-muted)] -mt-2.5">
                ¿No ves un código de {OTP_LENGTH} dígitos? También puedes entrar tocando el enlace del correo.
              </p>

              {error ? <div role="alert" className="rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] px-3 py-2 text-sm text-[var(--color-accent-text)]">{error}</div> : null}

              <button
                onClick={verifyCode}
                disabled={loading || code.length !== OTP_LENGTH}
                className="btn-primary w-full min-h-[48px] rounded-full px-5 text-base"
              >
                {loading ? "Verificando…" : "Verificar"}
              </button>

              <div className="flex items-center justify-between gap-2 text-sm">
                <button
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                  }}
                  className="tap-target -ml-2 rounded-full px-3 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  ← Cambiar correo
                </button>
                <button
                  onClick={() => sendCode()}
                  disabled={cooldown > 0 || loading}
                  className="tap-target -mr-2 rounded-full px-3 text-[var(--color-muted)] hover:text-[var(--color-accent-text)] disabled:opacity-40"
                >
                  {cooldown > 0 ? `Reenviar (${cooldown}s)` : "Reenviar código"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-meta text-[var(--color-muted)] mt-5">Tus datos se guardan en tu cuenta y también en este dispositivo, para que sigan funcionando sin conexión.</p>
      </div>
    </div>
  );
}
