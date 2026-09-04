import { useLiveQuery } from "dexie-react-hooks";
import { computeDailyScores, currentDailyStreak, totalPoints, STREAK_CAPACITY, type DayScore } from "@/lib/dailyScore";
import { rankProgress } from "@/lib/muscleRank";

export interface DailyStreakData {
  scores: DayScore[];
  streak: number;
  points: number;
  progress: ReturnType<typeof rankProgress>;
}

export function useDailyStreak(): DailyStreakData | undefined {
  return useLiveQuery(async () => {
    const scores = await computeDailyScores();
    const points = totalPoints(scores);
    return { scores, streak: currentDailyStreak(scores), points, progress: rankProgress(points, STREAK_CAPACITY) };
  }, []);
}
