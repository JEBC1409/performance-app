import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10.5px] text-[var(--color-muted)] uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-red)] ${className}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-red)] ${className}`}
    >
      {children}
    </select>
  );
}
