import { DIAS } from "@/lib/date";

/** "MARTES" → "Martes": the shared day names are upper case; screens read better in sentence case. */
export function dayName(day: number): string {
  const s = (DIAS[day] ?? "").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
