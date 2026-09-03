export type MuscleGroup = "espalda" | "pecho" | "hombro" | "brazo" | "pierna" | "core";

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  espalda: "Espalda",
  pecho: "Pecho",
  hombro: "Hombro",
  brazo: "Brazo",
  pierna: "Pierna",
  core: "Core",
};

export const EXERCISE_MUSCLE_GROUP: Record<string, MuscleGroup> = {
  "Pullover en banco": "espalda",
  "Jalón al pecho agarre ancho": "espalda",
  "Remo en máquina Hammer": "espalda",
  "Remo unilateral en Hammer": "espalda",
  "Face pulls": "hombro",
  "Curl barra Z": "brazo",
  "Curl martillo": "brazo",
  "Laterales con mancuerna": "hombro",
  "Aperturas mancuerna inclinado": "pecho",
  "Press inclinado mancuernas": "pecho",
  "Press plano en máquina": "pecho",
  "Pec deck": "pecho",
  "Press militar mancuernas sentado": "hombro",
  "Laterales mancuerna": "hombro",
  "Fondos en paralelas": "brazo",
  "Extensión trícep cuerda": "brazo",
  "Extensiones de piernas": "pierna",
  "Sentadilla libre / Prensa": "pierna",
  "Extensión de piernas unilateral": "pierna",
  "Peso muerto rumano": "pierna",
  "Curl femoral sentado": "pierna",
  "Extensión pantorrilla": "pierna",
  "Circuito core": "core",
  // Retired exercise names — kept so already-logged historical sets (not
  // rewritten when the routine's names/equipment changed) still count
  // toward muscle volume.
  "Pullover en polea": "espalda",
  "Remo en máquina o barra": "espalda",
  "Remo unilateral mancuerna": "espalda",
  "Prensa / Hack squat": "pierna",
  "Sentadilla búlgara": "pierna",
  "Curl femoral acostado": "pierna",
};

export const MUSCLE_GROUP_ORDER: MuscleGroup[] = ["espalda", "pecho", "hombro", "brazo", "pierna", "core"];

export function groupForExercise(name: string): MuscleGroup | null {
  return EXERCISE_MUSCLE_GROUP[name] ?? null;
}
