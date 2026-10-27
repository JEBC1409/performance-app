import { db } from "@/db/db";
import { uuid } from "./uuid";
import { todayISO } from "./date";

/** JSON backup of everything stored on the device.
 *
 * Import is "replace" for the tables that sync to the cloud by row id (sets,
 * focusSessions, weights, sleep, savedVerses: cleared, then the file's rows are
 * added) and "merge" for the keyed ones (habitDays, habitDefs, exercisePhotos,
 * appConfig, moureWeeks, settings, bibleReadDays: the file's rows are put over
 * what is there, rows not in the file stay). That is the long-standing behaviour
 * and it did not change.
 *
 * What did change: the file is validated first (validateBackup), and nothing is
 * written if it is malformed. Writes run in one Dexie transaction, so a failure
 * halfway rolls everything back.
 *
 * Cloud duplicates: id-keyed rows are pushed to Supabase under their `remoteId`.
 * Rows in the file that already carry a `remoteId` keep it (same id → the upload
 * overwrites the same cloud row, no duplicate). Rows without one (backups made
 * before remote ids existed) first try to reuse the `remoteId` of a row already on
 * this device with the same natural key (e.g. date + exercise + setIndex +
 * createdAt for sets); only if there is none do they get a fresh uuid. So
 * restoring an old backup on the device that made it doesn't duplicate rows in
 * the cloud, and anything unmatched is genuinely new. */

export const BACKUP_VERSION = 1;

type FieldKind = "string" | "date" | "number" | "boolean" | "stringArray" | "any";

interface TableSpec {
  /** Replaced on import (cleared, then added) vs merged (put over what's there). */
  mode: "replace" | "merge";
  /** Uploaded under a client-generated remoteId. */
  idKeyed: boolean;
  /** Must be present, with this type. */
  required: Record<string, FieldKind>;
  /** If present and not null, must have this type. */
  optional: Record<string, FieldKind>;
  /** Natural identity of a row, for reusing remote ids of rows that lack one. */
  natural?: (row: Record<string, unknown>) => string;
}

const join = (row: Record<string, unknown>, fields: string[]) => fields.map((f) => String(row[f] ?? "")).join("|");

const TABLES = {
  sets: {
    mode: "replace",
    idKeyed: true,
    required: { date: "date", exercise: "string", setIndex: "number", createdAt: "number" },
    optional: { remoteId: "string", day: "string", weight: "number", reps: "number", toFailure: "boolean", rpe: "number", note: "string" },
    natural: (r) => join(r, ["date", "exercise", "setIndex", "createdAt"]),
  },
  habitDays: { mode: "merge", idKeyed: false, required: { date: "date", done: "stringArray" }, optional: {} },
  habitDefs: { mode: "merge", idKeyed: false, required: { key: "string", label: "string", order: "number" }, optional: { icon: "string" } },
  focusSessions: {
    mode: "replace",
    idKeyed: true,
    required: { date: "date", minutes: "number", createdAt: "number" },
    optional: { remoteId: "string", task: "string" },
    natural: (r) => join(r, ["date", "task", "minutes", "createdAt"]),
  },
  exercisePhotos: { mode: "merge", idKeyed: false, required: { name: "string", dataUrl: "string" }, optional: { caption: "string" } },
  appConfig: { mode: "merge", idKeyed: false, required: { key: "string" }, optional: { updatedAt: "number", value: "any" } },
  weights: {
    mode: "replace",
    idKeyed: true,
    required: { date: "date" },
    optional: { remoteId: "string", weightKg: "number", pechoCm: "number", brazoCm: "number", note: "string" },
    natural: (r) => join(r, ["date", "weightKg", "pechoCm", "brazoCm", "note"]),
  },
  sleep: {
    mode: "replace",
    idKeyed: true,
    required: { date: "date" },
    optional: { remoteId: "string", hours: "number", bedTime: "string", wakeTime: "string", note: "string" },
    natural: (r) => join(r, ["date", "hours", "bedTime", "wakeTime", "note"]),
  },
  savedVerses: {
    mode: "replace",
    idKeyed: true,
    required: { abbrev: "string", chapter: "number", verse: "number", createdAt: "number" },
    optional: { remoteId: "string", bookName: "string", text: "string", note: "string" },
    natural: (r) => join(r, ["abbrev", "chapter", "verse", "createdAt"]),
  },
  moureWeeks: { mode: "merge", idKeyed: false, required: { week: "number" }, optional: { date: "string", topic: "string", hours: "number", project: "string", done: "boolean" } },
  settings: { mode: "merge", idKeyed: false, required: { id: "string" }, optional: { unit: "string", weeklyGoalKg: "number", defaultRestSec: "number", remindersEnabled: "boolean", seeded: "boolean" } },
  bibleReadDays: { mode: "merge", idKeyed: false, required: { date: "date" }, optional: {} },
} satisfies Record<string, TableSpec>;

