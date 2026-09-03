import type { HabitIcon } from "@/data/habits";

interface GlyphProps {
  size?: number;
  active?: boolean;
  className?: string;
}

/** Geometric glyphs only — squares, circles, bars, diamonds. No emoji, per the visual spec. */
export function HabitGlyph({
  icon,
  size = 8,
  active = false,
  activeColor = "var(--color-red)",
  className = "",
}: GlyphProps & { icon: HabitIcon; activeColor?: string }) {
  const color = active ? activeColor : "var(--color-muted-2)";
  const s = size;
  if (icon === "circle") {
    return (
      <svg width={s} height={s} viewBox="0 0 10 10" className={className} aria-hidden>
        <circle cx="5" cy="5" r="4" fill={active ? color : "none"} stroke={color} strokeWidth="1.4" />
      </svg>
    );
  }
  if (icon === "square") {
    return (
      <svg width={s} height={s} viewBox="0 0 10 10" className={className} aria-hidden>
        <rect x="1" y="1" width="8" height="8" fill={active ? color : "none"} stroke={color} strokeWidth="1.4" />
      </svg>
    );
  }
  if (icon === "diamond") {
    return (
      <svg width={s} height={s} viewBox="0 0 10 10" className={className} aria-hidden>
        <rect x="1.5" y="1.5" width="7" height="7" fill={active ? color : "none"} stroke={color} strokeWidth="1.4" transform="rotate(45 5 5)" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 10 10" className={className} aria-hidden>
      <rect x="0.5" y="6" width="2" height="3.5" fill={color} />
      <rect x="4" y="3" width="2" height="6.5" fill={color} />
      <rect x="7.5" y="0.5" width="2" height="9" fill={color} />
    </svg>
  );
}

/** Streak flame — a deliberate exception to the geometric-only rule above,
 * per explicit request for a "neon fire" streak indicator. Glow comes from
 * the .flame-glow CSS class (drop-shadow), not from the SVG itself. */
export function FlameGlyph({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 1.2c.3 2 1.6 3.1 2.7 4.4C11.7 6.9 12.5 8.1 12.5 9.6a4.5 4.5 0 1 1-9 0c0-1.4.5-2.4 1.1-3.3.2.9-.1 1.7.6 2.1.5.3.9 0 .8-.6-.3-1.3.1-2.7 1-3.7C7.6 3.4 8 2.4 8 1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function NavGlyph({ tab, active, activeColor = "var(--color-red)" }: { tab: string; active: boolean; activeColor?: string }) {
  const stroke = active ? activeColor : "rgba(255,255,255,0.5)";
  const common = { width: 18, height: 18, viewBox: "0 0 18 18", "aria-hidden": true as const };
  switch (tab) {
    case "hoy":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="14" height="14" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="9" cy="9" r="2.4" fill={active ? stroke : "none"} stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "entreno":
      return (
        <svg {...common}>
          <rect x="1" y="7.5" width="3" height="3" fill={stroke} />
          <rect x="14" y="7.5" width="3" height="3" fill={stroke} />
          <rect x="4.5" y="6" width="9" height="6" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "habitos":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="6" height="6" fill={active ? stroke : "none"} stroke={stroke} strokeWidth="1.5" />
          <rect x="10" y="2" width="6" height="6" fill="none" stroke={stroke} strokeWidth="1.5" />
          <rect x="2" y="10" width="6" height="6" fill="none" stroke={stroke} strokeWidth="1.5" />
          <rect x="10" y="10" width="6" height="6" fill={active ? stroke : "none"} stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "datos":
      return (
        <svg {...common}>
          <rect x="2" y="10" width="3" height="6" fill={stroke} />
          <rect x="7.5" y="5" width="3" height="11" fill={stroke} />
          <rect x="13" y="1" width="3" height="15" fill={stroke} />
        </svg>
      );
    case "mas":
      return (
        <svg {...common}>
          <circle cx="4" cy="9" r="1.6" fill={stroke} />
          <circle cx="9" cy="9" r="1.6" fill={stroke} />
          <circle cx="14" cy="9" r="1.6" fill={stroke} />
        </svg>
      );
    case "horario":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="14" height="14" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M9 5v4l3 2" stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="square" />
        </svg>
      );
    case "kairos":
      return (
        <svg {...common}>
          <rect x="3" y="2" width="12" height="14" fill="none" stroke={stroke} strokeWidth="1.5" />
          <rect x="6" y="5.5" width="6" height="1.4" fill={stroke} />
          <rect x="6" y="8.5" width="6" height="1.4" fill={stroke} />
          <rect x="6" y="11.5" width="3" height="1.4" fill={stroke} />
        </svg>
      );
    case "mouredev":
      return (
        <svg {...common}>
          <path d="M6 3l-4.5 6L6 15" stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
          <path d="M12 3l4.5 6-4.5 6" stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
        </svg>
      );
    case "perfil":
      return (
        <svg {...common}>
          <circle cx="9" cy="6" r="3" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="square" />
        </svg>
      );
    default:
      return <svg {...common} />;
  }
}
