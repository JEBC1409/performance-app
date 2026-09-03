import type { ReactNode } from "react";

export function Eyebrow({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <div className={`eyebrow ${accent ? "eyebrow-accent" : ""}`}>{children}</div>;
}
