import { Icon } from "@/ui/Icon";
import { Card, Eyebrow } from "@/ui";
import { useUiPrefs } from "@/hooks/useUiPrefs";
import { ACCENTS, DEFAULT_NAV, DEFAULT_UI_PREFS, HOME_CARDS, NAV_SLOTS, NAV_TABS, setUiPrefs } from "@/lib/uiPrefs";
import type { NavKey } from "@/lib/uiPrefs";
import { showToast } from "@/ui/Toast";

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
      if (prefs.navTabs.length <= 2) return showToast("Deja al menos 2 pantallas abajo");
      setUiPrefs({ navTabs: prefs.navTabs.filter((k) => k !== key) });
    } else {
      if (prefs.navTabs.length >= NAV_SLOTS) return showToast(`Caben ${NAV_SLOTS}: quita una primero`);
      setUiPrefs({ navTabs: [...prefs.navTabs, key] });
    }
  }

  return (
    <Card>
      <Eyebrow accent>Apariencia</Eyebrow>

      <div className="mt-3">
        <div className="mb-2 text-[11.5px] text-[var(--color-muted)]">Color de acento</div>
        <div className="flex gap-3" role="radiogroup" aria-label="Color de acento">
          {ACCENTS.map((a) => {
            const on = prefs.accent === a.key;
            return (
              <button
                key={a.key}
                role="radio"
                aria-checked={on}
                aria-label={a.label}
                onClick={() => setUiPrefs({ accent: a.key })}
                className={`glass hit flex h-11 w-11 items-center justify-center rounded-full ${on ? "!border-white" : ""}`}
              >
                <span className="h-6 w-6 rounded-full" style={{ background: a.swatch, boxShadow: on ? `0 0 14px ${a.swatch}` : "none" }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[11.5px] text-[var(--color-muted)]">Tema</div>
        <div className="glass-track grid grid-cols-3 gap-1 rounded-full p-1" role="radiogroup" aria-label="Tema">
          {([["dark", "Oscuro"], ["light", "Claro"], ["auto", "Automático"]] as const).map(([k, label]) => (
            <button key={k} role="radio" aria-checked={prefs.theme === k} onClick={() => setUiPrefs({ theme: k })} className={`rounded-full py-2 text-[12px] font-semibold ${prefs.theme === k ? "glass-on" : "glass-flat text-[var(--color-muted)]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold">Modo sobrio</div>
          <div className="text-[11.5px] leading-snug text-[var(--color-muted)]">Menos brillo y resplandor; bordes neutros.</div>
        </div>
        <button
          onClick={() => setUiPrefs({ calm: !prefs.calm })}
          role="switch"
          aria-checked={prefs.calm}
          aria-label="Modo sobrio"
          className={`h-7 w-12 flex-none rounded-full ${prefs.calm ? "glass-on" : "glass"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${prefs.calm ? "left-[26px]" : "left-0.5"}`} />
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11.5px] text-[var(--color-muted)]">Barra de abajo (elige hasta {NAV_SLOTS})</span>
          <button onClick={() => setUiPrefs({ navTabs: DEFAULT_NAV })} className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-red)]">
            Restablecer
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {NAV_TABS.map((t) => {
            const idx = prefs.navTabs.indexOf(t.key);
            return (
              <button key={t.key} onClick={() => toggleNav(t.key)} aria-pressed={idx >= 0} className={`rounded-full px-3.5 py-2 text-[11.5px] font-semibold ${idx >= 0 ? "glass-on" : "glass text-[var(--color-muted)]"}`}>
                {idx >= 0 ? `${idx + 1} · ` : ""}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11.5px] text-[var(--color-muted)]">Orden de las tarjetas en Hoy</span>
          <button onClick={() => setUiPrefs({ homeOrder: DEFAULT_UI_PREFS.homeOrder })} className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-red)]">
            Restablecer
          </button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {prefs.homeOrder.map((k, i) => (
            <li key={k} className="glass flex items-center gap-2 rounded-xl px-3 py-1.5">
              <span className="num w-4 text-[11px] text-[var(--color-muted-2)]">{i + 1}</span>
              <span className="flex-1 text-[12.5px]">{label(k)}</span>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Subir ${label(k)}`}
                className="glass-flat hit flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] disabled:opacity-30"
              >
                <Icon name="arrow-up" size={15} />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === prefs.homeOrder.length - 1}
                aria-label={`Bajar ${label(k)}`}
                className="glass-flat hit flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] disabled:opacity-30"
              >
                <Icon name="arrow-down" size={15} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
