import type { GymDay } from "@/lib/cycle";
import type { MuscleGroup } from "./muscleGroups";
import { MUSCLE_GROUP_ORDER, registerExerciseGroups } from "./muscleGroups";

export interface ExerciseTarget {
  name: string;
  series: number;
  repsLabel: string;
  preFatiga?: boolean;
  toFailureLast?: boolean;
  dropset?: boolean;
  note?: string;
  /** Where you're at today, before any logged history: the working weight
   * (kg) and reps. Feeds the suggested load until real sets take over. */
  startKg?: number;
  startReps?: number;
  /** How the load is counted ("por lado", "agarre abierto"…), shown with it. */
  loadNote?: string;
  /** Muscle group for volume/ranking; needed for exercises added in the app. */
  group?: MuscleGroup;
  /** When startKg/startReps were set (ISO date). Sessions logged before it no
   * longer drive the suggestion; defaults to START_WEIGHTS_AS_OF. */
  startAsOf?: string;
}

/** The date a exercise's starting weight applies from. */
export function startDate(ex: Pick<ExerciseTarget, "startAsOf">): string {
  return ex.startAsOf ?? START_WEIGHTS_AS_OF;
}

/** The day the starting weights (startKg/startReps below) were given. Logged
 * sessions before it are older than that and don't drive the suggestion. */
export const START_WEIGHTS_AS_OF = "2026-09-21";

export interface GymDayDef {
  key: GymDay;
  label: string;
  nombre: string;
  grupo: string;
  ex: ExerciseTarget[];
}

const DEFAULT_GYM_DIAS: Record<GymDay, GymDayDef> = {
  A: {
    key: "A",
    label: "Día A",
    nombre: "PULL",
    grupo: "Espalda · Bíceps + Laterales",
    ex: [
      { name: "Pullover en polea", series: 3, repsLabel: "8-10", preFatiga: true, toFailureLast: true, note: "Pre-fatiga el dorsal", startKg: 21.5 },
      { name: "Jalón al pecho agarre ancho", series: 3, repsLabel: "6-10", toFailureLast: true, note: "Negativas lentas 4s en la última", startKg: 66 },
      { name: "Remo en máquina Hammer", series: 3, repsLabel: "8-12", toFailureLast: true, startKg: 35, loadNote: "por lado · agarre abierto" },
      { name: "Remo unilateral en Hammer", series: 3, repsLabel: "10-12 c/lado", toFailureLast: true, startKg: 60, loadNote: "por lado" },
      { name: "Face pulls", series: 3, repsLabel: "15-20", toFailureLast: true, note: "Deltoides posterior", startKg: 17.5 },
      { name: "Curl barra Z", series: 3, repsLabel: "10-12", toFailureLast: true, startKg: 10, loadNote: "por lado" },
      { name: "Curl sentado inclinado", series: 3, repsLabel: "10-12", toFailureLast: true, startKg: 14 },
      { name: "Curl en máquina", series: 3, repsLabel: "10-12", toFailureLast: true, startKg: 40 },
      { name: "Laterales con mancuerna", series: 3, repsLabel: "12-15", toFailureLast: true, note: "V-TAPER: peso liviano", startKg: 12 },
    ],
  },
  B: {
    key: "B",
    label: "Día B",
    nombre: "PUSH",
    grupo: "Pecho · Hombro · Tríceps",
    ex: [
      { name: "Aperturas mancuerna inclinado", series: 3, repsLabel: "12", preFatiga: true, toFailureLast: true, note: "Pre-fatiga el pecho", startKg: 18 },
      { name: "Press inclinado mancuernas", series: 3, repsLabel: "6-10", toFailureLast: true, note: "Negativas en la última", startKg: 32 },
      { name: "Press plano en máquina", series: 3, repsLabel: "8-12", toFailureLast: true, startKg: 63 },
      { name: "Pec deck", series: 3, repsLabel: "10-12", toFailureLast: true, note: "Squeeze 1s en contracción", startKg: 66 },
      { name: "Press militar mancuernas sentado", series: 3, repsLabel: "8-10", toFailureLast: true, startKg: 22 },
      { name: "Laterales mancuerna", series: 4, repsLabel: "12-15", toFailureLast: true, dropset: true, note: "V-TAPER: dropset 50% al fallo en la última", startKg: 12, loadNote: "dropset a 10 kg" },
      { name: "Fondos en paralelas", series: 3, repsLabel: "al fallo", toFailureLast: true, startReps: 8, loadNote: "peso corporal · haces 6-8" },
      { name: "Extensión trícep cuerda", series: 3, repsLabel: "12-15", toFailureLast: true, startKg: 28 },
    ],
  },
  C: {
    key: "C",
    label: "Día C",
    nombre: "PIERNAS + CORE",
    grupo: "Cintura angosta",
    ex: [
      { name: "Extensiones de piernas", series: 3, repsLabel: "12", preFatiga: true, toFailureLast: true, note: "Pre-fatiga cuádriceps", startKg: 100 },
      { name: "Sentadilla libre / Prensa", series: 3, repsLabel: "8-12", toFailureLast: true, note: "Profundidad completa", startKg: 110 },
      { name: "Extensión de piernas unilateral", series: 3, repsLabel: "10-12 c/lado", toFailureLast: true, startKg: 53 },
      { name: "Peso muerto rumano", series: 3, repsLabel: "8-10", toFailureLast: true, note: "Bisagra de cadera, espalda neutra", startKg: 110 },
      { name: "Curl femoral sentado", series: 3, repsLabel: "10-12", toFailureLast: true, startKg: 35 },
      { name: "Extensión pantorrilla", series: 4, repsLabel: "15-20", toFailureLast: true, note: "Pausa 2s abajo", startKg: 50 },
      { name: "Circuito core", series: 3, repsLabel: "rondas", note: "Plancha 30-45s + Dead bug 10/lado + Pallof press 12/lado" },
    ],
  },
};

