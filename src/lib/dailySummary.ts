import { db, DEFAULT_SETTINGS } from "@/db/db";
import { HABIT_LIST } from "@/data/habits";
import { fmtDateFull } from "./date";
import { buildSessionSummary } from "./sessionSummary";
import { computeDailyScores, currentDailyStreak, totalActiveDays } from "./dailyScore";
import { streakRankProgress } from "./streakRank";
import { fromKg, unitLabel } from "./units";

/** A copy-paste-ready recap of one full day — training (if any), habits,
 * weight/sleep logs, and the current streak/rank — meant for pasting into
 * an external chat acting as a coach, so it evaluates the whole day and not
 * just the workout in isolation. */
export async function buildDailySummary(date: string): Promise<string> {
  const [sets, habitDay, weight, sleep, settings, scores, activeDays] = await Promise.all([
    db.sets.where("date").equals(date).toArray(),
    db.habitDays.get(date),
    db.weights.where("date").equals(date).first(),
    db.sleep.where("date").equals(date).first(),
    db.settings.get("app"),
    computeDailyScores(),
    totalActiveDays(),
  ]);

  const lines: string[] = [`PERFORMANCE — Resumen del día — ${fmtDateFull(date)}`, ""];

  if (sets.length) {
    const allSets = await db.sets.toArray();
    lines.push(buildSessionSummary(sets[0].day, date, sets, allSets), "");
  } else {
    lines.push("ENTRENO: sin sesión registrada", "");
  }

  const habitsDone = HABIT_LIST.filter((h) => !!habitDay?.[h.key]).length;
  lines.push(`HÁBITOS (${habitsDone}/${HABIT_LIST.length})`);
  for (const h of HABIT_LIST) {
    lines.push(`${habitDay?.[h.key] ? "✓" : "✗"} ${h.label}`);
  }
  lines.push("");

  const unit = settings?.unit ?? DEFAULT_SETTINGS.unit;
  const extras: string[] = [];
  if (weight?.weightKg != null) extras.push(`PESO: ${fromKg(weight.weightKg, unit)} ${unitLabel(unit)}`);
  if (sleep?.hours != null) extras.push(`SUEÑO: ${sleep.hours} h`);
  if (extras.length) lines.push(...extras, "");

  const { days } = currentDailyStreak(scores);
  const { tier } = streakRankProgress(activeDays);
  lines.push(`RACHA: ${days} ${days === 1 ? "día" : "días"} · ${tier.label} (${activeDays} días activos)`);

  return lines.join("\n").trim();
}
