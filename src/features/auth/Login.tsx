import { useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { OtpInput } from "./OtpInput";

type Step = "email" | "code";

const RESEND_COOLDOWN_SEC = 30;

const ERROR_MESSAGES: Record<string, string> = {
  "Token has expired or is invalid": "El código expiró o es incorrecto. Pedí uno nuevo.",
  "Email rate limit exceeded": "Pediste demasiados códigos seguidos. Esperá un minuto e intentá de nuevo.",
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
    if (!supabase || code.length !== 6 || loading) return;
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
    if (step === "code" && code.length === 6) verifyCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
        <div className="panel-surface p-6 max-w-sm w-full">
          <div className="eyebrow eyebrow-accent">Configuración pendiente</div>
          <h1 className="font-[var(--font-display)] text-lg mt-2.5">Falta conectar Supabase</h1>
          <p className="text-[12.5px] text-[var(--color-muted)] mt-3 leading-relaxed">
            El login por código necesita un proyecto de Supabase. Creá uno en{" "}
            <span className="text-[var(--color-ink)]">supabase.com</span>, copiá la Project URL y el anon key desde{" "}
            <span className="text-[var(--color-ink)]">Settings → API</span>, y agregalos a un archivo{" "}
            <code className="text-[var(--color-red)]">.env.local</code> en la raíz del proyecto como{" "}
            <code className="text-[var(--color-red)]">VITE_SUPABASE_URL</code> y{" "}
            <code className="text-[var(--color-red)]">VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-[var(--font-display)] text-base tracking-[0.14em]">
            PERFORMANCE<span className="text-[var(--color-red)]">.</span>
          </div>
        </div>

        <div className="panel-surface p-6">
          {step === "email" ? (
            <form onSubmit={sendCode} className="flex flex-col gap-5">
              <div>
                <div className="eyebrow eyebrow-accent">Acceso</div>
                <h1 className="font-[var(--font-display)] text-lg mt-2">Iniciar sesión</h1>
                <p className="text-[12px] text-[var(--color-muted)] mt-2 leading-relaxed">
                  Te enviamos un código de un solo uso a tu correo. Sin contraseña.
                </p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] text-[var(--color-muted)] uppercase tracking-wide">Correo</span>
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
                  className="bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-3 py-3 text-[14px] outline-none focus:border-[var(--color-red)]"
                />
              </label>

              {error ? <div className="text-[12px] text-[var(--color-red)] border-l-2 border-[var(--color-red)] pl-2.5">{error}</div> : null}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="tap-target w-full bg-[var(--color-red)] text-black py-3 text-[12.5px] font-semibold uppercase tracking-wide hover:brightness-110 disabled:opacity-40 transition-colors"
              >
                {loading ? "Enviando…" : "Enviar código"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <div className="eyebrow eyebrow-accent">Verificación</div>
                <h1 className="font-[var(--font-display)] text-lg mt-2">Ingresá el código</h1>
                <p className="text-[12px] text-[var(--color-muted)] mt-2 leading-relaxed">
                  Enviado a <span className="text-[var(--color-ink)] font-medium">{email}</span>
                </p>
              </div>

              <OtpInput value={code} onChange={setCode} disabled={loading} />
              <p className="text-[11px] text-[var(--color-muted-2)] -mt-2.5">¿No ves un código de 6 dígitos? También podés entrar tocando el enlace del correo.</p>

              {error ? <div className="text-[12px] text-[var(--color-red)] border-l-2 border-[var(--color-red)] pl-2.5">{error}</div> : null}

              <button
                onClick={verifyCode}
                disabled={loading || code.length !== 6}
                className="tap-target w-full bg-[var(--color-red)] text-black py-3 text-[12.5px] font-semibold uppercase tracking-wide hover:brightness-110 disabled:opacity-40 transition-colors"
              >
                {loading ? "Verificando…" : "Verificar"}
              </button>

              <div className="flex items-center justify-between text-[11.5px]">
                <button
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                  }}
                  className="text-[var(--color-muted)] hover:text-[var(--color-ink)] uppercase tracking-wide"
                >
                  ← Cambiar correo
                </button>
                <button
                  onClick={() => sendCode()}
                  disabled={cooldown > 0 || loading}
                  className="text-[var(--color-muted)] hover:text-[var(--color-red)] disabled:opacity-40 uppercase tracking-wide"
                >
                  {cooldown > 0 ? `Reenviar (${cooldown}s)` : "Reenviar código"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10.5px] text-[var(--color-muted-2)] mt-5">Tus datos de entrenamiento viven solo en este dispositivo.</p>
      </div>
    </div>
  );
}
