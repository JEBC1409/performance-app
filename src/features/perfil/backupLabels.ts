import type { BackupTable } from "@/lib/jsonBackup";

/** What the person sees for each table of a backup. */
export const BACKUP_TABLE_LABEL: Record<BackupTable, string> = {
  sets: "Series de entreno",
  habitDays: "Días de hábitos",
  habitDefs: "Hábitos",
  focusSessions: "Sesiones de Focus",
  exercisePhotos: "Fotos de ejercicios",
  appConfig: "Rutina y horario",
  weights: "Peso y medidas",
  sleep: "Sueño",
  savedVerses: "Versículos guardados",
  moureWeeks: "Semanas de MoureDev",
  settings: "Ajustes",
  bibleReadDays: "Días de lectura bíblica",
};
