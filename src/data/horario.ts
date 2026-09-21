export type BlockType = "clase" | "gym" | "mouredev" | "ingles" | "dios" | "libre" | "otro";

export interface HorarioCell {
  text: string;
  type: BlockType;
  /** The day's must-do block: rendered with a red border + glow. */
  key?: boolean;
  /** Optional/light block: rendered dimmer than a regular one. */
  soft?: boolean;
  /** First row of a block that continues down `span` rows (rendered as one tall chip). */
  span?: number;
  /** Continuation of the block started in an earlier row (the table skips it). */
  cont?: boolean;
  /** Nothing to do (free time, sleep, empty): never worth a reminder. */
  quiet?: boolean;
}

export interface HorarioRow {
  time: string;
  cells: HorarioCell[]; // Lun..Dom
}

/** Free time, sleep (its own reminder exists) and empty slots are quiet —
 * unless the free slot carries a to-do ("Pendientes…", "…escribir…"). */
function isQuiet(text: string, type: BlockType): boolean {
  if (text === "—" || /^dormir/i.test(text)) return true;
  return type === "libre" && !/pendientes|escribir/i.test(text);
}

function c(text: string, type: BlockType, extra: Partial<HorarioCell> = {}): HorarioCell {
  return { text, type, ...(isQuiet(text, type) ? { quiet: true } : {}), ...extra };
}

export const BLOCK_COLOR: Record<BlockType, string> = {
  clase: "var(--color-red)",
  gym: "#ffffff",
  mouredev: "#9aa0a6",
  ingles: "var(--color-red)",
  dios: "var(--color-gold)",
  libre: "rgba(255,255,255,0.18)",
  otro: "transparent",
};

export const BLOCK_LABEL: Record<BlockType, string> = {
  clase: "Clase uni",
  gym: "Gym",
  mouredev: "MoureDev",
  ingles: "Inglés",
  dios: "Dios / Lectura",
  libre: "Libre",
  otro: "—",
};

/** Soft fill + border tints per block type, for the colored cell chips. */
export const BLOCK_TINT: Record<BlockType, string> = {
  clase: "rgb(var(--accent-rgb) / 0.16)",
  gym: "rgba(255, 255, 255, 0.1)",
  mouredev: "rgba(255, 255, 255, 0.06)",
  ingles: "rgb(var(--accent-rgb) / 0.16)",
  dios: "rgba(226, 185, 111, 0.13)",
  libre: "rgba(255, 255, 255, 0.04)",
  otro: "transparent",
};

export const BLOCK_BORDER: Record<BlockType, string> = {
  clase: "rgb(var(--accent-rgb) / 0.55)",
  gym: "rgba(255, 255, 255, 0.4)",
  mouredev: "rgba(255, 255, 255, 0.22)",
  ingles: "rgb(var(--accent-rgb) / 0.55)",
  dios: "rgba(226, 185, 111, 0.5)",
  libre: "rgba(255, 255, 255, 0.14)",
  otro: "transparent",
};

export const BLOCK_TEXT: Record<BlockType, string> = {
  clase: "var(--color-red)",
  gym: "var(--color-ink)",
  mouredev: "var(--color-muted)",
  ingles: "var(--color-red)",
  dios: "#f0cf8e",
  libre: "var(--color-muted)",
  otro: "var(--color-muted)",
};

/** Row labels, top to bottom. A row starts at its first time and lasts until
 * the next row starts (the last one runs to midnight), which is how the
 * "current block" on Hoy is resolved. */
const DEFAULT_TIMES = [
  "5:00",
  "5:15-5:40",
  "6:00-7:30",
  "7:30-8:20",
  "8:30",
  "8:50-9:50",
  "10:00-12:20",
  "12:30",
  "13:00",
  "14:00-16:00",
  "16:35-17:30",
  "17:30-18:00",
  "18:00-19:30",
  "19:30-20:20",
  "20:30-21:15",
  "21:15-21:45",
  "22:00",
];

export const HORARIO_TIMES: string[] = [...DEFAULT_TIMES];

/** Row indexes by start time, so day columns read like the schedule. */
const R = {
  t0500: 0,
  t0515: 1,
  t0600: 2,
  t0730: 3,
  t0830: 4,
  t0850: 5,
  t1000: 6,
  t1230: 7,
  t1300: 8,
  t1400: 9,
  t1635: 10,
  t1730: 11,
  t1800: 12,
  t1930: 13,
  t2030: 14,
  t2115: 15,
  t2200: 16,
} as const;

/** A block covering rows [from..to] (inclusive) of one day's column. */
type Seg = [from: number, to: number, cell: HorarioCell];

function column(segs: Seg[], rows: number): HorarioCell[] {
  const out: HorarioCell[] = new Array(rows).fill(null).map(() => c("—", "otro"));
  for (const [from, to, cell] of segs) {
    for (let r = from; r <= to; r++) {
      out[r] = r === from ? { ...cell, ...(to > from ? { span: to - from + 1 } : {}) } : { ...cell, cont: true };
    }
  }
  return out;
}

