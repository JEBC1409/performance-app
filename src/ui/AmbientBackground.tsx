/** `calm` drops the bold folded-ribbon accent and softens the grain, for
 * screens (like Login) that want a quiet, elegant backdrop rather than the
 * app's usual bolder decorative treatment. */
export function AmbientBackground({ calm = false }: { calm?: boolean } = {}) {
  return (
    <div className={`ambient-bg ${calm ? "ambient-bg-calm" : ""}`} aria-hidden="true">
      <div className="ambient-dune ambient-dune-1" />
      <div className="ambient-dune ambient-dune-2" />
      {calm ? null : <div className="ambient-ribbons" />}
      <div className="ambient-grain" />
    </div>
  );
}
