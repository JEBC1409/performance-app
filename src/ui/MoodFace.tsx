/** A line-drawn face for a 1–5 mood, in the same style as the rest of the app's
 * icons (and the same on every device, unlike emoji). Inherits the text colour. */
const MOUTHS: Record<number, string> = {
  1: "M8 17c1.2-1.9 2.5-2.7 4-2.7s2.8.8 4 2.7",
  2: "M8.5 16.2c1-.9 2.1-1.3 3.5-1.3s2.5.4 3.5 1.3",
  3: "M9 15.5h6",
  4: "M8.5 14.3c1 1 2.1 1.5 3.5 1.5s2.5-.5 3.5-1.5",
  5: "M7.8 13.6h8.4c-.4 2.3-2 3.7-4.2 3.7s-3.8-1.4-4.2-3.7Z",
};

export function MoodFace({ level, size = 26, className = "" }: { level: number; size?: number; className?: string }) {
  const mouth = MOUTHS[Math.min(5, Math.max(1, Math.round(level)))];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M9 9.6v.6M15 9.6v.6" strokeWidth="2.2" />
      <path d={mouth} fill={level >= 5 ? "currentColor" : "none"} fillOpacity={level >= 5 ? 0.18 : 0} />
    </svg>
  );
}
