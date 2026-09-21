export type IconName = "arrow-up" | "arrow-down" | "arrow-left" | "arrow-right" | "chevron-left" | "chevron-right" | "plus" | "minus" | "close" | "check" | "expand";

const PATHS: Record<IconName, string> = {
  "arrow-up": "M12 19V5M5.5 11.5 12 5l6.5 6.5",
  "arrow-down": "M12 5v14M5.5 12.5 12 19l6.5-6.5",
  "arrow-left": "M19 12H5M11.5 5.5 5 12l6.5 6.5",
  "arrow-right": "M5 12h14M12.5 5.5 19 12l-6.5 6.5",
  "chevron-left": "M15 5l-7 7 7 7",
  "chevron-right": "M9 5l7 7-7 7",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
};

/** One consistent set of line icons for controls, instead of text arrows and
 * symbols that render differently on every device. Inherits the text color. */
export function Icon({ name, size = 16, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
