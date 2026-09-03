export type HabitIcon = "square" | "circle" | "bars" | "diamond";

export interface HabitDef {
  key: "sleep" | "water" | "meals" | "nophone";
  label: string;
  icon: HabitIcon;
}

export const HABIT_LIST: HabitDef[] = [
  { key: "sleep", label: "Dormir 7h+", icon: "circle" },
  { key: "water", label: "Agua 2L+", icon: "bars" },
  { key: "meals", label: "Comidas OK", icon: "square" },
  { key: "nophone", label: "Sin cel 21:30", icon: "diamond" },
];
