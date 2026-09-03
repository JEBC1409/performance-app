import Dexie, { type EntityTable } from "dexie";
import type { GymDay } from "@/lib/cycle";

export interface SetRecord {
  id?: number;
  /** Client-generated uuid, stable across devices — the id this row is pushed to Supabase under. */
  remoteId?: string;
  date: string;
  day: GymDay;
  exercise: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  toFailure: boolean | null;
  rpe: number | null;
  note: string;
  createdAt: number;
}

export interface HabitDayRecord {
  date: string;
  sleep: boolean;
  water: boolean;
  meals: boolean;
  nophone: boolean;
}

export interface WeightRecord {
  id?: number;
  remoteId?: string;
  date: string;
  weightKg: number | null;
  pechoCm: number | null;
  brazoCm: number | null;
  note: string;
}

export interface SleepRecord {
  id?: number;
  remoteId?: string;
  date: string;
  hours: number | null;
  bedTime: string;
  wakeTime: string;
  note: string;
}

export interface SavedVerseRecord {
  id?: number;
  remoteId?: string;
  abbrev: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  note: string;
  createdAt: number;
}

export interface MoureWeekRecord {
  week: number;
  date: string;
  topic: string;
  hours: number | null;
  project: string;
  done: boolean;
}

export type Unit = "kg" | "lb";

export interface SettingsRecord {
  id: "app";
  unit: Unit;
  weeklyGoalKg: number;
  defaultRestSec: number;
  remindersEnabled: boolean;
  noPhoneTime: string;
  sleepTime: string;
  seeded: boolean;
  displayName?: string;
  avatarDataUrl?: string | null;
}

export const db = new Dexie("performance-db") as Dexie & {
  sets: EntityTable<SetRecord, "id">;
  habitDays: EntityTable<HabitDayRecord, "date">;
  weights: EntityTable<WeightRecord, "id">;
  sleep: EntityTable<SleepRecord, "id">;
  savedVerses: EntityTable<SavedVerseRecord, "id">;
  moureWeeks: EntityTable<MoureWeekRecord, "week">;
  settings: EntityTable<SettingsRecord, "id">;
};

db.version(1).stores({
  sets: "++id, date, day, exercise, createdAt",
  habitDays: "date",
  weights: "++id, date",
  sleep: "++id, date",
  savedVerses: "++id, createdAt, abbrev",
  moureWeeks: "week",
  settings: "id",
});

/** v2 adds a `remoteId` column to the tables Supabase needs a stable id for.
 * Local primary keys stay Dexie's own auto-increment numbers — only remoteId
 * (a client-generated uuid) is shared with the Supabase row's id, so this is
 * an additive index change rather than a primary-key migration. */
db.version(2)
  .stores({
    sets: "++id, date, day, exercise, createdAt, remoteId",
    habitDays: "date",
    weights: "++id, date, remoteId",
    sleep: "++id, date, remoteId",
    savedVerses: "++id, createdAt, abbrev, remoteId",
    moureWeeks: "week",
    settings: "id",
  })
  .upgrade(async (tx) => {
    for (const name of ["sets", "weights", "sleep", "savedVerses"] as const) {
      await tx
        .table(name)
        .toCollection()
        .modify((row) => {
          row.remoteId = crypto.randomUUID();
        });
    }
  });

export const DEFAULT_SETTINGS: SettingsRecord = {
  id: "app",
  unit: "kg",
  weeklyGoalKg: 0.5,
  defaultRestSec: 120,
  remindersEnabled: true,
  noPhoneTime: "21:30",
  sleepTime: "22:00",
  seeded: false,
  displayName: "",
  avatarDataUrl: null,
};