export type BackupTable = keyof typeof TABLES;
export const BACKUP_TABLES = Object.keys(TABLES) as BackupTable[];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fits(value: unknown, kind: FieldKind): boolean {
  switch (kind) {
    case "any":
      return true;
    case "string":
      return typeof value === "string";
    case "date":
      return typeof value === "string" && ISO_DATE.test(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "stringArray":
      return Array.isArray(value) && value.every((x) => typeof x === "string");
  }
}

const KIND_LABEL: Record<FieldKind, string> = {
  string: "texto",
  date: "una fecha AAAA-MM-DD",
  number: "un número",
  boolean: "sí/no",
  stringArray: "una lista de textos",
  any: "cualquier valor",
};

const MAX_ERRORS = 8;

export interface Backup {
  v: number;
  exportedAt?: string;
  /** Only the known tables the file actually has. */
  tables: Partial<Record<BackupTable, Record<string, unknown>[]>>;
}

export type BackupValidation = { ok: true; backup: Backup; warnings: string[] } | { ok: false; errors: string[] };

/** Checks the shape of a parsed backup: supported version, known tables as
 * lists, and the basic types of each row's fields. Pure — touches nothing.
 * Error messages are in Spanish and meant to be shown to the user. */
export function validateBackup(json: unknown): BackupValidation {
  if (!isPlainObject(json)) return { ok: false, errors: ["El archivo no es una copia de PERFORMANCE (se esperaba un objeto JSON)."] };
  const errors: string[] = [];
  const warnings: string[] = [];

  let v = BACKUP_VERSION;
  if (json.v === undefined) warnings.push("El archivo no indica su versión; se tratará como la versión 1.");
  else if (typeof json.v !== "number" || !Number.isInteger(json.v) || json.v < 1) errors.push("La versión del archivo no es válida.");
  else if (json.v > BACKUP_VERSION) errors.push(`El archivo es de una versión más nueva (${json.v}) que la que entiende esta app (${BACKUP_VERSION}). Actualiza la app e inténtalo de nuevo.`);
  else v = json.v;

  const tables: Backup["tables"] = {};
  for (const name of BACKUP_TABLES) {
    const value = json[name];
    if (value === undefined || value === null) continue;
    if (!Array.isArray(value)) {
      errors.push(`«${name}» debería ser una lista.`);
      continue;
    }
    const spec: TableSpec = TABLES[name];
    value.forEach((row, i) => {
      const problem = rowProblem(row, spec);
      if (problem && errors.length < MAX_ERRORS) errors.push(`«${name}», fila ${i + 1}: ${problem}.`);
    });
    tables[name] = value as Record<string, unknown>[];
  }

  if (!errors.length && !Object.keys(tables).length) errors.push("El archivo no trae ninguna tabla conocida: no parece una copia de PERFORMANCE.");
  if (errors.length >= MAX_ERRORS) errors.push("Puede haber más problemas; corrige estos primero.");
  if (errors.length) return { ok: false, errors };

  const known = new Set<string>([...BACKUP_TABLES, "v", "exportedAt"]);
  const ignored = Object.keys(json).filter((k) => !known.has(k));
  if (ignored.length) warnings.push(`Se ignorarán datos que esta app no conoce: ${ignored.slice(0, 5).join(", ")}${ignored.length > 5 ? "…" : ""}.`);

  return { ok: true, backup: { v, exportedAt: typeof json.exportedAt === "string" ? json.exportedAt : undefined, tables }, warnings };
}

function rowProblem(row: unknown, spec: TableSpec): string | null {
  if (!isPlainObject(row)) return "no es un registro válido";
  for (const [field, kind] of Object.entries(spec.required)) {
    if (row[field] === undefined || row[field] === null) return `falta «${field}»`;
    if (!fits(row[field], kind)) return `«${field}» debería ser ${KIND_LABEL[kind]}`;
  }
  for (const [field, kind] of Object.entries(spec.optional)) {
    const x = row[field];
    if (x === undefined || x === null) continue;
    if (!fits(x, kind)) return `«${field}» debería ser ${KIND_LABEL[kind]}`;
    if (field === "remoteId" && x === "") return "«remoteId» está vacío";
  }
  return null;
}

export interface BackupPreview {
  ok: true;
  version: number;
  exportedAt?: string;
  /** Rows per known table in the file (0 for tables the file doesn't have). */
  counts: Record<BackupTable, number>;
  total: number;
  /** Tables whose current contents on this device would be erased and replaced. */
  replaces: BackupTable[];
  warnings: string[];
}

/** What importing this file would bring in, without touching anything. */
export function previewBackup(json: unknown): BackupPreview | { ok: false; errors: string[] } {
  const res = validateBackup(json);
  if (!res.ok) return res;
  const counts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, res.backup.tables[t]?.length ?? 0])) as Record<BackupTable, number>;
  const replaces = BACKUP_TABLES.filter((t) => TABLES[t].mode === "replace" && res.backup.tables[t] !== undefined);
  return { ok: true, version: res.backup.v, exportedAt: res.backup.exportedAt, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), replaces, warnings: res.warnings };
}

