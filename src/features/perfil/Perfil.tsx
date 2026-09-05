import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, type Unit } from "@/db/db";
import { Card, Eyebrow, Field, Input, Select, Button, Chip, Stat } from "@/ui";
import { showToast } from "@/ui/Toast";
import { useCycleSlot } from "@/hooks/useCycle";
import { exportBackup, importBackup } from "@/lib/jsonBackup";
import { importExcelFile } from "@/lib/excelImport";
import { resizeImageToDataUrl } from "@/lib/image";
import { fromKg, toKg, unitLabel } from "@/lib/units";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { currentStreak } from "@/lib/streak";
import { useHabitDefs } from "@/hooks/useHabitDefs";
import { HabitManager } from "./HabitManager";

const HEAVY_DUTY_RULES = [
  "Pre-fatigá el músculo objetivo con una serie de aislamiento antes del compuesto principal.",
  "La última serie de cada ejercicio va al fallo muscular, con negativas de 4 segundos cuando aplique.",
  "Ciclo A → B → C → descanso → repetir. No se entrena el mismo grupo dos días seguidos.",
  "Dropsets de 50% de carga solo en los ejercicios marcados explícitamente.",
  "Cardio 3x/semana: 15-20 min de caminata inclinada, sin correr.",
];

export function Perfil() {
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const slot = useCycleSlot();
  const { session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const totalSets = useLiveQuery(() => db.sets.count(), []);
  const habitDays = useLiveQuery(() => db.habitDays.toArray(), []);
  const habitDefs = useHabitDefs();
  const bestStreak = habitDays && habitDefs ? Math.max(0, ...habitDefs.map((h) => currentStreak(habitDays, h.key))) : 0;

  async function patch(fields: Partial<typeof DEFAULT_SETTINGS>) {
    const current = settings ?? DEFAULT_SETTINGS;
    await db.settings.put({ ...current, ...fields });
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      await patch({ avatarDataUrl: dataUrl });
      showToast("Foto de perfil actualizada");
    } catch {
      showToast("No se pudo procesar la imagen");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function enableReminders() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      await patch({ remindersEnabled: true });
      showToast("Recordatorios activados");
    } else {
      showToast("Permiso de notificaciones denegado");
    }
  }

  async function onImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await importBackup(file);
      showToast("Datos importados");
    } catch {
      showToast("No se pudo leer el archivo");
    }
  }

  async function onImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const summary = await importExcelFile(file);
      showToast(`Importado: ${summary.sets} series, ${summary.weights} pesos, ${summary.moureWeeks} semanas`);
    } catch {
      showToast("No se pudo leer el Excel");
    } finally {
      setImporting(false);
    }
  }

  const unit: Unit = settings?.unit ?? DEFAULT_SETTINGS.unit;
  const displayName = settings?.displayName ?? "";
  const avatarUrl = settings?.avatarDataUrl ?? null;
  const initials = (displayName || session?.user.email || "P").trim().charAt(0).toUpperCase();
  const memberSince = session?.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "short" })
    : "—";

  return (
    <div className="flex flex-col gap-4 enter">
      <div>
        <Eyebrow>Perfil</Eyebrow>
        <h1 className="font-[var(--font-display)] text-xl mt-1.5">Configuración</h1>
      </div>

      <Card className="panel-surface-glow">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            disabled={uploadingAvatar}
            className="group relative flex-none disabled:opacity-60"
            aria-label="Cambiar foto de perfil"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full border-2 border-[var(--color-red)] object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--color-line-strong)] bg-[var(--color-surface-2)] text-[20px] font-bold text-[var(--color-red)]">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-red)] text-[11px] font-bold text-white transition-colors group-hover:brightness-110">
              +
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <input
              key={displayName}
              defaultValue={displayName}
              onBlur={(e) => patch({ displayName: e.target.value })}
              placeholder="Tu nombre"
              className="w-full bg-transparent text-[16px] font-bold outline-none focus:text-[var(--color-red)]"
            />
            <div className="truncate text-[11.5px] text-[var(--color-muted)] mt-0.5">{session?.user.email}</div>
            <div className="text-[10px] text-[var(--color-muted-2)] mt-1 uppercase tracking-wide num">Miembro desde {memberSince}</div>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
      </Card>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Series totales" value={totalSets ?? 0} accent />
        <Stat label="Racha activa" value={`${bestStreak}d`} />
        <Stat label="Ciclo" value={slot === "rest" ? "Descanso" : slot} />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <Eyebrow accent>Cuenta</Eyebrow>
          <Chip tone="good">Conectado</Chip>
        </div>
        <p className="text-[13px] mt-2">{session?.user.email}</p>
        <Button className="mt-3 w-full" onClick={() => supabase?.auth.signOut()}>
          Cerrar sesión
        </Button>
      </Card>

      <Card>
        <Eyebrow accent>Ciclo actual</Eyebrow>
        <div className="mt-2 flex items-center gap-2">
          <Chip tone="accent">{slot === "rest" ? "Descanso" : `Día ${slot}`}</Chip>
          <span className="text-[11.5px] text-[var(--color-muted)]">A → B → C → descanso → repetir</span>
        </div>
      </Card>

      <Card>
        <Eyebrow>Preferencias</Eyebrow>
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <Field label="Unidad de peso">
            <Select value={unit} onChange={(e) => patch({ unit: e.target.value as Unit })}>
              <option value="kg">Kilogramos (kg)</option>
              <option value="lb">Libras (lb)</option>
            </Select>
          </Field>
          <Field label={`Meta semanal (${unitLabel(unit)})`}>
            <Input
              key={unit}
              inputMode="decimal"
              defaultValue={fromKg(settings?.weeklyGoalKg ?? DEFAULT_SETTINGS.weeklyGoalKg, unit)}
              onBlur={(e) => {
                const typed = parseFloat(e.target.value);
                patch({ weeklyGoalKg: Number.isNaN(typed) ? DEFAULT_SETTINGS.weeklyGoalKg : toKg(typed, unit) });
              }}
            />
          </Field>
          <Field label="Descanso por defecto (seg)">
            <Input
              inputMode="numeric"
              defaultValue={settings?.defaultRestSec ?? DEFAULT_SETTINGS.defaultRestSec}
              onBlur={(e) => patch({ defaultRestSec: parseInt(e.target.value, 10) || DEFAULT_SETTINGS.defaultRestSec })}
            />
          </Field>
          <Field label="Sin celular desde">
            <Input type="time" defaultValue={settings?.noPhoneTime ?? DEFAULT_SETTINGS.noPhoneTime} onBlur={(e) => patch({ noPhoneTime: e.target.value })} />
          </Field>
          <Field label="Hora de dormir">
            <Input type="time" defaultValue={settings?.sleepTime ?? DEFAULT_SETTINGS.sleepTime} onBlur={(e) => patch({ sleepTime: e.target.value })} />
          </Field>
        </div>
      </Card>

      <HabitManager />

      <Card>
        <div className="flex items-center justify-between">
          <Eyebrow accent>Recordatorios</Eyebrow>
          {permission === "granted" ? (
            <Chip tone="good">Activos</Chip>
          ) : permission === "denied" ? (
            <Chip tone="bad">Bloqueados</Chip>
          ) : permission === "unsupported" ? (
            <Chip tone="neutral">No disponible</Chip>
          ) : (
            <Chip tone="neutral">Inactivos</Chip>
          )}
        </div>
        <p className="text-[12px] text-[var(--color-muted)] mt-2">
          Avisa con una notificación cuando llega la hora de guardar el celular ({settings?.noPhoneTime ?? DEFAULT_SETTINGS.noPhoneTime}) y la hora
          de dormir ({settings?.sleepTime ?? DEFAULT_SETTINGS.sleepTime}). Solo funciona con la app abierta en el navegador.
        </p>
        {permission === "granted" ? (
          <Button
            className="mt-3 w-full"
            onClick={() => patch({ remindersEnabled: !(settings?.remindersEnabled ?? true) })}
          >
            {settings?.remindersEnabled ?? true ? "Desactivar" : "Reactivar"}
          </Button>
        ) : permission === "denied" ? (
          <p className="text-[11.5px] text-[var(--color-red)] mt-3">
            Bloqueaste las notificaciones para este sitio. Habilitalas desde los ajustes del navegador para reactivarlas.
          </p>
        ) : permission === "unsupported" ? null : (
          <Button variant="primary" className="mt-3 w-full" onClick={enableReminders}>
            Activar notificaciones
          </Button>
        )}
      </Card>

      <Card>
        <Eyebrow>Reglas Heavy Duty</Eyebrow>
        <ul className="mt-2.5 flex flex-col gap-2">
          {HEAVY_DUTY_RULES.map((rule) => (
            <li key={rule} className="text-[12.5px] text-[var(--color-muted)] flex gap-2">
              <span className="text-[var(--color-red)] flex-none">—</span>
              {rule}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <Eyebrow>Datos</Eyebrow>
        <div className="flex flex-col gap-2 mt-3">
          <Button onClick={exportBackup}>Exportar todo (.json)</Button>
          <Button onClick={() => fileRef.current?.click()}>Importar backup (.json)</Button>
          <Button onClick={() => excelRef.current?.click()} disabled={importing}>
            {importing ? "Importando…" : "Importar Excel original (.xlsx)"}
          </Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImportJson} />
          <input ref={excelRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImportExcel} />
        </div>
      </Card>
    </div>
  );
}
