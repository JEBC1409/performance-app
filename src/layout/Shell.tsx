import { useCallback, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { NavGlyph, AmbientBackground, JourneyTicker, SyncStatusDot } from "@/ui";
import { NavDock } from "./NavDock";
import type { Tab } from "@/App";
import { OfflineBanner } from "@/ui/OfflineBanner";
import { useUiPrefs } from "@/hooks/useUiPrefs";

const SIDEBAR_TABS: { key: Tab; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "entreno", label: "Entreno" },
  { key: "habitos", label: "Hábitos" },
  { key: "datos", label: "Datos" },
  { key: "horario", label: "Horario" },
  { key: "focus", label: "Focus" },
  { key: "kairos", label: "Oración" },
  { key: "mouredev", label: "MoureDev" },
  { key: "perfil", label: "Perfil" },
];

/** Same width as the `sidebar:` Tailwind breakpoint (--breakpoint-sidebar in styles/index.css). */
const DESKTOP_QUERY = "(min-width: 900px)";

/** Tracks a media query. Only one of the two headers is mounted, so its ticker and sync timers exist once. */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mq = window.matchMedia?.(query);
      mq?.addEventListener?.("change", notify);
      return () => mq?.removeEventListener?.("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

export function Shell({
  active,
  onChange,
  children,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  children: ReactNode;
}) {
  // The dock shows the screens you picked (Perfil › Apariencia); the rest live under "Más".
  const { navTabs } = useUiPrefs();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const label = (k: string) => SIDEBAR_TABS.find((t) => t.key === k)?.label ?? k;
  const MOBILE_TABS: { key: Tab; label: string }[] = navTabs.map((k) => ({ key: k as Tab, label: label(k) }));
  const MORE_TABS = SIDEBAR_TABS.filter((t) => !navTabs.includes(t.key as never));
  // "sábado, 17 de octubre" → only the first letter capital (CSS `capitalize` made it "17 De Octubre").
  const rawDate = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col">
      <AmbientBackground />
      {/* ── Top nav (desktop) ─────────────────────────────── */}
      {desktop ? (
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sticky top-0 z-20 min-w-0 min-[1400px]:gap-4 min-[1400px]:px-6">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="font-[var(--font-display)] text-[13px] tracking-[0.18em] text-[var(--color-ink)] truncate">
              PERFORMANCE<span className="text-[var(--color-red-ink)]">.</span>
            </div>
            <JourneyTicker />
          </div>

          <div className="nav-pillbar min-w-0 max-w-full justify-self-center">
            <span className="nav-logo-badge">
              <span className="nav-logo-dot" />
            </span>
            <nav className="flex min-w-0 items-center gap-0.5" aria-label="Navegación">
              {SIDEBAR_TABS.map((t) => {
                const isActive = active === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => onChange(t.key)}
                    aria-label={t.label}
                    aria-current={isActive ? "page" : undefined}
                    // Under 1400 px (the full pill needs ~1050 px beside the two side blocks) only the active item keeps its name (like the phone dock), so the whole pill fits.
                    className={`nav-pill-item ${isActive ? "nav-pill-item-active" : "max-[1399px]:pr-1.5!"}`}
                  >
                    <span className="nav-pill-icon">
                      <NavGlyph tab={t.key} active={isActive} activeColor="#fff" />
                    </span>
                    <span className={`nav-pill-label ${isActive ? "" : "max-[1399px]:hidden"}`}>{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex min-w-0 flex-col items-end gap-1">
            <div className="max-w-full truncate text-[12px] num text-[var(--color-muted-2)] leading-snug">{dateLabel}</div>
            <SyncStatusDot />
          </div>
        </header>
      ) : null}

      {/* ── Main content ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {desktop ? null : (
          <header
            className="sticky top-0 z-20 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-line)] px-4 pb-3 flex items-start justify-between"
            style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
          >
            <div className="flex flex-col gap-1">
              <div className="font-[var(--font-display)] text-[12.5px] tracking-[0.18em]">
                PERFORMANCE<span className="text-[var(--color-red-ink)]">.</span>
              </div>
              <JourneyTicker />
            </div>
            <div className="flex flex-col items-end gap-1 mt-0.5">
              <div className="text-[12px] num text-[var(--color-muted)]">
                {dateLabel}
              </div>
              <SyncStatusDot />
            </div>
          </header>
        )}
        <OfflineBanner />

        <main className="flex-1 px-4 py-5 pb-[calc(6.5rem_+_env(safe-area-inset-bottom))] sidebar:px-8 sidebar:py-8 sidebar:pb-10 max-w-[1000px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile navigation: the floating dock ─────────── */}
      {desktop ? null : <NavDock active={active} tabs={MOBILE_TABS} more={MORE_TABS} onChange={onChange} />}
    </div>
  );
}
