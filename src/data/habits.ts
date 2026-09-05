import type { HabitIcon } from "@/db/db";

export type { HabitIcon, HabitDefRecord } from "@/db/db";

/** The four geometric icon shapes a habit can use — matches the app's
 * "no emoji" visual spec (src/ui/icons.tsx). Offered as a small fixed set
 * when creating a habit, rather than free-form icon input. */
export const HABIT_ICONS: HabitIcon[] = ["circle", "square", "bars", "diamond"];
