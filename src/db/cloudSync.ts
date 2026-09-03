import type { Table } from "dexie";
import { supabase } from "@/lib/supabase";
import {
  db,
  type SetRecord,
  type HabitDayRecord,
  type WeightRecord,
  type SleepRecord,
  type SavedVerseRecord,
  type MoureWeekRecord,
  type SettingsRecord,
} from "./db";

/** Mirrors every local Dexie table to the matching Supabase table (see
 * src/db/drizzle/schema.ts) for the signed-in user, so the same account sees
 * its data on any device. Local IndexedDB stays the source of truth the UI
 * reads from (via useLiveQuery) — this module only keeps Supabase in sync
 * with it: push local writes out as they happen, and on sign-in either seed
 * the cloud from this device (first device, cloud is empty) or pull the
 * cloud down (an existing account, cloud wins).
 *
 * Known gap: "Importar backup" replaces tables with Table.clear(), which
 * doesn't fire Dexie's `deleting` hook — rows removed that way stay behind
 * in the cloud. Not worth solving for a rarely-used manual-restore path. */

let currentUserId: string | null = null;
let suppressHooks = false;

async function withHooksSuppressed(fn: () => Promise<void>) {
  suppressHooks = true;
  try {
    await fn();
  } finally {
    suppressHooks = false;
  }
}

// ---------- field mapping (local camelCase <-> remote snake_case) ----------