/** Mon-Fri morning is identical every day; only the 6:00-7:30 uni class varies. */
function morning(uni: HorarioCell): Seg[] {
  return [
    [R.t0500, R.t0500, c("Levantarse, bañarse, comer algo", "otro")],
    [R.t0515, R.t0515, c("Lectura de la Biblia", "dios")],
    [R.t0600, R.t0600, uni],
    [R.t0730, R.t0730, c("Desayuno", "otro")],
    [R.t0830, R.t0830, c("Preparar MoureDev + maleta del gym", "otro")],
    [R.t0850, R.t0850, c("MoureDev · obligatorio", "mouredev", { key: true })],
    [R.t1000, R.t1000, c("Gym", "gym")],
    [R.t1230, R.t1230, c("Almuerzo (meal prep)", "otro")],
    [R.t1300, R.t1300, c("Bañarse y salir", "otro")],
  ];
}

const BOOK = c("Leer libro + escribir tarea de MoureDev de mañana", "dios");

/** Mon-Thu afternoon/evening; only the 18:00-19:30 slot varies. */
function evening(sixPm: HorarioCell): Seg[] {
  return [
    [R.t1400, R.t1400, c("INGLÉS Blendex", "ingles")],
    [R.t1635, R.t1635, c("Arreglar la casa", "otro")],
    [R.t1730, R.t1730, c("Pendientes de la U", "clase")],
    [R.t1800, R.t1800, sixPm],
    [R.t1930, R.t1930, c("Hacer comida y cenar", "otro")],
    [R.t2030, R.t2030, c("MoureDev opcional (repaso suave)", "mouredev", { soft: true })],
    [R.t2115, R.t2115, BOOK],
    [R.t2200, R.t2200, c("Dormir 22:00", "otro")],
  ];
}

const DISENO = c("Diseño de Sistemas ★", "clase");
const PENDIENTES = c("Pendientes U / Libre", "libre");

const DEFAULT_SEGS: Seg[][] = [
  // Lunes
  [...morning(c("Admin Sistemas ★", "clase")), ...evening(DISENO)],
  // Martes
  [...morning(c("Pruebas y Calidad ★", "clase")), ...evening(PENDIENTES)],
  // Miércoles
  [...morning(c("Libre / U", "libre")), ...evening(DISENO)],
  // Jueves
  [...morning(c("Libre / U", "libre")), ...evening(PENDIENTES)],
  // Viernes: new morning, afternoon as before, book block at night, sleep at 22:00
  [
    ...morning(c("Admin Sistemas ★", "clase")),
    [R.t1400, R.t1400, c("MoureDev bloque largo", "mouredev")],
    [R.t1635, R.t1730, c("LIBRE", "libre")],
    [R.t1800, R.t1930, c("LIBRE noche", "libre")],
    [R.t2030, R.t2030, c("LIBRE", "libre")],
    [R.t2115, R.t2115, BOOK],
    [R.t2200, R.t2200, c("Dormir 22:00", "otro")],
  ],
  // Sábado: as before, plus Bible right after waking; sleep at 22:00
  [
    [R.t0500, R.t0500, c("Despertar + aseo", "otro")],
    [R.t0515, R.t0515, c("Biblia", "dios")],
    [R.t0600, R.t0730, c("Pruebas y Calidad ★", "clase")],
    [R.t0830, R.t0850, c("Aplic. Serv. Web ★", "clase")],
    [R.t1000, R.t1000, c("LIBRE", "libre")],
    [R.t1230, R.t1300, c("Almuerzo + GYM", "gym")],
    [R.t1400, R.t1400, c("Meal prep tuppers", "otro")],
    [R.t1635, R.t1730, c("MoureDev repaso", "mouredev")],
    [R.t1800, R.t1930, c("LIBRE", "libre")],
    [R.t2030, R.t2200, c("Dormir 22:00", "otro")],
  ],
  // Domingo: as before, plus Bible right after waking (7:00); sleep at 22:00
  [
    [R.t0600, R.t0600, c("Despertar 7:00", "otro")],
    [R.t0730, R.t0730, c("Biblia", "dios")],
    [R.t0830, R.t0850, c("GYM 8:00-9:30", "gym")],
    [R.t1000, R.t1000, c("Uni + planear MoureDev", "mouredev")],
    [R.t1230, R.t1300, c("Almuerzo + Meal prep", "otro")],
    [R.t1400, R.t1400, c("LIBRE", "libre")],
    [R.t1635, R.t1730, c("LIBRE", "libre")],
    [R.t1800, R.t1930, c("LIBRE", "libre")],
    [R.t2030, R.t2200, c("Planear + dormir 22:00", "otro")],
  ],
];

const DEFAULT_COLUMNS = DEFAULT_SEGS.map((segs) => column(segs, DEFAULT_TIMES.length));
export const HORARIO: HorarioRow[] = HORARIO_TIMES.map((time, r) => ({ time, cells: DEFAULT_COLUMNS.map((col) => col[r]) }));
// ── Editable schedule ───────────────────────────────────────────────────
// The schedule lives as "segments" per weekday (rows from..to hold one block).
// Storing segments — not the expanded grid — means a block that spans rows can
// never get out of sync with its continuation rows; the grid is rebuilt from them.

