import Dexie from "dexie";
import { supabase } from "@/lib/supabase";
import { db } from "./db";
import { getSyncSnapshot, subscribeSyncStatus } from "./syncStatus";

const FLAG = "performance_restore_from_cloud";

/** True from the moment this device's local copy is wiped for a restore until the
 * first sync has brought the account's data back down — the demo data a fresh
 * install is seeded with must not be added meanwhile (it would be pushed to the
 * cloud as extra rows). */
export function isRestoring(): boolean {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export type CloudCheck = { ok: true; sets: number; days: number } | { ok: false; why: string };

/** Is there something in the account to restore from? Only reads. */
export async function checkCloud(): Promise<CloudCheck> {
  const client = supabase;
  if (!client) return { ok: false, why: "Esta copia de la app no está conectada a la nube." };
  try {
    const { data } = await client.auth.getSession();
    if (!data.session) return { ok: false, why: "No tienes la sesión iniciada." };
    const count = async (table: string) => {
      const { count: n, error } = await client.from(table).select("*", { count: "exact", head: true });
      if (error) throw error;
      return n ?? 0;
    };
    const [sets, days] = await Promise.all([count("sets"), count("habit_days")]);
    if (sets + days === 0) return { ok: false, why: "En la nube no hay datos guardados." };
    return { ok: true, sets, days };
  } catch (e) {
    return { ok: false, why: "No pude consultar la nube: " + (e instanceof Error ? e.message : String(e)) };
  }
}

/** Deletes this device's local database and reloads, so the account's data is pulled down fresh. */
export async function restoreFromCloud(): Promise<void> {
  localStorage.setItem(FLAG, "1");
  try {
    db.close();
    await Promise.race([
      Dexie.delete("performance-db"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("la base está bloqueada por otra ventana de la app")), 8000)),
    ]);
  } catch (e) {
    localStorage.removeItem(FLAG);
    throw e;
  }
  window.location.reload();
}

/** Ends the restore state once the first sync after it has finished. */
export function watchRestore(): void {
  if (!isRestoring()) return;
  const stop = subscribeSyncStatus(() => {
    const s = getSyncSnapshot();
    if (s.lastSyncedAt != null && s.state !== "error") {
      try {
        localStorage.removeItem(FLAG);
      } catch {
        /* nothing to clear */
      }
      stop();
    }
  });
}
