import type { GymDay } from "@/lib/cycle";

export interface ExerciseTarget {
  name: string;
  series: number;
  repsLabel: string;
  preFatiga?: boolean;
  toFailureLast?: boolean;
  dropset?: boolean;
  note?: string;
}

export interface GymDayDef {
  key: GymDay;
  label: string;
  nombre: string;
  grupo: string;
  ex: ExerciseTarget[];
}

export const GYM_DIAS: Record<GymDay, GymDayDef> = {
  A: {
    key: "A",
    label: "Día A",
    nombre: "PULL",
    grupo: "Espalda · Bíceps + Laterales",
    ex: [
      { name: "Pullover en polea", series: 3, repsLabel: "8-10", preFatiga: true, toFailureLast: true, note: "Pre-fatiga el dorsal" },
      { name: "Jalón al pecho agarre ancho", series: 3, repsLabel: "6-10", toFailureLast: true, note: "Negativas lentas 4s en la última" },
      { name: "Remo en máquina o barra", series: 3, repsLabel: "8-12", toFailureLast: true },
      { name: "Remo unilateral mancuerna", series: 3, repsLabel: "10-12 c/lado", toFailureLast: true },
      { name: "Face pulls", series: 3, repsLabel: "15-20", toFailureLast: true, note: "Deltoides posterior" },
      { name: "Curl barra Z", series: 3, repsLabel: "10-12", toFailureLast: true },
      { name: "Curl martillo", series: 3, repsLabel: "10-12", toFailureLast: true },
      { name: "Laterales con mancuerna", series: 3, repsLabel: "12-15", toFailureLast: true, note: "V-TAPER: peso liviano" },
    ],
  },
  B: {
    key: "B",
    label: "Día B",
    nombre: "PUSH",
    grupo: "Pecho · Hombro · Tríceps",
    ex: [
      { name: "Aperturas mancuerna inclinado", series: 3, repsLabel: "12", preFatiga: true, toFailureLast: true, note: "Pre-fatiga el pecho" },
      { name: "Press inclinado mancuernas", series: 3, repsLabel: "6-10", toFailureLast: true, note: "Negativas en la última" },
      { name: "Press plano en máquina", series: 3, repsLabel: "8-12", toFailureLast: true },
      { name: "Pec deck", series: 3, repsLabel: "10-12", toFailureLast: true, note: "Squeeze 1s en contracción" },
      { name: "Press militar mancuernas sentado", series: 3, repsLabel: "8-10", toFailureLast: true },
      { name: "Laterales mancuerna", series: 4, repsLabel: "12-15", toFailureLast: true, dropset: true, note: "V-TAPER: dropset 50% al fallo en la última" },
      { name: "Fondos en paralelas", series: 3, repsLabel: "al fallo", toFailureLast: true },
      { name: "Extensión trícep cuerda", series: 3, repsLabel: "12-15", toFailureLast: true },
    ],
  },
  C: {
    key: "C",
    label: "Día C",
    nombre: "PIERNAS + CORE",
    grupo: "Cintura angosta",
    ex: [
      { name: "Extensiones de piernas", series: 3, repsLabel: "12", preFatiga: true, toFailureLast: true, note: "Pre-fatiga cuádriceps" },
      { name: "Prensa / Hack squat", series: 3, repsLabel: "8-12", toFailureLast: true, note: "Profundidad completa" },
      { name: "Sentadilla búlgara", series: 3, repsLabel: "10 c/lado", toFailureLast: true },
      { name: "Peso muerto rumano", series: 3, repsLabel: "8-10", toFailureLast: true, note: "Bisagra de cadera, espalda neutra" },
      { name: "Curl femoral acostado", series: 3, repsLabel: "10-12", toFailureLast: true },
      { name: "Extensión pantorrilla", series: 4, repsLabel: "15-20", toFailureLast: true, note: "Pausa 2s abajo" },
      { name: "Circuito core", series: 3, repsLabel: "rondas", note: "Plancha 30-45s + Dead bug 10/lado + Pallof press 12/lado" },
    ],
  },
};

export const GYM_DAY_ORDER: GymDay[] = ["A", "B", "C"];

export interface RutinaItem {
  ex: string;
  series: number;
  carga: string;
  nota: string;
}

export const RUTINA_MATUTINA: RutinaItem[] = [
  { ex: "Stomach vacuums", series: 5, carga: "20-30 seg", nota: "Exhalá todo, metés ombligo a la columna, sostenés" },
  { ex: "Plancha frontal", series: 3, carga: "30-45 seg", nota: "Cuerpo recto, sin bajar cadera" },
  { ex: "Dead bug", series: 3, carga: "8-10/lado", nota: "Espalda baja pegada al piso, lento y controlado" },
  { ex: "Bird dog", series: 3, carga: "10/lado", nota: "En 4 puntos, brazo y pierna opuestos, sostener 3 seg" },
];

export const CARDIO_NOTA = "15-20 min caminata inclinada (10-12%, 5-6 km/h) después de entrenar, 3x/semana. No correr.";

export function allExerciseNames(): string[] {
  const set = new Set<string>();
  (Object.keys(GYM_DIAS) as GymDay[]).forEach((k) => GYM_DIAS[k].ex.forEach((e) => set.add(e.name)));
  return Array.from(set);
}

export function targetSetsForDay(day: GymDay): number {
  return GYM_DIAS[day].ex.reduce((a, e) => a + e.series, 0);
}