/** A block as stored/edited: no span/cont bookkeeping. */
export type BlockCell = Pick<HorarioCell, "text" | "type" | "key" | "soft" | "quiet">;
export interface HorarioSeg {
  from: number;
  to: number;
  cell: BlockCell;
}
export interface HorarioConfig {
  times: string[];
  /** Mon..Sun */
  days: HorarioSeg[][];
}

const BLOCK_TYPES: BlockType[] = ["clase", "gym", "mouredev", "ingles", "dios", "libre", "otro"];
const TIME_LABEL = /^\d{1,2}:\d{2}(-\d{1,2}:\d{2})?$/;

function stripCell(cell: HorarioCell): BlockCell {
  const { text, type, key, soft, quiet } = cell;
  return { text, type, ...(key ? { key } : {}), ...(soft ? { soft } : {}), ...(quiet ? { quiet } : {}) };
}

export function defaultHorario(): HorarioConfig {
  return {
    times: [...DEFAULT_TIMES],
    days: DEFAULT_SEGS.map((segs) => segs.map(([from, to, cell]) => ({ from, to, cell: stripCell(cell) }))),
  };
}

/** Rebuild one weekday's rows from its segments (gaps become empty "—" rows). */
export function columnFromSegs(segs: HorarioSeg[], rows: number): HorarioCell[] {
  return column(segs.map((sg) => [sg.from, sg.to, { ...sg.cell } as HorarioCell] as Seg), rows);
}

/** Validates a stored/synced schedule; null when it can't be trusted. */
export function sanitizeHorario(raw: unknown): HorarioConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { times?: unknown; days?: unknown };
  if (!Array.isArray(r.times) || r.times.length < 1 || r.times.length > 48) return null;
  if (!r.times.every((t) => typeof t === "string" && TIME_LABEL.test(t))) return null;
  if (!Array.isArray(r.days) || r.days.length !== 7) return null;
  const rows = r.times.length;
  const days: HorarioSeg[][] = [];
  for (const d of r.days) {
    if (!Array.isArray(d)) return null;
    const segs: HorarioSeg[] = [];
    let lastTo = -1;
    for (const sg of [...d].sort((a, b) => (a?.from ?? 0) - (b?.from ?? 0))) {
      if (!sg || typeof sg !== "object") return null;
      const { from, to, cell } = sg as { from: unknown; to: unknown; cell: Partial<BlockCell> | undefined };
      if (!Number.isInteger(from) || !Number.isInteger(to) || (from as number) < 0 || (to as number) < (from as number) || (to as number) >= rows) return null;
      if ((from as number) <= lastTo) return null; // overlapping blocks
      if (!cell || typeof cell.text !== "string" || !cell.text.trim() || cell.text.length > 80 || !BLOCK_TYPES.includes(cell.type as BlockType)) return null;
      lastTo = to as number;
      segs.push({ from: from as number, to: to as number, cell: { text: cell.text.trim(), type: cell.type as BlockType, ...(cell.key ? { key: true } : {}), ...(cell.soft ? { soft: true } : {}), ...(cell.quiet ? { quiet: true } : {}) } });
    }
    days.push(segs);
  }
  return { times: r.times as string[], days };
}

/** Start of a row label ("5:15-5:40" → 315 min), for keeping rows in order. */
export function labelStartMin(label: string): number {
  const [h, m] = label.split("-")[0].split(":").map(Number);
  return h * 60 + m;
}

/** Puts a config into the live HORARIO / HORARIO_TIMES (mutated in place, so
 * every importer sees the change). */
export function applyHorario(cfg: HorarioConfig): void {
  currentCfg = cfg;
  const columns = cfg.days.map((segs) => columnFromSegs(segs, cfg.times.length));
  HORARIO_TIMES.splice(0, HORARIO_TIMES.length, ...cfg.times);
  HORARIO.splice(0, HORARIO.length, ...cfg.times.map((time, r) => ({ time, cells: columns.map((col) => col[r]) })));
}

/** What's running right now, as a config (a copy you can edit). */
export function currentHorarioConfig(): HorarioConfig {
  return currentCfg ?? defaultHorario();
}
let currentCfg: HorarioConfig | null = null;



export interface SueñoRow {
  dias: string;
  acostar: string;
  despertar: string;
  horasLabel: string;
  horasMeta: number;
}

export const SUENO: SueñoRow[] = [
  { dias: "Lun a Vie", acostar: "22:00", despertar: "5:00", horasLabel: "7h", horasMeta: 7 },
  { dias: "Sábado", acostar: "22:00", despertar: "5:20", horasLabel: "7h 20min", horasMeta: 7.33 },
  { dias: "Domingo", acostar: "22:00", despertar: "6:30 - 7:00", horasLabel: "8h - 8h30", horasMeta: 8.25 },
];

export const SLEEP_GOAL_HOURS = 7.5;

export const HORARIO_NOTE = "Semestre 2026-2 · Clases virtuales · Inglés Blendex L-J 14:00-16:00";

export const HORARIO_GOAL = "Meta: marcar una X cada día que cumpla el bloque de MoureDev de la mañana";
