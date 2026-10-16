import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { activeDaysCount, computeDailyScores, currentDailyStreak, totalPoints, type DayScore } from "@/lib/dailyScore";
import { todayISO } from "@/lib/date";
import { streakRankProgress } from "@/lib/streakRank";

export interface DailyStreakData {
  scores: DayScore[];
  streak: number;
  frozenDates: Set<string>;
  freezesUsedThisMonth: number;
  freezesAvailable: number;
  points: number;
  activeDays: number;
  progress: ReturnType<typeof streakRankProgress>;
}

export function useDailyStreak(): DailyStreakData | undefined {
  const today = todayISO();
  // Three small live queries instead of one that re-reads the whole history on
  // every write: the 28-day window, the count of earlier active days (untouched
  // by anything you log today), and today's own.
  const scores = useLiveQuery(() => computeDailyScores(), [today]);
  const before = useLiveQuery(() => activeDaysCount("before", today), [today]);
  const from = useLiveQuery(() => activeDaysCount("from", today), [today]);

  return useMemo(() => {
    if (!scores || before === undefined || from === undefined) return undefined;
    const activeDays = before + from;
    const { days, frozenDates, freezesUsedThisMonth, freezesAvailable } = currentDailyStreak(scores);
    return {
      scores,
      streak: days,
      frozenDates,
      freezesUsedThisMonth,
      freezesAvailable,
      points: totalPoints(scores),
      activeDays,
      progress: streakRankProgress(activeDays),
    };
  }, [scores, before, from]);
}
