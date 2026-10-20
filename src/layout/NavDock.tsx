import { useState } from "react";
import { NavGlyph } from "@/ui";
import type { Tab } from "@/App";

type Item = { key: Tab; label: string };

/** Phone navigation: a floating rounded bar at the bottom. The screens you pinned
 * sit in it as icons and the one you're on grows to show its name; "Más" opens a
 * grid of the rest just above it. */
export function NavDock({ active, tabs, more, onChange }: { active: Tab; tabs: Item[]; more: Item[]; onChange: (t: Tab) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = more.some((m) => m.key === active);

  const go = (key: Tab) => {
    setMoreOpen(false);
    onChange(key);
  };

  return (
    <>
      <nav className="nav-pillbar nav-dock sidebar:hidden" aria-label="Navegación">
        {tabs.map((t) => {
          const on = active === t.key;
          return (
            <button key={t.key} onClick={() => go(t.key)} aria-label={t.label} aria-current={on ? "page" : undefined} className="nav-dock-item">
              <NavGlyph tab={t.key} active={on} activeColor="var(--color-ink)" />
              <span className="nav-dock-label">{t.label}</span>
            </button>
          );
        })}
        {more.length > 0 ? (
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="Más secciones"
            aria-haspopup="dialog"
            aria-current={moreActive ? "page" : undefined}
            className="nav-dock-item"
          >
            <NavGlyph tab="mas" active={moreActive} activeColor="var(--color-ink)" />
            <span className="nav-dock-label">Más</span>
          </button>
        ) : null}
      </nav>

      {moreOpen ? (
        <div className="sidebar:hidden fixed inset-0 z-40" role="dialog" aria-modal aria-label="Más secciones">
          <div className="absolute inset-0 bg-[var(--color-scrim)]" onClick={() => setMoreOpen(false)} />
          <div className="nav-dock-more enter">
            {more.map((t) => {
              const on = active === t.key;
              return (
                <button key={t.key} onClick={() => go(t.key)} aria-current={on ? "page" : undefined} className="nav-dock-tile">
                  <span className="nav-dock-tile-icon">
                    <NavGlyph tab={t.key} active={on} activeColor="var(--color-ink)" />
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
