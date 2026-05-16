import { GridBg } from "./feature-illustrations";

export function EmployerReadIllustration() {
  const bars = [
    { label: "TECHNICAL", pct: 94, color: "#0f766e", delay: 0.4 },
    { label: "SAFETY",    pct: 98, color: "#0891b2", delay: 0.6 },
    { label: "QUALITY",   pct: 92, color: "#6366f1", delay: 0.8 },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden text-foreground">
      <GridBg />
      <svg viewBox="0 0 240 140" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
        
        {/* Grade Section */}
        <g transform="translate(30, 35)">
          <g style={{ animation: "feat-fade-up 0.5s ease-out both" }}>
            <rect x="0" y="0" width="60" height="70" rx="12" fill="none" stroke="#0f766e" strokeWidth="1.5" strokeOpacity="0.3" />
            <text x="30" y="45" textAnchor="middle" fontSize="48" fontWeight="900" fill="#0f766e" style={{ filter: "drop-shadow(0 0 8px rgba(15,118,110,0.2))" }}>A</text>
            <text x="30" y="62" textAnchor="middle" fontSize="7" fontWeight="800" fill="currentColor" fillOpacity="0.3" letterSpacing="0.1em">COMPOSITE</text>
          </g>
        </g>

        {/* Hire Signal */}
        <g transform="translate(30, 112)">
          <g style={{ animation: "feat-fade-up 0.5s 0.2s ease-out both" }}>
            <g style={{ animation: "feat-pulse 2s ease-in-out infinite" }}>
              <rect x="0" y="0" width="60" height="14" rx="7" fill="#0f766e" fillOpacity="0.1" stroke="#0f766e" strokeWidth="0.8" strokeOpacity="0.4" />
              <text x="30" y="9.5" textAnchor="middle" fontSize="6" fontWeight="900" fill="#0f766e" letterSpacing="0.05em">STRONG HIRE</text>
            </g>
          </g>
        </g>

        {/* Stats Section */}
        <g transform="translate(110, 35)">
          {bars.map((bar, i) => (
            <g key={i} transform={`translate(0, ${i * 30})`}>
              <g style={{ animation: `feat-fade-up 0.5s ${bar.delay}s ease-out both` }}>
                <text x="0" y="0" fontSize="6" fontWeight="800" fill="currentColor" fillOpacity="0.3" letterSpacing="0.05em">{bar.label}</text>
                <text x="100" y="0" textAnchor="end" fontSize="6" fontWeight="900" fill={bar.color}>{bar.pct}%</text>
                
                {/* Bar Background */}
                <rect x="0" y="6" width="100" height="5" rx="2.5" fill="currentColor" fillOpacity="0.06" />
                
                {/* Filling Bar */}
                <rect x="0" y="6" width="0" height="5" rx="2.5" fill={bar.color} fillOpacity="0.7">
                  <animate attributeName="width" from="0" to={bar.pct} dur="1s" begin={`${bar.delay}s`} fill="freeze" calcMode="spline" keySplines="0.4, 0, 0.2, 1" />
                </rect>
              </g>
            </g>
          ))}
        </g>

        {/* Timer Hint */}
        <g transform="translate(110, 122)">
          <g style={{ animation: "feat-fade-up 0.5s 1s ease-out both" }}>
            <text x="0" y="0" fontSize="5.5" fontWeight="800" fill="currentColor" fillOpacity="0.2" letterSpacing="0.15em">READ TIME: 0:30</text>
            <rect x="0" y="4" width="100" height="1" fill="currentColor" fillOpacity="0.05" />
            <rect x="0" y="4" width="0" height="1" fill="#0f766e" fillOpacity="0.3">
              <animate attributeName="width" from="0" to="100" dur="2s" begin="1.2s" fill="freeze" />
            </rect>
          </g>
        </g>

      </svg>
    </div>
  );
}
