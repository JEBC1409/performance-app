import { useMemo } from "react";
import { buildDailyScores, currentDailyStreak, STREAK_WINDOW_DAYS, totalPoints, type DayScore } from "@/lib/dailyScore";
import { streakRankProgress } from "@/lib/streakRank";
import { useRecentActivity } from "./useRecentActivity";

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
  // Built from the shared recent-activity read (the past once, today's rows live),
  // not from five table queries of its own that re-run on every write.
  const recent = useRecentActivity();

  return useMemo(() => {
    if (!recent) return undefined;
    const scores = buildDailyScores({ sets: recent.sets, habitDays: recent.habitDays, weights: recent.weights, sleeps: recent.sleep, focus: recent.focus }, STREAK_WINDOW_DAYS, recent.today);
    const { days, frozenDates, freezesUsedThisMonth, freezesAvailable } = currentDailyStreak(scores);
    return {
      scores,
      streak: days,
      frozenDates,
      freezesUsedThisMonth,
      freezesAvailable,
      points: totalPoints(scores),
      activeDays: recent.activeDays,
      progress: streakRankProgress(recent.activeDays),
    };
  }, [recent]);
}
