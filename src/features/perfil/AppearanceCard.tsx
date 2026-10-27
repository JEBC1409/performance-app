import { Icon } from "@/ui/Icon";
import { Card } from "@/ui";
import { useUiPrefs } from "@/hooks/useUiPrefs";
import { ACCENTS, DEFAULT_NAV, DEFAULT_UI_PREFS, HOME_CARDS, NAV_SLOTS, NAV_TABS, setUiPrefs } from "@/lib/uiPrefs";
import type { NavKey } from "@/lib/uiPrefs";
import { showToast } from "@/ui/Toast";
import { Switch } from "./Switch";

/** Perfil › Apariencia: accent color, "sobrio" mode, and the order of Hoy. */
export function AppearanceCard() {
  const prefs = useUiPrefs();
  const label = (k: string) => HOME_CARDS.find((c) => c.key === k)?.label ?? k;

  function move(i: number, dir: -1 | 1) {
    const next = [...prefs.homeOrder];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setUiPrefs({ homeOrder: next });
  }

  function toggleNav(key: NavKey) {
    const has = prefs.navTabs.includes(key);
    if (has) {
      if (prefs.navTabs.length <= 2) return showToast("Deja al menos 2 pantallas en la barra");
      setUiPrefs({ navTabs: prefs.navTabs.filter((k) => k !== key) });
    } else {
      if (prefs.navTabs.length >= NAV_SLOTS) return showToast(`Caben ${NAV_SLOTS}: quita una primero`);
      setUiPrefs({ navTabs: [...prefs.navTabs, key] });
    }
  }

  return (
    <Card>
      <div>
        <div className="mb-2 text-sm font-medium">Color de acento</div>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Color de acento">
          {ACCENTS.map((a) => {
            const on = prefs.accent === a.key;
            return (
              <button
                key={a.key}
                role="radio"
                aria-checked={on}
                aria-label={a.label}
                onClick={() => setUiPrefs({ accent: a.key })}
                className={`glass flex h-11 w-full items-center justify-center rounded-full ${on ? "!border-[var(--color-ink)] ring-1 ring-[var(--color-ink)]" : ""}`}
              >
                <span className="h-6 w-6 rounded-full" style={{ background: a.swatch, boxShadow: on ? `0 0 14px ${a.swatch}` : "none" }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-sm font-medium">Tema</div>
        <div className="glass-track grid grid-cols-3 gap-1 rounded-full p-1" role="radiogroup" aria-label="Tema">
          {([["dark", "Oscuro"], ["light", "Claro"], ["auto", "Automático"]] as const).map(([k, label]) => (
            <button key={k} role="radio" aria-checked={prefs.theme === k} onClick={() => setUiPrefs({ theme: k })} className={`tap-target rounded-full px-1 text-sm font-semibold ${prefs.theme === k ? "glass-on" : "glass-flat text-[var(--color-muted)]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex min-h-[var(--control-h)] items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">Modo sobrio</div>
          <div className="text-meta leading-snug text-[var(--color-muted)]">Menos brillo y resplandor; bordes neutros.</div>
        </div>
        <Switch checked={prefs.calm} onChange={(v) => setUiPrefs({ calm: v })} label="Modo sobrio" />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Barra de navegación <span className="font-normal text-[var(--color-muted)]">(hasta {NAV_SLOTS})</span></span>
          <button onClick={() => setUiPrefs({ navTabs: DEFAULT_NAV })} className="hit text-meta text-[var(--color-muted)] hover:text-[var(--color-accent-text)]">
            Restablecer
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {NAV_TABS.map((t) => {
            const idx = prefs.navTabs.indexOf(t.key);
            return (
              <button key={t.key} onClick={() => toggleNav(t.key)} aria-pressed={idx >= 0} className={`tap-target rounded-full px-3.5 text-sm font-semibold glass ${idx >= 0 ? "" : "text-[var(--color-muted)]"}`}>
                {idx >= 0 ? `${idx + 1} · ` : ""}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <details className="group mt-4 border-t border-[var(--color-line)] pt-1">
        <summary className="flex min-h-[var(--control-h)] cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>
            Orden de las tarjetas en Hoy
            <span className="block text-meta font-normal text-[var(--color-muted)]">Empieza por {label(prefs.homeOrder[0])}</span>
          </span>
          <Icon name="chevron-right" size={18} className="flex-none text-[var(--color-muted)] transition-transform group-open:rotate-90" />
        </summary>
        <div className="mb-2 flex justify-end">
          <button onClick={() => setUiPrefs({ homeOrder: DEFAULT_UI_PREFS.homeOrder })} className="hit text-meta text-[var(--color-muted)] hover:text-[var(--color-accent-text)]">
            Restablecer
          </button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {prefs.homeOrder.map((k, i) => (
            <li key={k} className="glass flex items-center gap-1 rounded-xl py-0.5 pl-3 pr-1">
              <span className="num w-5 text-meta text-[var(--color-muted-2)]">{i + 1}</span>
              <span className="flex-1 text-sm">{label(k)}</span>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Subir ${label(k)}`}
                className="glass-flat flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-muted)] disabled:opacity-30"
              >
                <Icon name="arrow-up" size={15} />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === prefs.homeOrder.length - 1}
                aria-label={`Bajar ${label(k)}`}
                className="glass-flat flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-muted)] disabled:opacity-30"
              >
                <Icon name="arrow-down" size={15} />
              </button>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
