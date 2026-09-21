import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import type { ExercisePhotoRecord } from "@/db/db";
import { exerciseImageUrl } from "@/data/exerciseImages";

/** Every custom photo, keyed by exercise name. */
export function useExercisePhotos(): Map<string, ExercisePhotoRecord> {
  const rows = useLiveQuery(() => db.exercisePhotos.toArray(), []);
  return new Map((rows ?? []).map((r) => [r.name, r]));
}

/** The photo to show for an exercise: the user's own if they set one. */
export function resolvePhoto(name: string, custom: ExercisePhotoRecord | undefined): { src: string | null; caption?: string; custom: boolean } {
  if (custom) return { src: custom.dataUrl, caption: custom.caption, custom: true };
  return { src: exerciseImageUrl(name), custom: false };
}
