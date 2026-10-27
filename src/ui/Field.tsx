import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-[var(--color-muted)]">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`min-h-[var(--control-h)] rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-3 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted-2)] ${className}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`min-h-[var(--control-h)] rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-3 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted-2)] ${className}`}
    >
      {children}
    </select>
  );
}
