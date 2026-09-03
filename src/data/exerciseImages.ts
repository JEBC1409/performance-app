/** Exercise photos sourced from the free, keyless Free Exercise DB
 * (github.com/yuhonas/free-exercise-db, MIT license). Each of our routine's
 * exercise names is mapped to its closest visual match in that dataset —
 * ours are in Spanish gym slang, theirs in English, so this is a manual
 * lookup rather than automated fuzzy matching. */
const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const EXERCISE_IMAGE_ID: Record<string, string> = {
  "Pullover en polea": "Straight-Arm_Dumbbell_Pullover",
  "Jalón al pecho agarre ancho": "Wide-Grip_Lat_Pulldown",
  "Remo en máquina o barra": "Seated_Cable_Rows",
  "Remo unilateral mancuerna": "One-Arm_Dumbbell_Row",
  "Face pulls": "Face_Pull",
  "Curl barra Z": "EZ-Bar_Curl",
  "Curl martillo": "Hammer_Curls",
  "Laterales con mancuerna": "Side_Lateral_Raise",
  "Aperturas mancuerna inclinado": "Incline_Dumbbell_Flyes",
  "Press inclinado mancuernas": "Incline_Dumbbell_Press",
  "Press plano en máquina": "Machine_Bench_Press",
  "Pec deck": "Butterfly",
  "Press militar mancuernas sentado": "Seated_Dumbbell_Press",
  "Laterales mancuerna": "Side_Lateral_Raise",
  "Fondos en paralelas": "Parallel_Bar_Dip",
  "Extensión trícep cuerda": "Triceps_Pushdown_-_Rope_Attachment",
  "Extensiones de piernas": "Leg_Extensions",
  "Prensa / Hack squat": "Leg_Press",
  "Sentadilla búlgara": "Split_Squat_with_Dumbbells",
  "Peso muerto rumano": "Romanian_Deadlift",
  "Curl femoral acostado": "Lying_Leg_Curls",
  "Extensión pantorrilla": "Standing_Calf_Raises",
  "Circuito core": "Plank",
};

export function exerciseImageUrl(name: string): string | null {
  const id = EXERCISE_IMAGE_ID[name];
  return id ? `${IMAGE_BASE}/${id}/0.jpg` : null;
}
