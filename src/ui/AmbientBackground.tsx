export function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <svg className="ambient-waves" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="ambientLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#df2531" stopOpacity="0" />
            <stop offset="50%" stopColor="#ff5560" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#df2531" stopOpacity="0" />
          </linearGradient>
          <filter id="ambientGlow" x="-20%" y="-300%" width="140%" height="700%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          className="ambient-wave-path ambient-wave-path-1"
          d="M -100 120 C 260 30, 620 260, 980 130 S 1660 20, 1980 170"
          fill="none"
          stroke="url(#ambientLine)"
          strokeWidth="2.5"
          filter="url(#ambientGlow)"
        />
        <path
          className="ambient-wave-path ambient-wave-path-2"
          d="M -100 440 C 240 350, 600 550, 960 420 S 1620 320, 1980 470"
          fill="none"
          stroke="url(#ambientLine)"
          strokeWidth="2"
          filter="url(#ambientGlow)"
          opacity="0.75"
        />
        <path
          className="ambient-wave-path ambient-wave-path-3"
          d="M -100 760 C 280 670, 640 870, 1000 730 S 1660 640, 1980 790"
          fill="none"
          stroke="url(#ambientLine)"
          strokeWidth="2"
          filter="url(#ambientGlow)"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}
