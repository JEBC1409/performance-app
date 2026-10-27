import { useEffect, useRef, useState } from "react";
import { NavGlyph } from "@/ui";
import type { Tab } from "@/App";

type Item = { key: Tab; label: string };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Phone navigation: a floating rounded bar at the bottom. The screens you pinned
 * sit in it as icons and the one you're on grows to show its name; "Más" opens a
 * grid of the rest just above it (and, when you are on one of those, shows its name). */
export function NavDock({ active, tabs, more, onChange }: { active: Tab; tabs: Item[]; more: Item[]; onChange: (t: Tab) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreItem = more.find((m) => m.key === active);
  const moreActive = Boolean(moreItem);

  const go = (key: Tab) => {
    setMoreOpen(false);
    onChange(key);
  };

  // Modal behaviour, as in Sheet: focus moves into the panel (to the current screen's
  // tile, else the first one), Tab stays inside, Escape closes, and focus returns to
  // whatever opened it (the "Más" button).
  useEffect(() => {
    if (!moreOpen) return;
    // Safari does not focus a button on tap, so fall back to the button itself.
    const active = document.activeElement as HTMLElement | null;
    const opener = active && active !== document.body ? active : moreBtnRef.current;
    const panel = moreRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>('[aria-current="page"]') ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMoreOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || !panel.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !panel.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [moreOpen]);

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
            ref={moreBtnRef}
            onClick={() => setMoreOpen(true)}
            aria-label={moreItem ? `Más secciones: ${moreItem.label}` : "Más secciones"}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-current={moreActive ? "page" : undefined}
            className="nav-dock-item"
          >
            <NavGlyph tab="mas" active={moreActive} activeColor="var(--color-ink)" />
            <span className="nav-dock-label">{moreItem ? moreItem.label : "Más"}</span>
          </button>
        ) : null}
      </nav>

      {moreOpen ? (
        <div className="sidebar:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Más secciones">
          <div className="absolute inset-0 bg-[var(--color-scrim)]" onClick={() => setMoreOpen(false)} />
          <div ref={moreRef} className="nav-dock-more enter">
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
