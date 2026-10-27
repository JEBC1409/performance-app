/** What the card on top of Hoy should offer as THE one thing to do now. Pure, so it can be
 * tested without the screen: the order of the rules is the product decision. */
export type HeroKind =
  /** The schedule block right now maps to a habit (sleep, water…): one tap marks it. */
  | "block-habit"
  /** Start (or pick, or continue) today's training. */
  | "train"
  /** A study / work block is on: start a Focus block. */
  | "focus"
  /** Some habits are still open: take the user to them. */
  | "habits"
  /** Everything is done: review and close the day. */
  | "close"
  /** Nothing left to do; the day is closed. */
  | "done";

export interface HeroInput {
  /** Habit tied to the current schedule block, if any. */
  hasBlockHabit: boolean;
  /** Type of the current schedule block ("gym", "mouredev", …) and whether it is a quiet one. */
  blockType?: string;
  blockQuiet?: boolean;
  /** Rest day in the cycle (nothing to train unless you pick a day). */
  restDay: boolean;
  setsDone: number;
  setsTarget: number;
  habitsDone: number;
  habitsTotal: number;
  dayClosed: boolean;
}

const FOCUS_BLOCKS = new Set(["mouredev", "clase", "ingles"]);

export function pickHeroAction(i: HeroInput): HeroKind {
  if (i.hasBlockHabit) return "block-habit";

  const trainingOpen = !i.restDay && i.setsTarget > 0 && i.setsDone < i.setsTarget;
  if (i.blockType === "gym" && (trainingOpen || (i.restDay && i.setsDone === 0))) return "train";
  if (FOCUS_BLOCKS.has(i.blockType ?? "") && !i.blockQuiet) return "focus";
  if (trainingOpen) return "train";
  if (i.habitsTotal > 0 && i.habitsDone < i.habitsTotal) return "habits";
  return i.dayClosed ? "done" : "close";
}
