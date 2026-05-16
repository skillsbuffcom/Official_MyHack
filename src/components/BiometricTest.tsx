"use client";

import { useEffect, useRef } from "react";

export function BiometricIllustration() {
  const beamRef = useRef<SVGLineElement>(null);
  const glowRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    let y = 30;
    let dir = 1;
    let raf: number;

    const animate = () => {
      y += dir * 0.7;
      if (y >= 110) dir = -1;
      if (y <= 30) dir = 1;
      
      if (beamRef.current) {
        beamRef.current.setAttribute("y1", String(y));
        beamRef.current.setAttribute("y2", String(y));
      }
      if (glowRef.current) {
        glowRef.current.setAttribute("y", String(y - 15));
      }
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden text-foreground">
      {/* Shifted left by using a specific offset in the group transform or x coordinates */}
      <svg viewBox="0 0 240 140" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
        <defs>
          <linearGradient id="bio-scan-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0" />
            <stop offset="50%" stopColor="#0f766e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
          </linearGradient>
          <clipPath id="face-clip">
            <path d="M120,30 C100,30 85,45 85,70 C85,95 100,110 120,110 C140,110 155,95 155,70 C155,45 140,30 120,30 Z M120,40 C135,40 145,55 145,70 C145,85 135,100 120,100 C105,100 95,85 95,70 C95,55 105,40 120,40 Z" />
          </clipPath>
        </defs>

        {/* Centered at x=80 instead of 120 to shift it 'slightly more to the left' */}
        <g transform="translate(-30, 0)">
          {/* Outer Scanner Frame */}
          <g style={{ animation: "feat-fade-up 0.5s ease-out both" }}>
            <circle cx="110" cy="70" r="50" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.1" />
            <circle cx="110" cy="70" r="45" fill="none" stroke="#0f766e" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 6">
              <animate attributeName="stroke-dashoffset" from="0" to="100" dur="20s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Biometric Face Silhouette */}
          <g style={{ animation: "feat-fade-up 0.5s 0.2s ease-out both" }}>
            <path d="M110,40 C95,40 85,55 85,70 C85,85 95,100 110,100 C125,100 135,85 135,70 C135,55 125,40 110,40 Z" 
                  fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
            
            {/* Eye points */}
            <circle cx="100" cy="65" r="1.5" fill="#0f766e" fillOpacity="0.6" />
            <circle cx="120" cy="65" r="1.5" fill="#0f766e" fillOpacity="0.6" />
            
            {/* Nose and Mouth hints */}
            <path d="M110 75 V82 M102 90 Q110 95 118 90" fill="none" stroke="#0f766e" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round" />
          </g>

          {/* Scan Beam */}
          <g>
            <rect ref={glowRef} x="70" y="30" width="80" height="30" fill="url(#bio-scan-grad)" />
            <line ref={beamRef} x1="70" y1="45" x2="150" y2="45" stroke="#0f766e" strokeWidth="1.5" strokeOpacity="0.8" strokeLinecap="round" />
          </g>

          {/* Indicators */}
          <g transform="translate(170, 50)" style={{ animation: "feat-fade-up 0.5s 0.4s ease-out both" }}>
            <text x="0" y="0" fontSize="6" fontWeight="900" fill="#0f766e" letterSpacing="0.1em">IDENTITY</text>
            <text x="0" y="8" fontSize="6" fontWeight="900" fill="#0f766e" letterSpacing="0.1em">VERIFIED</text>
            <rect x="0" y="14" width="30" height="1.5" fill="#0f766e" fillOpacity="0.2" />
          </g>
        </g>
      </svg>
    </div>
  );
}
