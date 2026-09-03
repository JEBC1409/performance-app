export type BlockType = "clase" | "gym" | "mouredev" | "ingles" | "libre" | "otro";

export interface HorarioCell {
  text: string;
  type: BlockType;
}

export interface HorarioRow {
  time: string;
  cells: HorarioCell[]; // Lun..Dom
}

function c(text: string, type: BlockType): HorarioCell {
  return { text, type };
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

export const HORARIO: HorarioRow[] = [
  {
    time: "5:20-6:00",
    cells: [
      c("Despertar + aseo", "otro"),
      c("Despertar + aseo", "otro"),
      c("—", "otro"),
      c("—", "otro"),
      c("Despertar + aseo", "otro"),
      c("Despertar + aseo", "otro"),
      c("—", "otro"),
    ],
  },
  {
    time: "6:00-8:00",
    cells: [
      c("Admin Sistemas ★", "clase"),
      c("Pruebas y Calidad ★", "clase"),
      c("Despertar 6:30", "otro"),
      c("Despertar 6:30", "otro"),
      c("Admin Sistemas ★", "clase"),
      c("Pruebas y Calidad ★", "clase"),
      c("Despertar 7:00", "otro"),
    ],
  },
  {
    time: "8:00-10:00",
    cells: [
      c("GYM (si toca)", "gym"),
      c("GYM (si toca)", "gym"),
      c("GYM 7:30-9:00", "gym"),
      c("GYM 7:30-9:00", "gym"),
      c("GYM (si toca)", "gym"),
      c("Aplic. Serv. Web ★", "clase"),
      c("GYM 8:00-9:30", "gym"),
    ],
  },
  {
    time: "10:00-12:00",
    cells: [
      c("Uni + MoureDev", "mouredev"),
      c("Uni tareas", "clase"),
      c("MoureDev + Uni", "mouredev"),
      c("MoureDev + Uni", "mouredev"),
      c("Uni pendientes", "clase"),
      c("Estadística PRESENCIAL ★", "clase"),
      c("Uni + planear MoureDev", "mouredev"),
    ],
  },
  {
    time: "12:00-14:00",
    cells: [
      c("Almuerzo + ir a Blendex", "otro"),
      c("Almuerzo + ir a Blendex", "otro"),
      c("Almuerzo + ir a Blendex", "otro"),
      c("Almuerzo + ir a Blendex", "otro"),
      c("Almuerzo + MoureDev", "mouredev"),
      c("Almuerzo + GYM", "gym"),
      c("Almuerzo + Meal prep", "otro"),
    ],
  },
  {
    time: "14:00-16:00",
    cells: [
      c("INGLÉS Blendex", "ingles"),
      c("INGLÉS Blendex", "ingles"),
      c("INGLÉS Blendex", "ingles"),
      c("INGLÉS Blendex", "ingles"),
      c("MoureDev bloque largo", "mouredev"),
      c("Meal prep tuppers", "otro"),
      c("LIBRE", "libre"),
    ],
  },
  {
    time: "16:00-18:00",
    cells: [
      c("MoureDev código", "mouredev"),
      c("MoureDev bloque fuerte", "mouredev"),
      c("MoureDev código", "mouredev"),
      c("MoureDev proyecto", "mouredev"),
      c("LIBRE", "libre"),
      c("MoureDev repaso", "mouredev"),
      c("LIBRE", "libre"),
    ],
  },
  {
    time: "18:00-20:00",
    cells: [
      c("Diseño de Sistemas ★", "clase"),
      c("MoureDev proyecto", "mouredev"),
      c("Diseño de Sistemas ★", "clase"),
      c("Cena + descanso", "otro"),
      c("LIBRE noche", "libre"),
      c("LIBRE", "libre"),
      c("LIBRE", "libre"),
    ],
  },
  {
    time: "20:00-22:00",
    cells: [
      c("Cena + libre", "otro"),
      c("Cena + libre", "otro"),
      c("Cena + libre", "otro"),
      c("Estadística ★ (alternante)", "clase"),
      c("Dormir 22:00", "otro"),
      c("Dormir 22:00", "otro"),
      c("Planear + dormir", "otro"),
    ],
  },
];

export interface SueñoRow {
  dias: string;
  acostar: string;
  despertar: string;
  horasLabel: string;
  horasMeta: number;
}

export const SUENO: SueñoRow[] = [
  { dias: "Lun / Mar / Vie / Sáb", acostar: "22:00", despertar: "5:20", horasLabel: "7h 20min", horasMeta: 7.33 },
  { dias: "Miércoles / Domingo", acostar: "22:00", despertar: "6:30 - 7:00", horasLabel: "8h - 8h30", horasMeta: 8.25 },
  { dias: "Jueves", acostar: "22:15", despertar: "5:20", horasLabel: "7h (clase hasta 22h)", horasMeta: 7 },
];

export const SLEEP_GOAL_HOURS = 7.5;

export const HORARIO_NOTE = "Semestre 2026-2 · Clases virtuales (excepto Estadística sábado) · Inglés Blendex L-J 14:00-16:00";
