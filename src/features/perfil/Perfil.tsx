import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, type Unit } from "@/db/db";
import { Card, PageHeader, Input, Button, Chip, Stat } from "@/ui";
import { useUiPrefs } from "@/hooks/useUiPrefs";
import { ACCENTS, setUiPrefs } from "@/lib/uiPrefs";
import { tonightBedtime } from "@/lib/smartSleep";
import { showToast } from "@/ui/Toast";
import { setCycleSlot, useCycleSlot } from "@/hooks/useCycle";
import { BackupError, exportBackup, importBackupData, previewBackup, readBackupFile } from "@/lib/jsonBackup";
import { askNotificationPermission } from "@/lib/notifyPermission";
import { importExcelFile } from "@/lib/excelImport";
import { resizeImageToDataUrl } from "@/lib/image";
import { fromKg, toKg, unitLabel } from "@/lib/units";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { currentStreak } from "@/lib/streak";
import { useHabitDefs } from "@/hooks/useHabitDefs";
import { HabitManager } from "./HabitManager";
import { AppearanceCard } from "./AppearanceCard";
import { Section } from "@/ui/Section";
import { requestGuide } from "@/lib/onboarding";
import { RoutineEditor } from "./RoutineEditor";
import { Switch, SettingRow } from "./Switch";
import { ImportBackupSheet, type PendingImport } from "./ImportBackupSheet";
import { GYM_DAY_ORDER, currentRoutineConfig } from "@/data/gym";
import { useConfigVersion } from "@/hooks/useConfigVersion";

const HEAVY_DUTY_RULES = [
  "Pre-fatiga el músculo objetivo con una serie de aislamiento antes del compuesto principal.",
  "La última serie de cada ejercicio va al fallo muscular, con negativas de 4 segundos cuando aplique.",
  "Ciclo A → B → C → descanso → repetir. No se entrena el mismo grupo dos días seguidos.",
  "Dropsets de 50% de carga solo en los ejercicios marcados explícitamente.",
  "Cardio 3x/semana: 15-20 min de caminata inclinada, sin correr.",
];

