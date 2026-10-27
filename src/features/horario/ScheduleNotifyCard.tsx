import { useState } from "react";
import { askNotificationPermission } from "@/lib/notifyPermission";
import { Switch } from "../perfil/Switch";
import { Button, Card } from "@/ui";
import { showToast } from "@/ui/Toast";
import { useNotifyPrefs } from "@/hooks/useScheduleNotifications";
import { fmtMin, nextReminder, notificationsSupported, sendNotification, setNotifyPrefs } from "@/lib/scheduleNotify";
import type { Lead, Scope } from "@/lib/scheduleNotify";

const LEADS: { value: Lead; label: string }[] = [
  { value: 0, label: "A la hora" },
  { value: 5, label: "5 min antes" },
  { value: 10, label: "10 min antes" },
];

const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "Todo el día" },
  { value: "main", label: "Solo lo importante" },
];

function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="glass-track grid gap-1 rounded-full p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`tap-target rounded-full px-2 text-sm font-semibold ${
            value === o.value ? "glass-on" : "glass-flat text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ScheduleNotifyCard() {
  const prefs = useNotifyPrefs();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    notificationsSupported() ? Notification.permission : "unsupported",
  );

  async function toggle() {
    if (prefs.enabled) {
      setNotifyPrefs({ enabled: false });
      showToast("Avisos del horario desactivados");
      return;
    }
    let perm = permission;
    if (perm === "default") {
      perm = await askNotificationPermission();
      setPermission(perm);
    }
    if (perm === "granted") {
      setNotifyPrefs({ enabled: true });
      showToast("Avisos del horario activados");
    } else {
      showToast("Necesito permiso de notificaciones");
    }
  }

  async function test() {
    const ok = await sendNotification("Toca: MoureDev · obligatorio", "Así te llegará cada bloque. Hazlo y marca tu X.", { tag: "performance-test" });
    showToast(ok ? "Prueba enviada" : "No se pudo enviar la notificación");
  }

  const next = prefs.enabled ? nextReminder(new Date(), prefs) : null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="card-title">Avisos del horario</h2>
          <p className="mt-1.5 text-sm leading-snug text-[var(--color-muted)]">Una notificación cuando empieza cada bloque que te toca hoy, para que no dependa de acordarte.</p>
        </div>
        <Switch checked={prefs.enabled} onChange={() => void toggle()} label="Avisos del horario" disabled={permission === "unsupported"} className="mt-0.5" />
      </div>

      {permission === "unsupported" ? (
        <p className="mt-3 text-sm leading-snug text-[var(--color-muted)]">Este navegador no admite notificaciones. En iPhone, instala la app en la pantalla de inicio primero.</p>
      ) : permission === "denied" ? (
        <p className="mt-3 text-sm leading-snug text-[var(--color-accent-text)]">Bloqueaste las notificaciones para este sitio. Habilítalas en los ajustes del navegador para usar los avisos.</p>
      ) : (
        <>
          {prefs.enabled ? (
            <div className="mt-4 flex flex-col gap-2.5">
              <Segmented label="Cuándo avisar" value={prefs.lead} options={LEADS} onChange={(lead) => setNotifyPrefs({ lead })} />
              <Segmented label="Qué avisar" value={prefs.scope} options={SCOPES} onChange={(scope) => setNotifyPrefs({ scope })} />
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--color-muted)]">
                  {next ? (
                    <>
                      Próximo aviso: <span className="num font-semibold text-[var(--color-ink)]">{fmtMin(next.fireMin)}</span> · {next.event.cell.text}
                    </>
                  ) : (
                    "No quedan avisos por hoy"
                  )}
                </span>
                <Button className="flex-none px-4" onClick={test}>
                  Probar
                </Button>
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-meta leading-snug text-[var(--color-muted)]">Llegan mientras la app esté abierta o instalada y en ejecución; si el sistema la cierra del todo, no puede avisarte.</p>
        </>
      )}
    </Card>
  );
}
