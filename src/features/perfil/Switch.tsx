/** On/off switch. The track is the accent fill when on (the thumb takes the text-on-accent
 * colour so it holds up on every accent and in both themes) and a plain surface when off
 * (the thumb is ink). The core stylesheet gives every [role="switch"] a 44px touch area. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className = "",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`h-7 w-12 flex-none rounded-full disabled:opacity-40 ${checked ? "glass-on" : "glass"} ${className}`}
    >
      <span
        aria-hidden
        className={`absolute top-[3px] left-[3px] h-5 w-5 rounded-full transition-transform duration-150 ${
          checked ? "translate-x-5 bg-[var(--text-on-accent)]" : "translate-x-0 bg-[var(--color-ink)]"
        }`}
      />
    </button>
  );
}

/** A settings line: label (and optional help) on the left, the control on the right. */
export function SettingRow({
  label,
  help,
  children,
  control = "auto",
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
  /** "field": the control sits in a fixed-width column so a stack of rows lines up. */
  control?: "auto" | "field";
}) {
  const Tag = control === "field" ? "label" : "div";
  return (
    <Tag className="flex min-h-[var(--control-h)] items-center justify-between gap-3 py-1">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--color-ink)]">{label}</span>
        {help ? <span className="block text-meta leading-snug text-[var(--color-muted)]">{help}</span> : null}
      </span>
      <span className={control === "field" ? "block w-[148px] flex-none" : "flex-none"}>{children}</span>
    </Tag>
  );
}
