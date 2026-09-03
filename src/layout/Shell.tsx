import { useState } from "react";
import type { ReactNode } from "react";
import { NavGlyph, AmbientBackground } from "@/ui";
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

export function Shell({
  active,
  onChange,
  children,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  children: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const dateLabel = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col">
      <AmbientBackground />
      {/* ── Top nav (desktop) ─────────────────────────────── */}
      <header className="hidden sidebar:flex items-center justify-between gap-6 px-8 py-3.5 sticky top-0 z-20 bg-[var(--color-bg)]/92 backdrop-blur-sm border-b border-[var(--color-line)]">
        <div className="font-[var(--font-display)] text-[13px] tracking-[0.18em] text-[var(--color-ink)] flex-none">
          PERFORMANCE<span className="text-[var(--color-red)]">.</span>
        </div>

        <nav className="flex items-center gap-1.5">
          {SIDEBAR_TABS.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                className={`nav-pill flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl transition-all duration-150 ${isActive ? "nav-pill-active" : ""}`}
              >
                <span className={`nav-icon-badge ${isActive ? "nav-icon-badge-active" : ""}`}>
                  <NavGlyph tab={t.key} active={isActive} />
                </span>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-[0.08em] ${
                    isActive ? "text-[var(--color-red)]" : "text-[var(--color-muted)]"
                  }`}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="text-[10px] num text-[var(--color-muted-2)] capitalize leading-snug flex-none text-right">
          {dateLabel}
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-line)] px-4 py-3.5 flex items-center justify-between sidebar:hidden">
          <div className="font-[var(--font-display)] text-[12.5px] tracking-[0.18em]">
            PERFORMANCE<span className="text-[var(--color-red)]">.</span>
          </div>
          <div className="text-[10.5px] num text-[var(--color-muted)] capitalize">
            {dateLabel}
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sidebar:px-8 sidebar:py-8 pb-24 sidebar:pb-10 max-w-[1000px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav className="sidebar:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-bg)]/95 backdrop-blur-sm border-t border-[var(--color-line)]">
        <div className="flex">
          {MOBILE_TABS.map((t) => {
            const isActive =
              t.key === "mas"
                ? MORE_TABS.some((m) => m.key === active)
                : active === t.key;
            return (
              <button
                key={t.key}
                onClick={() =>
                  t.key === "mas" ? setMoreOpen(true) : onChange(t.key)
                }
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors duration-150 ${
                  isActive
                    ? "text-[var(--color-red)]"
                    : "text-[var(--color-muted)] active:text-[var(--color-ink)]"
                }`}
              >
                <NavGlyph tab={t.key} active={isActive} />
                <span
                  className={`text-[9px] font-semibold uppercase tracking-[0.08em] ${
                    isActive ? "text-[var(--color-red)]" : ""
                  }`}
                >
                  {t.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 bg-[var(--color-red)] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── "Más" bottom sheet ────────────────────────────── */}
      {moreOpen ? (
        <div
          className="sidebar:hidden fixed inset-0 z-40 flex items-end"
          role="dialog"
          aria-modal
        >
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative w-full bg-[var(--color-surface)] border-t border-[var(--color-line-strong)] p-5 enter">
            <div className="eyebrow mb-4">Más secciones</div>
            <div className="grid grid-cols-2 gap-2">
              {MORE_TABS.map((t) => {
                const isActive = active === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      onChange(t.key);
                      setMoreOpen(false);
                    }}
                    className={`tap-target panel-surface flex items-center gap-3 px-4 py-3.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] transition-all border-l-2 ${
                      isActive
                        ? "border-l-[var(--color-red)] text-[var(--color-red)]"
                        : "border-l-transparent text-[var(--color-ink)] hover:border-l-[var(--color-red)] hover:text-[var(--color-red)]"
                    }`}
                  >
                    <NavGlyph tab={t.key} active={isActive} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
