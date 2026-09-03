import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, type Unit } from "@/db/db";
import { Card, Eyebrow, Field, Input, Select, Button, Chip } from "@/ui";
import { showToast } from "@/ui/Toast";
import { useCycleSlot } from "@/hooks/useCycle";
import { exportBackup, importBackup } from "@/lib/jsonBackup";
import { importExcelFile } from "@/lib/excelImport";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function patch(fields: Partial<typeof DEFAULT_SETTINGS>) {
    const current = settings ?? DEFAULT_SETTINGS;
    await db.settings.put({ ...current, ...fields });
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

  return (
    <div className="flex flex-col gap-4 enter">
      <div>
        <Eyebrow>Perfil</Eyebrow>
        <h1 className="font-[var(--font-display)] text-xl mt-1.5">Configuración</h1>
      </div>

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
          <Field label="Meta semanal (kg)">
            <Input
              inputMode="decimal"
              defaultValue={settings?.weeklyGoalKg ?? DEFAULT_SETTINGS.weeklyGoalKg}
              onBlur={(e) => patch({ weeklyGoalKg: parseFloat(e.target.value) || DEFAULT_SETTINGS.weeklyGoalKg })}
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
