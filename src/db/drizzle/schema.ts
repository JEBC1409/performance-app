import { sql } from "drizzle-orm";
import {
  pgTable,
  pgPolicy,
  uuid,
  text,
  integer,
  real,
  boolean,
  date,
  timestamp,
  primaryKey,
  type PgColumn,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

/** Mirrors src/db/db.ts (the local Dexie schema), scoped per-user for Supabase.
 * Every table carries a user_id owned by the authenticated Supabase user and
 * an RLS policy restricting all access to auth.uid() = user_id. */

const ownedByUser = (table: { userId: PgColumn }) =>
  pgPolicy("owner_full_access", {
    for: "all",
    to: "authenticated",
    using: sql`auth.uid() = ${table.userId}`,
    withCheck: sql`auth.uid() = ${table.userId}`,
  });

function userIdColumn() {
  return uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" });
}

export const sets = pgTable(
  "sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: userIdColumn(),
    date: date("date").notNull(),
    day: text("day").notNull(),
    exercise: text("exercise").notNull(),
    setIndex: integer("set_index").notNull(),
    weight: real("weight"),
    reps: integer("reps"),
    toFailure: boolean("to_failure"),
    rpe: real("rpe"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [ownedByUser(table)],
).enableRLS();

export const habitDays = pgTable(
  "habit_days",
  {
    userId: userIdColumn(),
    date: date("date").notNull(),
    sleep: boolean("sleep").notNull().default(false),
    water: boolean("water").notNull().default(false),
    meals: boolean("meals").notNull().default(false),
    nophone: boolean("nophone").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] }), ownedByUser(table)],
).enableRLS();

export const weights = pgTable(
  "weights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: userIdColumn(),
    date: date("date").notNull(),
    weightKg: real("weight_kg"),
    pechoCm: real("pecho_cm"),
    brazoCm: real("brazo_cm"),
    note: text("note").notNull().default(""),
  },
  (table) => [ownedByUser(table)],
).enableRLS();

export const sleepRecords = pgTable(
  "sleep",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: userIdColumn(),
    date: date("date").notNull(),
    hours: real("hours"),
    bedTime: text("bed_time").notNull().default(""),
    wakeTime: text("wake_time").notNull().default(""),
    note: text("note").notNull().default(""),
  },
  (table) => [ownedByUser(table)],
).enableRLS();

export const savedVerses = pgTable(
  "saved_verses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: userIdColumn(),
    abbrev: text("abbrev").notNull(),
    bookName: text("book_name").notNull(),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    text: text("text").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [ownedByUser(table)],
).enableRLS();

export const moureWeeks = pgTable(
  "moure_weeks",
  {
    userId: userIdColumn(),
    week: integer("week").notNull(),
    date: date("date").notNull(),
    topic: text("topic").notNull().default(""),
    hours: real("hours"),
    project: text("project").notNull().default(""),
    done: boolean("done").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.userId, table.week] }), ownedByUser(table)],
).enableRLS();

export const settings = pgTable(
  "settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    unit: text("unit").notNull().default("kg"),
    weeklyGoalKg: real("weekly_goal_kg").notNull().default(0.5),
    defaultRestSec: integer("default_rest_sec").notNull().default(120),
    remindersEnabled: boolean("reminders_enabled").notNull().default(true),
    noPhoneTime: text("no_phone_time").notNull().default("21:30"),
    sleepTime: text("sleep_time").notNull().default("22:00"),
    seeded: boolean("seeded").notNull().default(false),
    displayName: text("display_name").notNull().default(""),
    avatarDataUrl: text("avatar_data_url"),
  },
  (table) => [ownedByUser(table)],
).enableRLS();
