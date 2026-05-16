import { GridBg } from "./feature-illustrations";

export function AIIllustration() {
  const wires = [
    { y: 65, color: "#0f766e", dur: "1.4s", begin: "0s"   },
    { y: 77, color: "#0891b2", dur: "1.8s", begin: "0.3s" },
    { y: 89, color: "#6366f1", dur: "1.2s", begin: "0.6s" },
  ];
  const chipX = 145;
  const chipY = 55;
  const leftWireStart = 100;
  const leftWireEnd = chipX - 5;
  const rightWireStart = chipX + 55;
  const rightWireEnd = 240;

  return (
    <div className="relative w-full h-full overflow-hidden text-foreground">
      <GridBg />
      <svg viewBox="0 0 350 140" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
        <defs>
          {wires.map(({ color, dur, begin }, i) => (
            <linearGradient key={i} id={`volt-t${i}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="350" y2="0">
              <stop offset="0%"  stopColor={color} stopOpacity="0">
                <animate attributeName="offset" values="-0.3;1.3" dur={dur} begin={begin} repeatCount="indefinite" />
              </stop>
              <stop offset="8%"  stopColor={color} stopOpacity="1">
                <animate attributeName="offset" values="-0.22;1.38" dur={dur} begin={begin} repeatCount="indefinite" />
              </stop>
              <stop offset="16%" stopColor={color} stopOpacity="0">
                <animate attributeName="offset" values="-0.14;1.46" dur={dur} begin={begin} repeatCount="indefinite" />
              </stop>
            </linearGradient>
          ))}
        </defs>

        {/* Role Description */}
        <text x="50" y="42" fontSize="5.5" fontWeight="900" fill="#0f766e" fillOpacity="0.6">ROLE DESCRIPTION</text>
        {[50, 60, 70, 80, 90, 100].map((y, i) => (
          <rect key={i} x="50" y={y} width={[40, 25, 35, 20, 30, 25][i]} height="4" rx="2" fill="currentColor" fillOpacity="0.12" />
        ))}

        {/* Wires */}
        {wires.map(({ y, color }, i) => (
          <g key={i}>
            <line x1={leftWireStart} y1={y} x2={leftWireEnd} y2={y} stroke={color} strokeWidth="0.5" strokeOpacity="0.15" />
            <line x1={leftWireStart} y1={y} x2={leftWireEnd} y2={y} stroke={`url(#volt-t${i})`} strokeWidth="1.5" strokeLinecap="round" />
            <line x1={rightWireStart} y1={y} x2={rightWireEnd} y2={y} stroke={color} strokeWidth="0.5" strokeOpacity="0.15" />
            <line x1={rightWireStart} y1={y} x2={rightWireEnd} y2={y} stroke={`url(#volt-t${i})`} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ))}

        {/* AI Chip Design */}
        <g transform={`translate(${chipX}, ${chipY})`}>
          <g style={{ animation: "feat-fade-up 0.5s 0.2s ease-out both" }}>
            {/* External Pins */}
            {[10, 22, 34].map(p => (
              <g key={p} fill="#0f766e" fillOpacity="0.4">
                <rect x="-4" y={p} width="4" height="2" rx="0.5" /> {/* Left */}
                <rect x="50" y={p} width="4" height="2" rx="0.5" /> {/* Right */}
                <rect x={p} y="-4" width="2" height="4" rx="0.5" /> {/* Top */}
                <rect x={p} y="50" width="2" height="4" rx="0.5" /> {/* Bottom */}
              </g>
            ))}

            {/* Main Body */}
            <rect x="0" y="0" width="50" height="50" rx="6" fill="#0f766e" fillOpacity="0.08" stroke="#0f766e" strokeWidth="1" strokeOpacity="0.5" />
            <rect x="6" y="6" width="38" height="38" rx="4" fill="#0f766e" fillOpacity="0.05" stroke="#0f766e" strokeWidth="0.5" strokeOpacity="0.3" />

            {/* Circuitry details */}
            {[16, 25, 34].map(v => <line key={v} x1={v} y1="6" x2={v} y2="44" stroke="#0f766e" strokeWidth="0.3" strokeOpacity="0.2" />)}
            {[16, 25, 34].map(h => <line key={h} x1="6" y1={h} x2="44" y2={h} stroke="#0f766e" strokeWidth="0.3" strokeOpacity="0.2" />)}

            {/* AI Text and Core */}
            <circle cx="25" cy="25" r="8" fill="#0f766e" fillOpacity="0.1" style={{ animation: "feat-pulse 2s ease-in-out infinite" }} />
            <text x="25" y="30" textAnchor="middle" fontSize="11" fontWeight="900" fill="#0f766e" letterSpacing="0.05em">AI</text>
          </g>
        </g>

        {/* Skills */}
        <text x="240" y="42" fontSize="5.5" fontWeight="900" fill="#0f766e" fillOpacity="0.6">SKILLS</text>
        {[
          { y: 56, label: "WIRING" },
          { y: 72, label: "SAFETY" },
          { y: 88, label: "QUALITY" },
        ].map(({ y, label }, i) => (
          <g key={i}>
            <rect x="240" y={y - 5} width="60" height="13" rx="6.5" fill="#0f766e" fillOpacity="0.1" stroke="#0f766e" strokeWidth="0.6" />
            <text x="270" y={y + 4} textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#0f766e" letterSpacing="0.05em">{label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
