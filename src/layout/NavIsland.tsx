import { useEffect, useRef, useState } from "react";
import { NavGlyph } from "@/ui";
import type { Tab } from "@/App";

type Item = { key: Tab; label: string };

/** Phone navigation: a floating capsule on the right edge, where the thumb rests.
 * It shows the screens you pinned plus "Más" (a labelled list of the rest); the
 * page leaves a lane free beside it so it never covers a control. */
export function NavIsland({ active, tabs, more, onChange }: { active: Tab; tabs: Item[]; more: Item[]; onChange: (t: Tab) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(hintTimer.current), []);

  const moreActive = more.some((m) => m.key === active);

  const go = (key: Tab, label: string) => {
    setMoreOpen(false);
    onChange(key);
    setHint(label);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 1400);
  };

  return (
    <>
      <nav className="nav-pillbar nav-island sidebar:hidden" aria-label="Navegación">
        {tabs.map((t) => {
          const on = active === t.key;
          return (
            <div key={t.key} className="relative">
              <button onClick={() => go(t.key, t.label)} aria-label={t.label} aria-current={on ? "page" : undefined} className="nav-island-btn">
                <NavGlyph tab={t.key} active={on} activeColor="#fff" />
              </button>
              {hint === t.label ? <span className="nav-island-hint enter">{t.label}</span> : null}
            </div>
          );
        })}
        {more.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setMoreOpen(true)}
              aria-label="Más secciones"
              aria-haspopup="dialog"
              aria-current={moreActive ? "page" : undefined}
              className="nav-island-btn"
            >
              <NavGlyph tab="mas" active={moreActive} activeColor="#fff" />
            </button>
            {hint && more.some((m) => m.label === hint) ? <span className="nav-island-hint enter">{hint}</span> : null}
          </div>
        ) : null}
      </nav>

      {moreOpen ? (
        <div className="sidebar:hidden fixed inset-0 z-40" role="dialog" aria-modal aria-label="Más secciones">
          <div className="absolute inset-0 bg-[var(--color-scrim)]" onClick={() => setMoreOpen(false)} />
          <div className="nav-island-more enter">
            {more.map((t) => {
              const on = active === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => go(t.key, t.label)}
                  aria-current={on ? "page" : undefined}
                  className={`nav-island-row ${on ? "nav-island-row-on" : ""}`}
                >
                  <span className="nav-island-btn nav-island-btn-sm" aria-current={on ? "page" : undefined}>
                    <NavGlyph tab={t.key} active={on} activeColor="#fff" />
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
