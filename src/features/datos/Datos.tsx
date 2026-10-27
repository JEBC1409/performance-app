import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/ui";
import { PesoTab } from "./PesoTab";
import { UnoRMTab } from "./UnoRMTab";
import { SuenoTab } from "./SuenoTab";
import { VolumenTab } from "./VolumenTab";
import { MoureDevTab } from "./MoureDevTab";
import { MedidasTab } from "./MedidasTab";
import { SemanaTab } from "./SemanaTab";
import { DATOS_TAB_HINT } from "./tabHint";

type SubTab = "semana" | "peso" | "1rm" | "sueno" | "volumen" | "mouredev" | "medidas";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "semana", label: "Semana" },
  { key: "peso", label: "Peso" },
  { key: "1rm", label: "Carga" },
  { key: "sueno", label: "Sueño" },
  { key: "volumen", label: "Volumen" },
  { key: "mouredev", label: "MoureDev" },
  { key: "medidas", label: "Medidas" },
];

function initialTab(): SubTab {
  try {
    const hint = localStorage.getItem(DATOS_TAB_HINT);
    localStorage.removeItem(DATOS_TAB_HINT);
    if (hint && SUB_TABS.some((t) => t.key === hint)) return hint as SubTab;
  } catch {
    /* no storage: fall through */
  }
  return "peso";
}

/** Fade only the edges that still have tabs behind them, so the cut-off tab
 * reads as "more this way" and the last one isn't faded when you reach it. */
function edgeMask(left: boolean, right: boolean): string {
  const l = left ? "transparent, #000 28px" : "#000, #000";
  const r = right ? "#000 calc(100% - 28px), transparent" : "#000, #000";
  return `linear-gradient(90deg, ${l}, ${r})`;
}

export function Datos() {
  const [tab, setTab] = useState<SubTab>(initialTab);
  const stripRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const [edges, setEdges] = useState({ left: false, right: true });

  function measure() {
    const el = stripRef.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }

  // Keep the chosen tab in view, centred, and re-measure the fades.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: first.current ? "auto" : "smooth" });
    first.current = false;
    measure();
  }, [tab]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const mask = edgeMask(edges.left, edges.right);

  return (
    <div className="enter flex flex-col gap-4">
      <PageHeader eyebrow="Progreso" title="Datos" />

      <div
        ref={stripRef}
        role="tablist"
        aria-label="Secciones de Datos"
        onScroll={measure}
        className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`glass tap-target flex-none rounded-full px-4 text-sm font-semibold ${tab === t.key ? "text-[var(--color-accent-text)]" : "text-[var(--color-muted)]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "semana" ? <SemanaTab /> : null}
      {tab === "peso" ? <PesoTab /> : null}
      {tab === "1rm" ? <UnoRMTab /> : null}
      {tab === "sueno" ? <SuenoTab /> : null}
      {tab === "volumen" ? <VolumenTab /> : null}
      {tab === "mouredev" ? <MoureDevTab /> : null}
      {tab === "medidas" ? <MedidasTab /> : null}
    </div>
  );
}