export function Perfil() {
  useConfigVersion(); // the Entrenamiento summary follows routine edits
  const uiPrefs = useUiPrefs();
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const slot = useCycleSlot();
  const { session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingImport, setPendingImport] = useState<(PendingImport & { json: unknown }) | null>(null);
  const [applyingImport, setApplyingImport] = useState(false);
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
    const result = await askNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      await patch({ remindersEnabled: true });
      showToast("Recordatorios activados");
    } else if (result === "unsupported") {
      showToast("Este navegador no admite notificaciones");
    } else {
      showToast("Permiso de notificaciones denegado");
    }
  }

  // Picking a file only reads and checks it: nothing is written until the person confirms in the sheet.
  async function onImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const json = await readBackupFile(file);
      const preview = previewBackup(json);
      if (!preview.ok) throw new BackupError(preview.errors);
      const tables = db as unknown as Record<string, { count(): Promise<number> }>;
      const current: PendingImport["current"] = {};
      for (const t of preview.replaces) current[t] = await tables[t].count();
      setPendingImport({ fileName: file.name, preview, current, json });
    } catch (err) {
      showToast(err instanceof BackupError ? err.message : "No se pudo leer el archivo");
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    setApplyingImport(true);
    try {
      await importBackupData(pendingImport.json);
      showToast(`Datos importados: ${pendingImport.preview.total} registros`);
      setPendingImport(null);
    } catch (err) {
      showToast(err instanceof BackupError ? err.message : "No se pudo importar. No se cambió nada.");
    } finally {
      setApplyingImport(false);
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
  const bedtime = tonightBedtime();
  const restSec = settings?.defaultRestSec ?? DEFAULT_SETTINGS.defaultRestSec;
  const sleepTime = settings?.sleepTime ?? DEFAULT_SETTINGS.sleepTime;
  const noPhoneTime = settings?.noPhoneTime ?? DEFAULT_SETTINGS.noPhoneTime;
  const remindersOn = permission === "granted" && (settings?.remindersEnabled ?? true);
  const routine = currentRoutineConfig();
  const routineSummary = `${GYM_DAY_ORDER.map((d) => `${d} ${routine[d].ex.length}`).join(" · ")} ejercicios`;
  const themeLabel = uiPrefs.theme === "dark" ? "oscuro" : uiPrefs.theme === "light" ? "claro" : "automático";
  const appearanceSummary = `${ACCENTS.find((a) => a.key === uiPrefs.accent)?.label ?? "Rojo"} · tema ${themeLabel}${uiPrefs.calm ? " · sobrio" : ""}`;
  const slotLabel = slot === "rest" ? "descanso" : `día ${slot}`;

  return (
    <div className="flex flex-col gap-4 enter">
      <PageHeader eyebrow="Perfil" title="Configuración" />

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
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full border-2 border-[var(--color-accent-text)] object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--color-line-strong)] bg-[var(--color-surface-2)] text-title font-bold text-[var(--color-accent-text)]">
                {initials}
              </div>
            )}
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--accent-solid-rgb))] text-meta font-bold text-[var(--text-on-accent)] transition-[filter] group-hover:brightness-110"
            >
              +
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <input
              key={displayName}
              defaultValue={displayName}
              onBlur={(e) => patch({ displayName: e.target.value })}
              placeholder="Tu nombre"
              aria-label="Tu nombre"
              maxLength={40}
              className="min-h-[var(--control-h)] w-full bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-[var(--color-muted-2)]"
            />
            <div className="truncate text-meta text-[var(--color-muted)]">{session?.user.email}</div>
            <div className="num mt-0.5 text-meta text-[var(--color-muted-2)]">Miembro desde {memberSince}</div>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
      </Card>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Series totales" value={totalSets ?? 0} />
        <Stat label="Racha activa" value={`${bestStreak}d`} />
        <Stat label="Ciclo" value={slot === "rest" ? "Descanso" : slot} />
      </div>

      <div className="flex flex-col gap-3">
        <Section id="ajustes" title="Ajustes" summary={`${unitLabel(unit)} · descanso ${restSec}s · dormir ${sleepTime}`} defaultOpen>
          <Card>
            <div className="flex flex-col divide-y divide-[var(--color-line)]">
              <SettingRow label="Unidad de peso">
                <div role="group" aria-label="Unidad de peso" className="grid grid-cols-2 gap-2">
                  {(["kg", "lb"] as const).map((u) => (
                    <Button key={u} selected={unit === u} onClick={() => patch({ unit: u })} className="px-0">
                      {u}
                    </Button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow control="field" label={`Meta semanal (${unitLabel(unit)})`}>
                <Input
                  key={unit}
                  inputMode="decimal"
                  className="w-full"
                  defaultValue={fromKg(settings?.weeklyGoalKg ?? DEFAULT_SETTINGS.weeklyGoalKg, unit)}
                  onBlur={(e) => {
                    const typed = parseFloat(e.target.value);
                    patch({ weeklyGoalKg: Number.isNaN(typed) ? DEFAULT_SETTINGS.weeklyGoalKg : toKg(typed, unit) });
                  }}
                />
              </SettingRow>
              <SettingRow control="field" label="Descanso por defecto">
                <span className="relative block">
                  <Input
                    inputMode="numeric"
                    aria-label="Descanso por defecto, en segundos"
                    className="w-full pr-11"
                    defaultValue={restSec}
                    onBlur={(e) => patch({ defaultRestSec: parseInt(e.target.value, 10) || DEFAULT_SETTINGS.defaultRestSec })}
                  />
                  <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">
                    seg
                  </span>
                </span>
              </SettingRow>
              <SettingRow control="field" label="Sin celular desde">
                <Input type="time" className="w-full" defaultValue={noPhoneTime} onBlur={(e) => patch({ noPhoneTime: e.target.value })} />
              </SettingRow>
              <SettingRow control="field" label="Hora de dormir">
                <Input type="time" className="w-full" defaultValue={sleepTime} onBlur={(e) => patch({ sleepTime: e.target.value })} />
              </SettingRow>
              <SettingRow
                label="Hora de dormir automática"
                help={
                  uiPrefs.autoSleep
                    ? bedtime
                      ? `Esta noche te aviso a las ${bedtime.bedtime} (mañana despiertas a las ${bedtime.wake}).`
                      : "Mañana no hay bloque de despertar en tu horario: uso la hora fija de arriba."
                    : "Se calcula con la hora a la que te levantas mañana, según tu horario."
                }
              >
                <Switch checked={uiPrefs.autoSleep} onChange={(v) => setUiPrefs({ autoSleep: v })} label="Hora de dormir automática" />
              </SettingRow>
              <SettingRow label="Descanso corto en aislamiento" help="En curls, laterales, extensiones… descansas 90 s como máximo. En los compuestos, tu descanso de arriba.">
                <Switch checked={uiPrefs.restShort} onChange={(v) => setUiPrefs({ restShort: v })} label="Descanso corto en aislamiento" />
              </SettingRow>
            </div>
          </Card>
        </Section>

        <Section id="entreno" title="Entrenamiento" summary={routineSummary}>
          <RoutineEditor />
          <Card>
            <h2 className="card-title">Reglas Heavy Duty</h2>
            <ul className="mt-2.5 flex flex-col gap-2">
              {HEAVY_DUTY_RULES.map((rule) => (
                <li key={rule} className="flex gap-2 text-sm leading-snug text-[var(--color-muted)]">
                  <span aria-hidden className="flex-none text-[var(--color-accent-text)]">
                    —
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </Card>
        </Section>

        <Section id="habitos" title="Hábitos y avisos" summary={`${habitDefs?.length ?? 0} hábitos · recordatorios ${remindersOn ? "activos" : "inactivos"}`}>
          <HabitManager />
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="card-title">Recordatorios</h2>
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
            <p className="mt-2 text-sm leading-snug text-[var(--color-muted)]">
              Avisa con una notificación cuando llega la hora de guardar el celular ({noPhoneTime}) y la hora de dormir ({sleepTime}). Solo funciona con la app abierta en el navegador.
            </p>
            {permission === "granted" ? (
              <Button className="mt-3 w-full" onClick={() => patch({ remindersEnabled: !(settings?.remindersEnabled ?? true) })}>
                {settings?.remindersEnabled ?? true ? "Desactivar" : "Reactivar"}
              </Button>
            ) : permission === "denied" ? (
              <p className="mt-3 text-sm leading-snug text-[var(--color-accent-text)]">
                Bloqueaste las notificaciones para este sitio. Habilítalas desde los ajustes del navegador para reactivarlas.
              </p>
            ) : permission === "unsupported" ? null : (
              <Button variant="primary" className="mt-3 w-full" onClick={enableReminders}>
                Activar notificaciones
              </Button>
            )}
          </Card>
        </Section>

        <Section id="apariencia" title="Apariencia" summary={appearanceSummary}>
          <AppearanceCard />
        </Section>

        <Section id="cuenta" title="Cuenta y datos" summary={`${session?.user.email ?? "Tu cuenta"} · ciclo en ${slotLabel}`}>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="card-title">Cuenta</h2>
              <Chip tone="good">Conectado</Chip>
            </div>
            <p className="mt-2 break-all text-sm">{session?.user.email}</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button className="w-full" onClick={requestGuide}>
                Ver la guía de inicio
              </Button>
              <Button className="w-full" onClick={() => supabase?.auth.signOut()}>
                Cerrar sesión
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="card-title">Ciclo actual</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Chip tone="accent">{slot === "rest" ? "Descanso" : `Día ${slot}`}</Chip>
              <span className="text-meta text-[var(--color-muted)]">A → B → C → descanso → repetir</span>
            </div>
            <p className="mt-3 text-sm leading-snug text-[var(--color-muted)]">¿Te toca otro día hoy? Cámbialo y el ciclo sigue desde ahí.</p>
            <div role="group" aria-label="Día que te toca" className="mt-2 grid grid-cols-[1fr_1fr_1fr_1.9fr] gap-2">
              {(["A", "B", "C", "rest"] as const).map((s) => (
                <Button
                  key={s}
                  selected={slot === s}
                  className="px-1"
                  onClick={() => {
                    void setCycleSlot(s);
                    showToast(s === "rest" ? "Hoy toca descanso" : `Te toca el día ${s}`);
                  }}
                >
                  {s === "rest" ? "Descanso" : s}
                </Button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="card-title">Copia de seguridad</h2>
            <p className="mt-1.5 text-sm leading-snug text-[var(--color-muted)]">Al importar una copia, antes verás qué se reemplaza y qué se combina, y confirmas.</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button onClick={exportBackup}>Exportar todo (.json)</Button>
              <Button onClick={() => fileRef.current?.click()}>Importar backup (.json)</Button>
              <Button onClick={() => excelRef.current?.click()} disabled={importing}>
                {importing ? "Importando…" : "Importar Excel original (.xlsx)"}
              </Button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportJson} />
              <input ref={excelRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImportExcel} />
            </div>
          </Card>
        </Section>
      </div>

      <ImportBackupSheet
        pending={pendingImport}
        busy={applyingImport}
        onClose={() => !applyingImport && setPendingImport(null)}
        onConfirm={confirmImport}
        onExport={() => void exportBackup()}
      />
    </div>
  );
}
