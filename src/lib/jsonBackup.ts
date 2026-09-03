import { db } from "@/db/db";
import { todayISO } from "./date";

export async function exportBackup(): Promise<void> {
  const data = {
    v: 1,
    exportedAt: new Date().toISOString(),
    sets: await db.sets.toArray(),
    habitDays: await db.habitDays.toArray(),
    weights: await db.weights.toArray(),
    sleep: await db.sleep.toArray(),
    savedVerses: await db.savedVerses.toArray(),
    moureWeeks: await db.moureWeeks.toArray(),
    settings: await db.settings.toArray(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `performance-datos-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== "object") throw new Error("Archivo no reconocido");
  await db.transaction("rw", [db.sets, db.habitDays, db.weights, db.sleep, db.savedVerses, db.moureWeeks, db.settings], async () => {
    if (Array.isArray(data.sets)) {
      await db.sets.clear();
      await db.sets.bulkAdd(data.sets.map(({ id: _id, ...rest }: Record<string, unknown>) => rest));
    }
    if (Array.isArray(data.habitDays)) await db.habitDays.bulkPut(data.habitDays);
    if (Array.isArray(data.weights)) {
      await db.weights.clear();
      await db.weights.bulkAdd(data.weights.map(({ id: _id, ...rest }: Record<string, unknown>) => rest));
    }
    if (Array.isArray(data.sleep)) {
      await db.sleep.clear();
      await db.sleep.bulkAdd(data.sleep.map(({ id: _id, ...rest }: Record<string, unknown>) => rest));
    }
    if (Array.isArray(data.savedVerses)) {
      await db.savedVerses.clear();
      await db.savedVerses.bulkAdd(data.savedVerses.map(({ id: _id, ...rest }: Record<string, unknown>) => rest));
    }
    if (Array.isArray(data.moureWeeks)) await db.moureWeeks.bulkPut(data.moureWeeks);
    if (Array.isArray(data.settings)) await db.settings.bulkPut(data.settings);
  });
}
