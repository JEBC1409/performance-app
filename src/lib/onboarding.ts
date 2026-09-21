const KEY = "performance_onboarded_v1";
export const GUIDE_EVENT = "performance:guide";

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true; // no storage: never nag
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* fine */
  }
}

/** Opens the welcome guide again (Perfil › Ver la guía). */
export function requestGuide(): void {
  window.dispatchEvent(new Event(GUIDE_EVENT));
}

/** Leaves a Perfil section open, so a guide step can land you right on it. */
export function openPerfilSection(id: string): void {
  try {
    const all = JSON.parse(localStorage.getItem("performance_sections_v1") ?? "{}") as Record<string, boolean>;
    localStorage.setItem("performance_sections_v1", JSON.stringify({ ...all, [id]: true }));
  } catch {
    /* fine */
  }
}