/** Thrown for any problem with a backup file; `errors` has every message, `message` the first. */
export class BackupError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(errors[0] ?? "Archivo no reconocido");
    this.name = "BackupError";
    this.errors = errors;
  }
}

/** Reads and parses a backup file. Throws BackupError (Spanish message) if it can't. */
export async function readBackupFile(file: File): Promise<unknown> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new BackupError(["No se pudo leer el archivo."]);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new BackupError(["El archivo no es un JSON válido: puede estar incompleto o dañado."]);
  }
}

export async function exportBackup(): Promise<void> {
  const data = {
    v: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    sets: await db.sets.toArray(),
    habitDays: await db.habitDays.toArray(),
    habitDefs: await db.habitDefs.toArray(),
    focusSessions: await db.focusSessions.toArray(),
    exercisePhotos: await db.exercisePhotos.toArray(),
    appConfig: await db.appConfig.toArray(),
    weights: await db.weights.toArray(),
    sleep: await db.sleep.toArray(),
    savedVerses: await db.savedVerses.toArray(),
    moureWeeks: await db.moureWeeks.toArray(),
    settings: await db.settings.toArray(),
    bibleReadDays: await db.bibleReadDays.toArray(),
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

/** Rows ready to add: local `id` dropped, and a remoteId guaranteed (kept, reused
 * from a matching row already on the device, or new). */
function withRemoteIds(rows: Record<string, unknown>[], natural: (r: Record<string, unknown>) => string, existing: { remoteId?: string }[]) {
  const known = new Map<string, string[]>();
  for (const e of existing) {
    if (!e.remoteId) continue;
    const k = natural(e as Record<string, unknown>);
    known.set(k, [...(known.get(k) ?? []), e.remoteId]);
  }
  // Ids the file already uses itself must not be handed out again.
  const taken = new Set(rows.map((r) => r.remoteId).filter((x): x is string => typeof x === "string"));
  return rows.map(({ id: _id, ...rest }) => {
    if (typeof rest.remoteId === "string" && rest.remoteId) return rest;
    const candidates = known.get(natural(rest)) ?? [];
    let reused: string | undefined;
    while (candidates.length && !reused) {
      const c = candidates.shift()!;
      if (!taken.has(c)) reused = c;
    }
    const remoteId = reused ?? uuid();
    taken.add(remoteId);
    return { ...rest, remoteId };
  });
}

/** Imports an already-parsed backup (see validateBackup). Throws BackupError and
 * writes nothing if it is malformed; otherwise replaces/merges as described at the top. */
export async function importBackupData(json: unknown): Promise<void> {
  const res = validateBackup(json);
  if (!res.ok) throw new BackupError(res.errors);
  const t = res.backup.tables;
  await db.transaction("rw", [db.sets, db.habitDays, db.habitDefs, db.focusSessions, db.exercisePhotos, db.appConfig, db.weights, db.sleep, db.savedVerses, db.moureWeeks, db.settings, db.bibleReadDays], async () => {
    if (t.sets) {
      const rows = withRemoteIds(t.sets, TABLES.sets.natural, await db.sets.toArray());
      await db.sets.clear();
      await db.sets.bulkAdd(rows as never[]);
    }
    if (t.habitDays) await db.habitDays.bulkPut(t.habitDays as never[]);
    if (t.habitDefs) await db.habitDefs.bulkPut(t.habitDefs as never[]);
    if (t.focusSessions) {
      const rows = withRemoteIds(t.focusSessions, TABLES.focusSessions.natural, await db.focusSessions.toArray());
      await db.focusSessions.clear();
      await db.focusSessions.bulkAdd(rows as never[]);
    }
    if (t.exercisePhotos) await db.exercisePhotos.bulkPut(t.exercisePhotos as never[]);
    if (t.appConfig) await db.appConfig.bulkPut(t.appConfig as never[]);
    if (t.weights) {
      const rows = withRemoteIds(t.weights, TABLES.weights.natural, await db.weights.toArray());
      await db.weights.clear();
      await db.weights.bulkAdd(rows as never[]);
    }
    if (t.sleep) {
      const rows = withRemoteIds(t.sleep, TABLES.sleep.natural, await db.sleep.toArray());
      await db.sleep.clear();
      await db.sleep.bulkAdd(rows as never[]);
    }
    if (t.savedVerses) {
      const rows = withRemoteIds(t.savedVerses, TABLES.savedVerses.natural, await db.savedVerses.toArray());
      await db.savedVerses.clear();
      await db.savedVerses.bulkAdd(rows as never[]);
    }
    if (t.moureWeeks) await db.moureWeeks.bulkPut(t.moureWeeks as never[]);
    if (t.settings) await db.settings.bulkPut(t.settings as never[]);
    if (t.bibleReadDays) await db.bibleReadDays.bulkPut(t.bibleReadDays as never[]);
  });
}

export async function importBackup(file: File): Promise<void> {
  await importBackupData(await readBackupFile(file));
}
