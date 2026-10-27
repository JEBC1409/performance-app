export type SaveOutcome<T> = { status: "ok"; value: T } | { status: "busy" } | { status: "error"; error: unknown };

/** Runs `write` unless another save guarded by the same flag is still in flight
 * (a double tap on "Guardar serie"), and never throws: the outcome says what
 * happened so the caller can toast on failure and skip what only makes sense
 * after a successful save (like starting the rest timer). The flag is always
 * released, so a failed save can be retried. */
export async function guardedSave<T>(guard: { current: boolean }, write: () => Promise<T>): Promise<SaveOutcome<T>> {
  if (guard.current) return { status: "busy" };
  guard.current = true;
  try {
    return { status: "ok", value: await write() };
  } catch (error) {
    return { status: "error", error };
  } finally {
    guard.current = false;
  }
}
