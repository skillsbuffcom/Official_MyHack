import { GridBg } from "./feature-illustrations";

export function HashIllustration() {
  const HASH = "a3f9c2e71b084d56";
  const HASH2 = "9e2a7f14c3b08d45";

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden text-foreground">
      <GridBg />
      <svg viewBox="0 0 240 140" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
        <defs>
          <linearGradient id="cert-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
          <radialGradient id="seal-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Certificate Card */}
        <g style={{ animation: "feat-fade-up 0.5s ease-out both" }}>
          <rect x="40" y="20" width="160" height="100" rx="12" fill="url(#cert-grad)" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
          
          {/* Top Bar */}
          <rect x="40" y="20" width="160" height="20" rx="12" fill="currentColor" fillOpacity="0.03" />
          <circle cx="55" cy="30" r="3" fill="#0f766e" fillOpacity="0.4" />
          <text x="65" y="31" fontSize="6" fontWeight="800" fill="currentColor" fillOpacity="0.3" letterSpacing="0.1em">AUTHENTICITY CERTIFICATE</text>
        </g>

        {/* Content Lines */}
        <g transform="translate(55, 55)">
          <g style={{ animation: "feat-fade-up 0.5s 0.2s ease-out both" }}>
            <rect x="0" y="0" width="80" height="8" rx="4" fill="currentColor" fillOpacity="0.1" />
            <rect x="0" y="14" width="50" height="5" rx="2.5" fill="currentColor" fillOpacity="0.05" />
          </g>
        </g>

        {/* Hash Block (Console style) */}
        <g transform="translate(55, 85)">
          <g style={{ animation: "feat-fade-up 0.5s 0.3s ease-out both" }}>
            <rect x="0" y="0" width="90" height="25" rx="6" fill="#0f766e" fillOpacity="0.04" stroke="#0f766e" strokeWidth="0.5" strokeOpacity="0.2" />
            <text x="8" y="10" fontSize="5" fontFamily="monospace" fill="#0f766e" fillOpacity="0.5">SHA-256:</text>
            <text x="8" y="18" fontSize="5.5" fontFamily="monospace" fill="#0f766e" fontWeight="700">{HASH}</text>
            
            {/* Moving scan line */}
            <rect x="0" y="0" width="2" height="25" fill="#0f766e" fillOpacity="0.2">
              <animate attributeName="x" values="0;90;0" dur="4s" repeatCount="indefinite" />
            </rect>
          </g>
        </g>

        {/* The Seal / Lock Badge */}
        <g transform="translate(160, 50)">
          <g style={{ animation: "feat-fade-up 0.5s 0.4s ease-out both" }}>
            <circle cx="20" cy="20" r="25" fill="url(#seal-glow)" style={{ animation: "feat-pulse 2s ease-in-out infinite" }} />
            
            {/* Shield shape */}
            <path d="M10 10 L30 14 L30 26 C30 32 20 38 20 38 C20 38 10 32 10 26 Z" fill="#0f766e" fillOpacity="0.1" stroke="#0f766e" strokeWidth="1.5" strokeOpacity="0.6" />
            <text x="20" y="27" textAnchor="middle" fontSize="12" fill="#0f766e" fontWeight="900">✓</text>
            
            {/* Lock on top-right of shield */}
            <g transform="translate(22, 5)">
              <path d="M4 6 V4 C4 2 5.5 1 7.5 1 C9.5 1 11 2 11 4 V6" fill="none" stroke="#0f766e" strokeWidth="1.2" strokeLinecap="round" />
              <rect x="2" y="6" width="11" height="9" rx="2" fill="#0f766e" />
            </g>
          </g>
        </g>

        {/* Footer label */}
        <g transform="translate(120, 128)">
          <g style={{ animation: "feat-fade-up 0.5s 0.5s ease-out both" }}>
            <text x="0" y="0" textAnchor="middle" fontSize="6" fontWeight="900" fill="#0f766e" letterSpacing="0.2em">TAMPER-PROOF VERIFICATION</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
