import { liveQuery } from "dexie";
import { db } from "@/db/db";
import type { AppConfigRecord } from "@/db/db";
import { applyRoutine, defaultRoutine, sanitizeRoutine } from "@/data/gym";
import type { RoutineConfig } from "@/data/gym";
import { applyHorario, defaultHorario, sanitizeHorario } from "@/data/horario";
import type { HorarioConfig } from "@/data/horario";
import { getUiPrefs, parseUiPrefs, setUiPrefs, subscribeUiPrefs } from "./uiPrefs";

/** The user's editable configuration — routine, weekly schedule, look-and-feel —
 * kept in IndexedDB (and synced like everything else) and pushed into the live
 * data modules the screens read. Anything missing or malformed falls back to
 * the built-in defaults, so a bad value can never break the app. */

export const CONFIG_ROUTINE = "routine";
export const CONFIG_HORARIO = "horario";
export const CONFIG_UI = "ui_prefs";

let version = 0;
const listeners = new Set<() => void>();
let lastRoutine = "";
let lastHorario = "";

/** Bumps whenever a live config changes, so screens can re-render. */
export function getConfigVersion(): number {
  return version;
}
export function subscribeConfig(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function bump() {
  version++;
  listeners.forEach((l) => l());
}

export function saveConfig(key: string, value: unknown): Promise<unknown> {
  return db.appConfig.put({ key, value, updatedAt: Date.now() });
}

/** Removes a saved config so the built-in default applies again. */
export function resetConfig(key: string): Promise<void> {
  return db.appConfig.delete(key);
}

export function saveRoutine(cfg: RoutineConfig): Promise<unknown> {
  return saveConfig(CONFIG_ROUTINE, cfg);
}
export function saveHorario(cfg: HorarioConfig): Promise<unknown> {
  return saveConfig(CONFIG_HORARIO, cfg);
}

/** Applies whatever is stored. Exported for tests and for the live subscription. */
export function applyStoredConfig(rows: AppConfigRecord[]): void {
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const routine = sanitizeRoutine(byKey.get(CONFIG_ROUTINE)?.value) ?? defaultRoutine();
  const routineJson = JSON.stringify(routine);
  let changed = false;
  if (routineJson !== lastRoutine) {
    lastRoutine = routineJson;
    applyRoutine(routine);
    changed = true;
  }

  const horario = sanitizeHorario(byKey.get(CONFIG_HORARIO)?.value) ?? defaultHorario();
  const horarioJson = JSON.stringify(horario);
  if (horarioJson !== lastHorario) {
    lastHorario = horarioJson;
    applyHorario(horario);
    changed = true;
  }

  // Look-and-feel follows the account: adopt what's stored (e.g. from another device).
  const ui = byKey.get(CONFIG_UI);
  if (ui) {
    const remote = parseUiPrefs(JSON.stringify(ui.value));
    if (JSON.stringify(remote) !== JSON.stringify(getUiPrefs())) setUiPrefs(remote);
  }

  if (changed) bump();
}

let started = false;

/** Starts applying stored config (and keeps doing so as it changes — including
 * changes that arrive through cloud sync). Call once at startup. */
export function initAppConfig(): void {
  if (started) return;
  started = true;
  liveQuery(() => db.appConfig.toArray()).subscribe({
    next: applyStoredConfig,
    error: (err) => console.error("Could not load saved configuration", err),
  });
  // Mirror local look-and-feel changes into the synced config.
  subscribeUiPrefs(() => {
    const prefs = getUiPrefs();
    void db.appConfig.get(CONFIG_UI).then((row) => {
      if (row && JSON.stringify(parseUiPrefs(JSON.stringify(row.value))) === JSON.stringify(prefs)) return;
      return saveConfig(CONFIG_UI, prefs);
    });
  });
}
