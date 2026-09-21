import { hintDatosTab } from "@/features/datos/tabHint";

/** Where a `?go=` link (the installed app's long-press shortcuts) should land.
 * Returns the screen key, or null for "no/unknown link". Also leaves the
 * one-shot hint Datos needs for the weight tab, and tidies the URL. */
export type DeepTab = "hoy" | "entreno" | "focus" | "habitos" | "datos" | "horario" | "perfil";

const TARGETS: Record<string, { tab: DeepTab; datos?: string }> = {
  hoy: { tab: "hoy" },
  entreno: { tab: "entreno" },
  focus: { tab: "focus" },
  habitos: { tab: "habitos" },
  horario: { tab: "horario" },
  perfil: { tab: "perfil" },
  peso: { tab: "datos", datos: "peso" },
  semana: { tab: "datos", datos: "semana" },
};

export function readDeepLink(search: string): DeepTab | null {
  const go = new URLSearchParams(search).get("go");
  const target = go ? TARGETS[go] : undefined;
  if (!target) return null;
  if (target.datos) hintDatosTab(target.datos);
  return target.tab;
}
