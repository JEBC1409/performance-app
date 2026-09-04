import { useLiveQuery } from "dexie-react-hooks";
import { computeDailyScores, currentDailyStreak, totalActiveDays, totalPoints, type DayScore } from "@/lib/dailyScore";
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
  return useLiveQuery(async () => {
    const [scores, activeDays] = await Promise.all([computeDailyScores(), totalActiveDays()]);
    const points = totalPoints(scores);
    const { days, frozenDates, freezesUsedThisMonth, freezesAvailable } = currentDailyStreak(scores);
    return {
      scores,
      streak: days,
      frozenDates,
      freezesUsedThisMonth,
      freezesAvailable,
      points,
      activeDays,
      progress: streakRankProgress(activeDays),
    };
  }, []);
}
