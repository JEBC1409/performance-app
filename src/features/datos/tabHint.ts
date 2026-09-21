/** Other screens (e.g. the Sunday card on Hoy) can ask Datos to open on a
 * given sub-tab by leaving a one-shot hint here. */
export const DATOS_TAB_HINT = "performance_datos_tab";

export function hintDatosTab(tab: string): void {
  try {
    localStorage.setItem(DATOS_TAB_HINT, tab);
  } catch {
    /* Datos just opens on its default tab */
  }
}
