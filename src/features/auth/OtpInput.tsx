import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

// Supabase's numeric email OTP for this project is 8 digits (verified against a real
// sent code) — not the commonly-assumed 6.
export const OTP_LENGTH = 8;

export function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");

  function setDigit(i: number, d: string) {
    const clean = d.replace(/[^0-9]/g, "").slice(-1);
    const next = digits.slice();
    next[i] = clean;
    onChange(next.join(""));
    if (clean && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    onChange(text.padEnd(OTP_LENGTH, "").slice(0, OTP_LENGTH).trimEnd());
    const focusIndex = Math.min(text.length, OTP_LENGTH - 1);
    refs.current[focusIndex]?.focus();
  }

  return (
    <div className="grid grid-cols-4 gap-2" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Dígito ${i + 1} de ${OTP_LENGTH}`}
          className="num w-full aspect-square bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] text-center text-lg font-semibold outline-none focus:border-[var(--color-red)] disabled:opacity-40"
        />
      ))}
    </div>
  );
}
