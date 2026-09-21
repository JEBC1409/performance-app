/** Exercise photos sourced from the free, keyless Free Exercise DB
 * (github.com/yuhonas/free-exercise-db, MIT license). Each of our routine's
 * exercise names is mapped to its closest visual match in that dataset —
 * ours are in Spanish gym slang, theirs in English, so this is a manual
 * lookup rather than automated fuzzy matching. */
const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

/** Values are the dataset id, optionally "id#1" to use its second frame
 * (the contracted position) instead of the first. */
const EXERCISE_IMAGE_ID: Record<string, string> = {
  "Pullover en polea": "Straight-Arm_Pulldown",
  "Jalón al pecho agarre ancho": "Wide-Grip_Lat_Pulldown",
  "Remo en máquina Hammer": "Leverage_Iso_Row",
  "Remo unilateral en Hammer": "Leverage_Iso_Row#1",
  "Face pulls": "Face_Pull",
  "Curl barra Z": "EZ-Bar_Curl",
  "Curl sentado inclinado": "Incline_Dumbbell_Curl",
  "Curl en máquina": "Machine_Bicep_Curl",
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
  "Sentadilla libre / Prensa": "Barbell_Squat",
  "Extensión de piernas unilateral": "Single-Leg_Leg_Extension",
  "Peso muerto rumano": "Romanian_Deadlift",
  "Curl femoral sentado": "Seated_Leg_Curl",
  "Extensión pantorrilla": "Standing_Calf_Raises",
  "Circuito core": "Plank",
};

export function exerciseImageUrl(name: string): string | null {
  const entry = EXERCISE_IMAGE_ID[name];
  if (!entry) return null;
  const [id, frame = "0"] = entry.split("#");
  return `${IMAGE_BASE}/${id}/${frame}.jpg`;
}
