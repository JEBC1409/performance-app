import { useEffect, useState } from "react";
import { Button, Sheet } from "@/ui";
import { Icon } from "@/ui/Icon";
import { EmptyState } from "@/ui/EmptyState";
import type { EmptyIcon } from "@/ui/EmptyState";
import { GUIDE_EVENT, isOnboarded, markOnboarded, openPerfilSection } from "@/lib/onboarding";
import type { Tab } from "@/App";

interface Step {
  icon: EmptyIcon;
  title: string;
  text: string;
  go?: { label: string; tab: Tab; section?: string };
}

const STEPS: Step[] = [
  { icon: "target", title: "Bienvenido a PERFORMANCE", text: "Tus entrenos, hábitos, foco y horario en un solo lugar. Te muestro en 4 pasos cómo dejarla a tu medida; cada paso se puede saltar." },
  { icon: "dumbbell", title: "Tu rutina", text: "Elige tus ejercicios, series y pesos actuales. Con eso la app te sugiere cuánto cargar cada día.", go: { label: "Configurar mi rutina", tab: "perfil", section: "entreno" } },
  { icon: "check", title: "Tus hábitos", text: "Agrega los que sigues cada día (Biblia, MoureDev, agua…). Se marcan con un toque desde Hoy.", go: { label: "Configurar mis hábitos", tab: "perfil", section: "habitos" } },
  { icon: "chart", title: "Tu horario", text: "Ajusta los bloques de tu semana y activa los avisos para que la app te diga qué toca en cada momento.", go: { label: "Ver mi horario", tab: "horario" } },
];

/** A short first-run guide (and "Ver la guía" in Perfil): welcome plus the
 * three things that make the app yours — routine, habits, schedule. */
export function Guide({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [open, setOpen] = useState(() => !isOnboarded());
  const [step, setStep] = useState(0);

  useEffect(() => {
    const show = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(GUIDE_EVENT, show);
    return () => window.removeEventListener(GUIDE_EVENT, show);
  }, []);

  function close() {
    markOnboarded();
    setOpen(false);
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Sheet open={open} onClose={close} title={`Guía · ${step + 1} de ${STEPS.length}`}>
      <div className="flex flex-col gap-4">
        <EmptyState icon={s.icon} title={s.title} hint={s.text} />

        <div className="flex justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-[var(--color-red)]" : "w-1.5 bg-[var(--color-line-strong)]"}`} />
          ))}
        </div>

        {s.go ? (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              if (s.go?.section) openPerfilSection(s.go.section);
              close();
              onNavigate(s.go!.tab);
            }}
          >
            {s.go.label}
          </Button>
        ) : null}

        <div className="flex gap-2">
          <button onClick={close} className="glass tap-target rounded-full px-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            {last ? "Cerrar" : "Saltar guía"}
          </button>
          {!last ? (
            <button onClick={() => setStep(step + 1)} className={`tap-target flex flex-1 items-center justify-center gap-2 rounded-full text-[12px] font-semibold uppercase tracking-[0.1em] ${s.go ? "glass text-[var(--color-muted)]" : "glass-on"}`}>
              Siguiente <Icon name="arrow-right" size={14} />
            </button>
          ) : (
            <p className="flex-1 self-center text-center text-[11px] text-[var(--color-muted)]">Instálala en tu pantalla de inicio para tenerla como app.</p>
          )}
        </div>
      </div>
    </Sheet>
  );
}
