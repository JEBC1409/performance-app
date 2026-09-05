/** Turns a habit label into a stable, id-safe key — the row's permanent
 * identity, generated once at creation. HabitDayRecord.done entries
 * reference this key, not the label, so renaming a habit later doesn't
 * disconnect it from days already marked done under the old name. */
export function slugifyHabit(label: string): string {
  const withoutAccents = label.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const slug = withoutAccents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "habito";
}

/** Appends a numeric suffix if the slugified label collides with an
 * existing key (e.g. two habits both named "Leer"). */
export function uniqueHabitKey(label: string, existingKeys: Set<string>): string {
  const base = slugifyHabit(label);
  if (!existingKeys.has(base)) return base;
  let i = 2;
  while (existingKeys.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
