import { HORARIO, SLEEP_GOAL_HOURS, labelStartMin } from "@/data/horario";
import type { HorarioRow } from "@/data/horario";
import { jsDowToIndex, pad2 } from "./date";

/** Bedtime worked out from when you actually get up: tomorrow's wake-up block
 * in the schedule minus your sleep goal, so a 5:00 start means an early night
 * and a late Saturday doesn't nag you. */

const WAKE = /levant|despert/i;

/** Minutes after midnight of the first wake-up block in a schedule column (0 = Monday), or null. */
export function wakeMinutes(col: number, rows: Pick<HorarioRow, "time" | "cells">[]): number | null {
  for (const row of rows) {
    const cell = row.cells[col];
    if (cell && !cell.cont && WAKE.test(cell.text)) return labelStartMin(row.time);
  }
  return null;
}

export function bedtimeFor(wakeMin: number, sleepHours: number): number {
  return (((wakeMin - Math.round(sleepHours * 60)) % 1440) + 1440) % 1440;
}

export function fmtHHMM(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

export interface Bedtime {
  /** "21:30" */
  bedtime: string;
  /** "05:00" — tomorrow's wake-up. */
  wake: string;
}

/** Tonight's bedtime, or null when tomorrow has no wake-up block in the schedule. */
export function tonightBedtime(now: Date = new Date(), rows: Pick<HorarioRow, "time" | "cells">[] = HORARIO, sleepHours: number = SLEEP_GOAL_HOURS): Bedtime | null {
  const tomorrow = (jsDowToIndex(now.getDay()) + 1) % 7;
  const wake = wakeMinutes(tomorrow, rows);
  if (wake == null) return null;
  return { bedtime: fmtHHMM(bedtimeFor(wake, sleepHours)), wake: fmtHHMM(wake) };
}
