import { useState } from "react";
import type { ReactNode } from "react";
import { NavGlyph } from "@/ui";
import type { Tab } from "@/App";

const MOBILE_TABS: { key: Tab; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "entreno", label: "Entreno" },
  { key: "habitos", label: "Hábitos" },
  { key: "datos", label: "Datos" },
  { key: "mas", label: "Más" },
];

const MORE_TABS: { key: Tab; label: string }[] = [
  { key: "horario", label: "Horario" },
  { key: "kairos", label: "Kairos" },
  { key: "mouredev", label: "MoureDev" },
  { key: "perfil", label: "Perfil" },
];

const SIDEBAR_TABS: { key: Tab; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "entreno", label: "Entreno" },
  { key: "habitos", label: "Hábitos" },
  { key: "datos", label: "Datos" },
  { key: "horario", label: "Horario" },
  { key: "kairos", label: "Kairos" },
  { key: "mouredev", label: "MoureDev" },
  { key: "perfil", label: "Perfil" },
];

export function Shell({ active, onChange, children }: { active: Tab; onChange: (t: Tab) => void; children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const dateLabel = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen flex flex-col sidebar:flex-row">
      <aside className="hidden sidebar:flex sidebar:flex-col sidebar:w-[190px] sidebar:border-r sidebar:border-[var(--color-line)] sidebar:h-screen sidebar:sticky sidebar:top-0">
        <div className="px-5 pt-6 pb-4">
          <div className="font-[var(--font-display)] text-[13px] tracking-[0.14em]">
            PERFORMANCE<span className="text-[var(--color-red)]">.</span>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {SIDEBAR_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`flex items-center gap-3 px-2.5 py-2.5 text-[12px] font-semibold uppercase tracking-wide transition-colors ${
                active === t.key ? "text-[var(--color-red)] bg-[var(--color-surface)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <NavGlyph tab={t.key} active={active === t.key} />
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-[var(--color-bg)] border-b border-[var(--color-line)] px-4 py-3.5 flex items-center justify-between sidebar:hidden">
          <div className="font-[var(--font-display)] text-[13px] tracking-[0.14em]">
            PERFORMANCE<span className="text-[var(--color-red)]">.</span>
          </div>
          <div className="text-[11px] num text-[var(--color-muted)] capitalize">{dateLabel}</div>
        </header>

        <main className="flex-1 px-4 py-4 sidebar:px-8 sidebar:py-8 pb-24 sidebar:pb-8 max-w-[1100px] w-full">{children}</main>
      </div>

      <nav className="sidebar:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-bg)] border-t border-[var(--color-line)]">
        <div className="flex">
          {MOBILE_TABS.map((t) => {
            const isActive = t.key === "mas" ? MORE_TABS.some((m) => m.key === active) : active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => (t.key === "mas" ? setMoreOpen(true) : onChange(t.key))}
                className="flex-1 flex flex-col items-center gap-1 py-2.5"
              >
                <NavGlyph tab={t.key} active={isActive} />
                <span className={`text-[9.5px] font-semibold uppercase tracking-wide ${isActive ? "text-[var(--color-red)]" : "text-[var(--color-muted)]"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {moreOpen ? (
        <div className="sidebar:hidden fixed inset-0 z-40 flex items-end" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/70" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-[var(--color-surface)] border-t border-[var(--color-line-strong)] p-4 enter">
            <div className="eyebrow mb-3">Más</div>
            <div className="grid grid-cols-2 gap-2">
              {MORE_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    onChange(t.key);
                    setMoreOpen(false);
                  }}
                  className={`panel-surface flex items-center gap-2.5 px-3 py-3 text-[12px] font-semibold uppercase tracking-wide ${
                    active === t.key ? "text-[var(--color-red)]" : "text-[var(--color-ink)]"
                  }`}
                >
                  <NavGlyph tab={t.key} active={active === t.key} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
