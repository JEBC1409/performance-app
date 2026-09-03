export interface TabItem<T extends string> {
  key: T;
  label: string;
}

export function Tabs<T extends string>({ items, value, onChange }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex border border-[var(--color-line)] bg-[var(--color-surface)]">
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={`tap-target flex-1 py-2.5 text-[12px] font-semibold tracking-wide uppercase transition-colors ${
              active ? "bg-[var(--color-red)] text-black" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
