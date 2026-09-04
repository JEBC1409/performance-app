import { useLiveQuery } from "dexie-react-hooks";
import { computeDailyScores, currentDailyStreak, totalActiveDays, totalPoints, type DayScore } from "@/lib/dailyScore";
import { streakRankProgress } from "@/lib/streakRank";

export interface DailyStreakData {
  scores: DayScore[];
  streak: number;
  points: number;
  activeDays: number;
  progress: ReturnType<typeof streakRankProgress>;
}

export function useDailyStreak(): DailyStreakData | undefined {
  return useLiveQuery(async () => {
    const [scores, activeDays] = await Promise.all([computeDailyScores(), totalActiveDays()]);
    const points = totalPoints(scores);
    return { scores, streak: currentDailyStreak(scores), points, activeDays, progress: streakRankProgress(activeDays) };
  }, []);
}
