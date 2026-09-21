import { useState } from "react";
import { Eyebrow } from "@/ui";
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

export function Datos() {
  const [tab, setTab] = useState<SubTab>(initialTab);

  return (
    <div className="flex flex-col gap-4 enter">
      <div>
        <Eyebrow>Progreso</Eyebrow>
        <h1 className="font-[var(--font-display)] text-xl mt-1.5">Datos</h1>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tap-target flex-none rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide ${
              tab === t.key ? "glass-on" : "glass text-[var(--color-muted)]"
            }`}
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
