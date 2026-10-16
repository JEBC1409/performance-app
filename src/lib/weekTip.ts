import type { WeekStats } from "./weeklySummary";

/** The one thing worth changing next week, picked from the week just finished:
 * the weakest area first (sleep, habits, training, focus), or praise when
 * nothing stands out. Needs a mostly complete week to say anything. */
export function weekTip(cur: WeekStats, prev: WeekStats): string {
  if (cur.elapsedDays < 5) return "Todavía es pronto para sacar conclusiones de esta semana.";

  if (cur.sleepAvg != null && cur.sleepNights >= 3 && cur.sleepAvg < 7) {
    return `Dormiste ${cur.sleepAvg.toFixed(1)} h en promedio: intenta acostarte 30 minutos antes esta semana.`;
  }
  if (cur.habitPct != null && cur.habitPct < 0.6) {
    const weakest = [...cur.habits].sort((a, b) => a.days - b.days)[0];
    if (weakest) return `Tu hábito más flojo fue “${weakest.label}” (${weakest.days}/${cur.elapsedDays} días): hazlo lo primero mañana.`;
  }
  if (cur.workouts < 3) {
    return `Entrenaste ${cur.workouts} ${cur.workouts === 1 ? "vez" : "veces"}: apunta a 3 esta semana y déjalas puestas en el horario.`;
  }
  if (prev.focusMinutes > 0 && cur.focusMinutes < prev.focusMinutes * 0.7) {
    const h = (m: number) => (m / 60).toFixed(1);
    return `Tu Focus bajó de ${h(prev.focusMinutes)} h a ${h(cur.focusMinutes)} h: protege un bloque por la mañana antes de que el día se llene.`;
  }
  return "Semana sólida. Mantén el ritmo y sube peso donde la app te lo marque.";
}
