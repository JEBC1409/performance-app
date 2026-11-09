/** `calm` quiets the grid/glow/grain further, for screens (like Login) that
 * want a sober backdrop rather than the app's usual bolder treatment. */
export function AmbientBackground({ calm = false }: { calm?: boolean } = {}) {
  return (
    <div className={`ambient-bg ${calm ? "ambient-bg-calm" : ""}`} aria-hidden="true">
      <div className="ambient-glow" />
      <div className="ambient-grid" />
      <div className="ambient-grain" />
    </div>
  );
}
