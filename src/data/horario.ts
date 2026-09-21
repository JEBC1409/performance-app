export type BlockType = "clase" | "gym" | "mouredev" | "ingles" | "libre" | "otro";

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
}

export interface HorarioRow {
  time: string;
  cells: HorarioCell[]; // Lun..Dom
}

function c(text: string, type: BlockType, extra: Partial<HorarioCell> = {}): HorarioCell {
  return { text, type, ...extra };
}

export const BLOCK_COLOR: Record<BlockType, string> = {
  clase: "#df2531",
  gym: "#ffffff",
  mouredev: "#9aa0a6",
  ingles: "#df2531",
  libre: "rgba(255,255,255,0.18)",
  otro: "transparent",
};

export const BLOCK_LABEL: Record<BlockType, string> = {
  clase: "Clase uni",
  gym: "Gym",
  mouredev: "MoureDev",
  ingles: "Inglés",
  libre: "Libre",
  otro: "—",
};

/** Soft fill + border tints per block type, for the colored cell chips. */
export const BLOCK_TINT: Record<BlockType, string> = {
  clase: "rgba(223, 37, 49, 0.16)",
  gym: "rgba(255, 255, 255, 0.1)",
  mouredev: "rgba(255, 255, 255, 0.06)",
  ingles: "rgba(223, 37, 49, 0.16)",
  libre: "rgba(255, 255, 255, 0.04)",
  otro: "transparent",
};

export const BLOCK_BORDER: Record<BlockType, string> = {
  clase: "rgba(223, 37, 49, 0.55)",
  gym: "rgba(255, 255, 255, 0.4)",
  mouredev: "rgba(255, 255, 255, 0.22)",
  ingles: "rgba(223, 37, 49, 0.55)",
  libre: "rgba(255, 255, 255, 0.14)",
  otro: "transparent",
};

export const BLOCK_TEXT: Record<BlockType, string> = {
  clase: "var(--color-red)",
  gym: "var(--color-ink)",
  mouredev: "var(--color-muted)",
  ingles: "var(--color-red)",
  libre: "var(--color-muted)",
  otro: "var(--color-muted)",
};

/** Row labels, top to bottom. A row starts at its first time and lasts until
 * the next row starts (the last one runs to midnight), which is how the
 * "current block" on Hoy is resolved. */
export const HORARIO_TIMES = [
  "5:00", // 0
  "6:00-7:30", // 1
  "7:30-8:20", // 2
  "8:30", // 3
  "8:50-9:50", // 4
  "10:00-12:20", // 5
  "12:30", // 6
  "13:00", // 7
  "14:00-16:00", // 8
  "16:35-17:30", // 9
  "17:30-18:00", // 10
  "18:00-19:30", // 11
  "19:30-20:20", // 12
  "20:30-21:15", // 13
  "21:15-21:45", // 14
  "22:00", // 15
];

/** A block covering rows [from..to] (inclusive) of one day's column. */
type Seg = [from: number, to: number, cell: HorarioCell];

function column(segs: Seg[]): HorarioCell[] {
  const out: HorarioCell[] = new Array(HORARIO_TIMES.length).fill(null).map(() => c("—", "otro"));
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
    [0, 0, c("Levantarse, bañarse, comer algo", "otro")],
    [1, 1, uni],
    [2, 2, c("Desayuno", "otro")],
    [3, 3, c("Preparar MoureDev + maleta del gym", "otro")],
    [4, 4, c("MoureDev · obligatorio", "mouredev", { key: true })],
    [5, 5, c("Gym", "gym")],
    [6, 6, c("Almuerzo (meal prep)", "otro")],
    [7, 7, c("Bañarse y salir", "otro")],
  ];
}

/** Mon-Thu afternoon/evening; only the 18:00-19:30 slot varies. */
function evening(sixPm: HorarioCell): Seg[] {
  return [
    [8, 8, c("INGLÉS Blendex", "ingles")],
    [9, 9, c("Arreglar la casa", "otro")],
    [10, 10, c("Pendientes de la U", "clase")],
    [11, 11, sixPm],
    [12, 12, c("Hacer comida y cenar", "otro")],
    [13, 13, c("MoureDev opcional (repaso suave)", "mouredev", { soft: true })],
    [14, 14, c("Libre + escribir la tarea de MoureDev de mañana", "libre")],
    [15, 15, c("Dormir 22:00", "otro")],
  ];
}

const DISENO = c("Diseño de Sistemas ★", "clase");
const PENDIENTES = c("Pendientes U / Libre", "libre");

const COLUMNS: HorarioCell[][] = [
  // Lunes
  column([...morning(c("Admin Sistemas ★", "clase")), ...evening(DISENO)]),
  // Martes
  column([...morning(c("Pruebas y Calidad ★", "clase")), ...evening(PENDIENTES)]),
  // Miércoles
  column([...morning(c("Libre / U", "libre")), ...evening(DISENO)]),
  // Jueves
  column([...morning(c("Libre / U", "libre")), ...evening(PENDIENTES)]),
  // Viernes: new morning, afternoon as before, sleep at 22:00
  column([
    ...morning(c("Admin Sistemas ★", "clase")),
    [8, 8, c("MoureDev bloque largo", "mouredev")],
    [9, 10, c("LIBRE", "libre")],
    [11, 12, c("LIBRE noche", "libre")],
    [13, 15, c("Dormir 22:00", "otro")],
  ]),
  // Sábado: unchanged apart from sleeping at 22:00
  column([
    [0, 0, c("Despertar + aseo", "otro")],
    [1, 2, c("Pruebas y Calidad ★", "clase")],
    [3, 4, c("Aplic. Serv. Web ★", "clase")],
    [5, 5, c("LIBRE", "libre")],
    [6, 7, c("Almuerzo + GYM", "gym")],
    [8, 8, c("Meal prep tuppers", "otro")],
    [9, 10, c("MoureDev repaso", "mouredev")],
    [11, 12, c("LIBRE", "libre")],
    [13, 15, c("Dormir 22:00", "otro")],
  ]),
  // Domingo: unchanged apart from sleeping at 22:00
  column([
    [1, 2, c("Despertar 7:00", "otro")],
    [3, 4, c("GYM 8:00-9:30", "gym")],
    [5, 5, c("Uni + planear MoureDev", "mouredev")],
    [6, 7, c("Almuerzo + Meal prep", "otro")],
    [8, 8, c("LIBRE", "libre")],
    [9, 10, c("LIBRE", "libre")],
    [11, 12, c("LIBRE", "libre")],
    [13, 15, c("Planear + dormir 22:00", "otro")],
  ]),
];

export const HORARIO: HorarioRow[] = HORARIO_TIMES.map((time, r) => ({ time, cells: COLUMNS.map((col) => col[r]) }));

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
