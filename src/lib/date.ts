export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const DIAS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];
export const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function fmtDateHuman(iso: string | null | undefined): string {
  if (!iso) return "Sin fecha";
  const d = parseISODate(iso);
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`;
}

export function fmtDateFull(iso: string): string {
  const d = parseISODate(iso);
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** Monday = 0 ... Sunday = 6 */
export function jsDowToIndex(jsDow: number): number {
  return jsDow === 0 ? 6 : jsDow - 1;
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

/** ISO week number (Mon-based) relative to a fixed start date, 0-indexed week count since start. */
export function weeksSince(startISO: string, targetISO: string): number {
  const start = parseISODate(startISO);
  const target = parseISODate(targetISO);
  const ms = target.getTime() - start.getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

export function startOfWeek(iso: string): string {
  const idx = jsDowToIndex(parseISODate(iso).getDay());
  return addDays(iso, -idx);
}

export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}
