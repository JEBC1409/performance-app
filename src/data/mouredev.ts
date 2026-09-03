export interface MoureWeekSeed {
  week: number;
  date: string;
  topic: string;
  hours: number | null;
  project: string;
  done: boolean;
}

export const MOUREDEV_GOAL_HOURS_PER_WEEK = 15;
export const MOUREDEV_TOTAL_WEEKS = 24;
export const MOUREDEV_TARGET_LABEL = "MoureDev → Bancolombia 2027";

export function seedMouredev(): MoureWeekSeed[] {
  const rows: MoureWeekSeed[] = [
    { week: 1, date: "2026-08-04", topic: "Python básico: variables, tipos, funciones", hours: 15, project: "Calculadora CLI", done: true },
  ];
  for (let w = 2; w <= MOUREDEV_TOTAL_WEEKS; w++) {
    rows.push({ week: w, date: "", topic: "", hours: null, project: "", done: false });
  }
  return rows;
}