function toRemoteSet(row: SetRecord, userId: string) {
  return {
    id: row.remoteId,
    user_id: userId,
    date: row.date,
    day: row.day,
    exercise: row.exercise,
    set_index: row.setIndex,
    weight: row.weight,
    reps: row.reps,
    to_failure: row.toFailure,
    rpe: row.rpe,
    note: row.note,
    created_at: new Date(row.createdAt).toISOString(),
  };
}
function fromRemoteSet(row: Record<string, unknown>): SetRecord {
  return {
    remoteId: row.id as string,
    date: row.date as string,
    day: row.day as SetRecord["day"],
    exercise: row.exercise as string,
    setIndex: row.set_index as number,
    weight: row.weight as number | null,
    reps: row.reps as number | null,
    toFailure: row.to_failure as boolean | null,
    rpe: row.rpe as number | null,
    note: row.note as string,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

function toRemoteHabitDay(row: HabitDayRecord, userId: string) {
  return { user_id: userId, date: row.date, sleep: row.sleep, water: row.water, meals: row.meals, nophone: row.nophone };
}
function fromRemoteHabitDay(row: Record<string, unknown>): HabitDayRecord {
  return { date: row.date as string, sleep: row.sleep as boolean, water: row.water as boolean, meals: row.meals as boolean, nophone: row.nophone as boolean };
}

function toRemoteWeight(row: WeightRecord, userId: string) {
  return { id: row.remoteId, user_id: userId, date: row.date, weight_kg: row.weightKg, pecho_cm: row.pechoCm, brazo_cm: row.brazoCm, note: row.note };
}
function fromRemoteWeight(row: Record<string, unknown>): WeightRecord {
  return { remoteId: row.id as string, date: row.date as string, weightKg: row.weight_kg as number | null, pechoCm: row.pecho_cm as number | null, brazoCm: row.brazo_cm as number | null, note: row.note as string };
}

function toRemoteSleep(row: SleepRecord, userId: string) {
  return { id: row.remoteId, user_id: userId, date: row.date, hours: row.hours, bed_time: row.bedTime, wake_time: row.wakeTime, note: row.note };
}
function fromRemoteSleep(row: Record<string, unknown>): SleepRecord {
  return { remoteId: row.id as string, date: row.date as string, hours: row.hours as number | null, bedTime: row.bed_time as string, wakeTime: row.wake_time as string, note: row.note as string };
}

function toRemoteSavedVerse(row: SavedVerseRecord, userId: string) {
  return {
    id: row.remoteId,
    user_id: userId,
    abbrev: row.abbrev,
    book_name: row.bookName,
    chapter: row.chapter,
    verse: row.verse,
    text: row.text,
    note: row.note,
    created_at: new Date(row.createdAt).toISOString(),
  };
}
function fromRemoteSavedVerse(row: Record<string, unknown>): SavedVerseRecord {
  return {
    remoteId: row.id as string,
    abbrev: row.abbrev as string,
    bookName: row.book_name as string,
    chapter: row.chapter as number,
    verse: row.verse as number,
    text: row.text as string,
    note: row.note as string,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

function toRemoteMoureWeek(row: MoureWeekRecord, userId: string) {
  return { user_id: userId, week: row.week, date: row.date, topic: row.topic, hours: row.hours, project: row.project, done: row.done };
}
function fromRemoteMoureWeek(row: Record<string, unknown>): MoureWeekRecord {
  return { week: row.week as number, date: row.date as string, topic: row.topic as string, hours: row.hours as number | null, project: row.project as string, done: row.done as boolean };
}

function toRemoteSettings(row: SettingsRecord, userId: string) {
  return {
    user_id: userId,
    unit: row.unit,
    weekly_goal_kg: row.weeklyGoalKg,
    default_rest_sec: row.defaultRestSec,
    reminders_enabled: row.remindersEnabled,
    no_phone_time: row.noPhoneTime,
    sleep_time: row.sleepTime,
    seeded: row.seeded,
    display_name: row.displayName ?? "",
    avatar_data_url: row.avatarDataUrl ?? null,
  };
}
function fromRemoteSettings(row: Record<string, unknown>): SettingsRecord {
  return {
    id: "app",
    unit: row.unit as SettingsRecord["unit"],
    weeklyGoalKg: row.weekly_goal_kg as number,
    defaultRestSec: row.default_rest_sec as number,
    remindersEnabled: row.reminders_enabled as boolean,
    noPhoneTime: row.no_phone_time as string,
    sleepTime: row.sleep_time as string,
    seeded: row.seeded as boolean,
    displayName: row.display_name as string,
    avatarDataUrl: row.avatar_data_url as string | null,
  };
}

// ---------- generic per-table sync ----------

/** Deliberately loose: this config drives a generic sync loop over six
 * structurally unrelated Dexie tables, so the row/key types below are `any`
 * at this boundary — each toRemote/fromRemote pair above is still fully
 * typed at its own definition, which is where the real safety matters. */
interface TableSync {
  remoteTable: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  localTable: Table<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toRemote: (row: any, userId: string) => Record<string, unknown>;
  fromRemote: (row: Record<string, unknown>) => unknown;
  /** How to reach this row again to delete/update it remotely, given the
   * local primary key and the full object being removed. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  remoteMatch: (primKey: any, obj: any) => Record<string, unknown>;
  /** True when the local primary key is Dexie's own auto-increment number and
   * the row instead carries a client-generated `remoteId` uuid shared with
   * the Supabase row's id — merges then have to match rows up by remoteId
   * instead of assuming the local and remote primary keys line up. */
  idKeyed: boolean;
}

const setsSync: TableSync = { remoteTable: "sets", localTable: db.sets, toRemote: toRemoteSet, fromRemote: fromRemoteSet, remoteMatch: (_key, obj) => ({ id: obj.remoteId }), idKeyed: true };
const habitDaysSync: TableSync = { remoteTable: "habit_days", localTable: db.habitDays, toRemote: toRemoteHabitDay, fromRemote: fromRemoteHabitDay, remoteMatch: (date) => ({ date }), idKeyed: false };
const weightsSync: TableSync = { remoteTable: "weights", localTable: db.weights, toRemote: toRemoteWeight, fromRemote: fromRemoteWeight, remoteMatch: (_key, obj) => ({ id: obj.remoteId }), idKeyed: true };
const sleepSync: TableSync = { remoteTable: "sleep", localTable: db.sleep, toRemote: toRemoteSleep, fromRemote: fromRemoteSleep, remoteMatch: (_key, obj) => ({ id: obj.remoteId }), idKeyed: true };
const savedVersesSync: TableSync = { remoteTable: "saved_verses", localTable: db.savedVerses, toRemote: toRemoteSavedVerse, fromRemote: fromRemoteSavedVerse, remoteMatch: (_key, obj) => ({ id: obj.remoteId }), idKeyed: true };
const moureWeeksSync: TableSync = { remoteTable: "moure_weeks", localTable: db.moureWeeks, toRemote: toRemoteMoureWeek, fromRemote: fromRemoteMoureWeek, remoteMatch: (week) => ({ week }), idKeyed: false };

const COLLECTION_TABLES: TableSync[] = [setsSync, habitDaysSync, weightsSync, sleepSync, savedVersesSync, moureWeeksSync];

/** Id-keyed tables can't just bulkPut incoming remote rows — the local
 * primary key is an unrelated auto-increment number, so each remote row has
 * to be matched to its local counterpart (if any) by `remoteId` first. */
async function mergeByRemoteId(cfg: TableSync, remoteRows: Record<string, unknown>[]) {
  for (const remoteRow of remoteRows) {
    const local = cfg.fromRemote(remoteRow) as { remoteId?: string };
    if (!local.remoteId) continue;
    const existing = await cfg.localTable.where("remoteId").equals(local.remoteId).first();
    if (existing) {
      await cfg.localTable.update(existing.id, local);
    } else {
      await cfg.localTable.add(local);
    }
  }
}

async function syncCollection(cfg: TableSync, userId: string) {
  if (!supabase) return;
  const { data, error } = await supabase.from(cfg.remoteTable).select("*");
  if (error) throw error;
  if (!data || data.length === 0) {
    const local = await cfg.localTable.toArray();
    if (local.length > 0) {
      const rows = local.map((row) => cfg.toRemote(row, userId));
      const { error: upErr } = await supabase.from(cfg.remoteTable).upsert(rows);
      if (upErr) throw upErr;
    }
  } else {
    await withHooksSuppressed(async () => {
      if (cfg.idKeyed) {
        await mergeByRemoteId(cfg, data);
      } else {
        await cfg.localTable.bulkPut(data.map((row) => cfg.fromRemote(row)));
      }
    });
  }
}

async function syncSettings(userId: string) {
  if (!supabase) return;
  const { data, error } = await supabase.from("settings").select("*").maybeSingle();
  if (error) throw error;
  if (!data) {
    const local = await db.settings.get("app");
    if (local) {
      const { error: upErr } = await supabase.from("settings").upsert(toRemoteSettings(local, userId));
      if (upErr) throw upErr;
    }
  } else {
    await withHooksSuppressed(async () => {
      await db.settings.put(fromRemoteSettings(data));
    });
  }
}

export async function fullSync(userId: string): Promise<void> {
  await Promise.all([...COLLECTION_TABLES.map((cfg) => syncCollection(cfg, userId)), syncSettings(userId)]);
}

// ---------- write-through hooks ----------

function logPushError(table: string, error: unknown) {
  console.error(`Cloud sync: failed to push "${table}"`, error);
}

function registerHook(cfg: TableSync) {
  function push(row: unknown) {
    if (suppressHooks || !currentUserId || !supabase) return;
    supabase
      .from(cfg.remoteTable)
      .upsert(cfg.toRemote(row as never, currentUserId))
      .then(({ error }) => {
        if (error) logPushError(cfg.remoteTable, error);
      });
  }

  cfg.localTable.hook("creating", function (_primKey, obj) {
    if (cfg.idKeyed && !(obj as { remoteId?: string }).remoteId) {
      (obj as { remoteId?: string }).remoteId = crypto.randomUUID();
    }
    (this as { onsuccess?: () => void }).onsuccess = () => push(obj);
  });

  cfg.localTable.hook("updating", function () {
    (this as { onsuccess?: (updated: unknown) => void }).onsuccess = (updatedObj) => push(updatedObj);
  });

  cfg.localTable.hook("deleting", function (primKey, obj) {
    (this as { onsuccess?: () => void }).onsuccess = () => {
      if (suppressHooks || !currentUserId || !supabase) return;
      supabase
        .from(cfg.remoteTable)
        .delete()
        .match(cfg.remoteMatch(primKey, obj))
        .then(({ error }) => {
          if (error) logPushError(cfg.remoteTable, error);
        });
    };
  });
}

function registerSettingsHooks() {
  const push = (row: SettingsRecord) => {
    if (suppressHooks || !currentUserId || !supabase) return;
    supabase
      .from("settings")
      .upsert(toRemoteSettings(row, currentUserId))
      .then(({ error }) => {
        if (error) logPushError("settings", error);
      });
  };
  db.settings.hook("creating", function (_primKey, obj) {
    (this as { onsuccess?: () => void }).onsuccess = () => push(obj);
  });
  db.settings.hook("updating", function () {
    (this as { onsuccess?: (updated: SettingsRecord) => void }).onsuccess = (updatedObj) => push(updatedObj);
  });
}

let hooksRegistered = false;
function registerAllHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  for (const cfg of COLLECTION_TABLES) registerHook(cfg);
  registerSettingsHooks();
}

// ---------- session wiring ----------

export function initCloudSync(): void {
  if (!supabase) return;
  registerAllHooks();

  supabase.auth.getSession().then(({ data }) => {
    const uid = data.session?.user.id ?? null;
    currentUserId = uid;
    if (uid) fullSync(uid).catch((err) => console.error("Cloud sync failed", err));
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const uid = session?.user.id ?? null;
    const isNewSignIn = uid && uid !== currentUserId;
    currentUserId = uid;
    if (isNewSignIn) fullSync(uid).catch((err) => console.error("Cloud sync failed", err));
  });
}
