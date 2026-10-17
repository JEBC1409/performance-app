/** A rank colour made readable on the current theme. The tiers use bright metals
 * (silver, gold, ice blue) that disappear on a white page, so on the light theme
 * they're darkened toward black (--tier-ink is 100% on dark, ~52% on light). */
export const tierInk = (color: string): string => `color-mix(in srgb, ${color} var(--tier-ink, 100%), black)`;
