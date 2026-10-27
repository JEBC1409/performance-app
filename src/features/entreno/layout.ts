/** Layout rules for the exercise list, kept out of the component so they can be tested. */

/** At most this many "Estancado" badges are drawn on cards; with more, the
 * screen shows a single summary line instead (9 of 9 badges is noise, not a signal). */
export const MAX_STALL_BADGES = 3;

export function showStallBadges(stalledCount: number): boolean {
  return stalledCount > 0 && stalledCount <= MAX_STALL_BADGES;
}

export function showStallSummary(stalledCount: number): boolean {
  return stalledCount > MAX_STALL_BADGES;
}

export interface CardLayout {
  /** Grid-column classes. The grid has 6 columns: 2 cards per row on a phone (3 each), 3 per row on wide screens (2 each). */
  span: string;
  /** Photo proportions: a card that spans a whole row gets a lower, wider photo. */
  photo: string;
}

/** Where card `index` of `total` goes, so the last row never leaves an orphan:
 * an odd count makes the last card full width on a phone; on a wide screen a
 * remainder of 1 makes it full width and a remainder of 2 splits the last row in halves. */
export function cardLayout(index: number, total: number): CardLayout {
  const last = index === total - 1;
  const mobileWide = last && total % 2 === 1;
  const rem = total % 3;
  const wideAll = last && rem === 1;
  const wideHalf = rem === 2 && index >= total - 2;
  return {
    span: `${mobileWide ? "col-span-6" : "col-span-3"} ${wideAll ? "sidebar:col-span-6" : wideHalf ? "sidebar:col-span-3" : "sidebar:col-span-2"}`,
    photo: `${mobileWide ? "aspect-[16/7]" : "aspect-[3/2]"} ${wideAll || wideHalf ? "sidebar:aspect-[16/7]" : "sidebar:aspect-[3/2]"}`,
  };
}
