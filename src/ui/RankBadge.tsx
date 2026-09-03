import type { RankTier } from "@/lib/muscleRank";

function polygonPoints(sides: number, size: number, cx: number, cy: number): string {
  const r = size / 2;
  const offset = -Math.PI / 2;
  return Array.from({ length: sides }, (_, i) => {
    const a = offset + (i * 2 * Math.PI) / sides;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

export function RankBadge({ tier, size = 40 }: { tier: RankTier; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const filterId = `rank-glow-${tier.key}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={size * 0.09} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        {tier.sides === 0 ? (
          <>
            <circle cx={cx} cy={cy} r={size * 0.34} fill={`${tier.color}33`} stroke={tier.color} strokeWidth={size * 0.045} />
            <path
              d={`M ${cx} ${cy - size * 0.18} L ${cx + size * 0.06} ${cy - size * 0.06} L ${cx + size * 0.18} ${cy} L ${cx + size * 0.06} ${cy + size * 0.06} L ${cx} ${cy + size * 0.18} L ${cx - size * 0.06} ${cy + size * 0.06} L ${cx - size * 0.18} ${cy} L ${cx - size * 0.06} ${cy - size * 0.06} Z`}
              fill={tier.color}
            />
          </>
        ) : (
          <>
            <polygon points={polygonPoints(tier.sides, size * 0.72, cx, cy)} fill={`${tier.color}33`} stroke={tier.color} strokeWidth={size * 0.045} />
            <polygon points={polygonPoints(Math.max(3, tier.sides), size * 0.3, cx, cy)} fill={tier.color} />
          </>
        )}
      </g>
    </svg>
  );
}