export const GYM_DAY_ORDER: GymDay[] = ["A", "B", "C"];

// ── Editable routine ────────────────────────────────────────────────────
// GYM_DIAS is the live routine every screen reads. It starts as the built-in
// one and is mutated in place by applyRoutine() when a saved/synced routine
// is loaded, so importers never hold a stale copy.

export type RoutineConfig = Record<GymDay, { nombre: string; grupo: string; ex: ExerciseTarget[] }>;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const GYM_DIAS: Record<GymDay, GymDayDef> = clone(DEFAULT_GYM_DIAS);

export function defaultRoutine(): RoutineConfig {
  const out = {} as RoutineConfig;
  for (const d of GYM_DAY_ORDER) out[d] = { nombre: DEFAULT_GYM_DIAS[d].nombre, grupo: DEFAULT_GYM_DIAS[d].grupo, ex: clone(DEFAULT_GYM_DIAS[d].ex) };
  return out;
}

export function currentRoutineConfig(): RoutineConfig {
  const out = {} as RoutineConfig;
  for (const d of GYM_DAY_ORDER) out[d] = { nombre: GYM_DIAS[d].nombre, grupo: GYM_DIAS[d].grupo, ex: clone(GYM_DIAS[d].ex) };
  return out;
}

const num = (v: unknown, min: number, max: number): number | undefined => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const str = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : undefined);

/** Validates a stored/synced routine; null when it can't be trusted. Anything
 * malformed inside a day makes the whole routine invalid, so a bad sync can
 * never leave you with half a workout. */
export function sanitizeRoutine(raw: unknown): RoutineConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const out = {} as RoutineConfig;
  for (const d of GYM_DAY_ORDER) {
    const day = (raw as Record<string, unknown>)[d] as { nombre?: unknown; grupo?: unknown; ex?: unknown } | undefined;
    if (!day || typeof day !== "object") return null;
    const nombre = str(day.nombre, 40);
    const grupo = str(day.grupo, 60);
    if (!nombre || !grupo || !Array.isArray(day.ex) || day.ex.length < 1 || day.ex.length > 24) return null;
    const seen = new Set<string>();
    const ex: ExerciseTarget[] = [];
    for (const e of day.ex as Record<string, unknown>[]) {
      const name = str(e?.name, 60);
      const series = num(e?.series, 1, 12);
      const repsLabel = str(e?.repsLabel, 24);
      if (!name || !series || !repsLabel || seen.has(name)) return null;
      seen.add(name);
      const t: ExerciseTarget = { name, series: Math.round(series), repsLabel };
      const note = str(e.note, 90);
      const loadNote = str(e.loadNote, 40);
      const startKg = num(e.startKg, 0, 1000);
      const startReps = num(e.startReps, 1, 200);
      if (note) t.note = note;
      if (loadNote) t.loadNote = loadNote;
      if (startKg != null) t.startKg = startKg;
      if (startReps != null) t.startReps = Math.round(startReps);
      if (e.preFatiga === true) t.preFatiga = true;
      if (e.toFailureLast === true) t.toFailureLast = true;
      if (e.dropset === true) t.dropset = true;
      if (typeof e.startAsOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.startAsOf)) t.startAsOf = e.startAsOf;
      if (typeof e.group === "string" && (MUSCLE_GROUP_ORDER as string[]).includes(e.group)) t.group = e.group as MuscleGroup;
      ex.push(t);
    }
    out[d] = { nombre, grupo, ex };
  }
  return out;
}

/** Makes a routine the live one (mutating GYM_DIAS in place). */
export function applyRoutine(cfg: RoutineConfig): void {
  const groups: Record<string, MuscleGroup> = {};
  for (const d of GYM_DAY_ORDER) {
    GYM_DIAS[d].nombre = cfg[d].nombre;
    GYM_DIAS[d].grupo = cfg[d].grupo;
    GYM_DIAS[d].ex.splice(0, GYM_DIAS[d].ex.length, ...clone(cfg[d].ex));
    for (const e of cfg[d].ex) if (e.group) groups[e.name] = e.group;
  }
  registerExerciseGroups(groups);
}

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
