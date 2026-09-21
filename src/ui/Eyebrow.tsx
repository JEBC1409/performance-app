import type { ReactNode } from "react";

export function Eyebrow({ children, accent = false, gold = false }: { children: ReactNode; accent?: boolean; gold?: boolean }) {
  return <div className={`eyebrow ${gold ? "eyebrow-gold" : accent ? "eyebrow-accent" : ""}`}>{children}</div>;
}
