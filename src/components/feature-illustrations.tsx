"use client";

import { useEffect, useRef } from "react";

/* ─── shared grid background ─────────────────────────────── */
function GridBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="feat-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.08" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#feat-grid)" />
    </svg>
  );
}

/* ─── Card 1: Biometric Lock ──────────────────────────────── */
export function BiometricIllustration() {
  const lineRef = useRef<SVGLineElement>(null);
  const glowRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    const line = lineRef.current;
    const glow = glowRef.current;
    if (!line || !glow) return;
    let dir = 1;
    let y = 32;
    let raf: number;
    const tick = () => {
      y += dir * 0.6;
      if (y >= 118) dir = -1;
      if (y <= 32) dir = 1;
      line.setAttribute("y1", String(y));
      line.setAttribute("y2", String(y));
      glow.setAttribute("y", String(y - 16));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden text-foreground">
      <GridBg />
      <svg viewBox="0 0 160 160" width="160" height="160" className="relative z-10">
        <defs>
          <linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0" />
            <stop offset="50%" stopColor="#0f766e" stopOpacity="1" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
          </linearGradient>
          <clipPath id="palm-clip">
            <path d="M85,130 C75,130 65,120 65,105 C65,95 55,90 55,80 C55,70 65,65 75,75 L80,85 V50 C80,42 90,42 90,50 V85 H95 V45 C95,37 105,37 105,45 V85 H110 V50 C110,42 120,42 120,50 V90 H125 V65 C125,57 135,57 135,65 V110 C135,122 125,130 110,130 H85 Z" />
          </clipPath>
        </defs>

        {/* Scanner frame */}
        <circle cx="96" cy="82" r="52" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.14" />
        <circle
          cx="96"
          cy="82"
          r="44"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
          strokeDasharray="3 4"
          strokeOpacity="0.28"
          style={{ animation: "spin 14s linear infinite", transformOrigin: "96px 82px" }}
        />

        {/* Corner brackets */}
        {[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy], i) => {
          const cx = 96 + sx * 50, cy = 82 + sy * 50;
          return (
            <g key={i} stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" fill="none">
              <path d={`M ${cx} ${cy + sy*-8} L ${cx} ${cy} L ${cx + sx*-8} ${cy}`} />
            </g>
          );
        })}

        {/* Palm silhouette */}
        <path
          d="M85,130 C75,130 65,120 65,105 C65,95 55,90 55,80 C55,70 65,65 75,75 L80,85 V50 C80,42 90,42 90,50 V85 H95 V45 C95,37 105,37 105,45 V85 H110 V50 C110,42 120,42 120,50 V90 H125 V65 C125,57 135,57 135,65 V110 C135,122 125,130 110,130 H85 Z"
          fill="currentColor"
          fillOpacity="0.035"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.22"
        />

        {/* Palm scan lines */}
        <g stroke="#0f766e" fill="none" strokeLinecap="round" strokeOpacity="0.48">
          <path d="M85 55 V115" strokeWidth="1.2" />
          <path d="M100 50 V115" strokeWidth="1.2" />
          <path d="M115 55 V115" strokeWidth="1.2" />
          <path d="M78 100 C86 94 95 91 104 91 C114 91 122 94 131 101" strokeWidth="1.1" />
          <path d="M76 110 C86 104 96 101 107 101 C118 101 128 105 137 113" strokeWidth="1.1" />
          <path d="M80 121 C91 117 103 115 115 116 C124 117 132 119 138 123" strokeWidth="1.1" />
        </g>

        {/* Scanner HUD */}
        <g fill="none" stroke="#0f766e" strokeOpacity="0.45">
          <path d="M41 62 H55" strokeWidth="1.1" />
          <path d="M41 68 H51" strokeWidth="1.1" />
          <path d="M136 35 H148" strokeWidth="1.1" />
          <path d="M140 41 H148" strokeWidth="1.1" />
          <circle cx="49" cy="101" r="9" strokeWidth="0.8" strokeOpacity="0.28" />
          <circle cx="49" cy="101" r="3" strokeWidth="1.1" />
        </g>

        {/* Scan beam */}
        <g clipPath="url(#palm-clip)">
          <rect ref={glowRef} x="56" y="16" width="88" height="32" fill="url(#scan-grad)" opacity="0.18" />
          <line ref={lineRef} x1="56" y1="32" x2="144" y2="32" stroke="#0f766e" strokeWidth="1.4" strokeOpacity="0.82" />
        </g>

        {/* Signal dots */}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={48 + i * 8}
            cy="36"
            r="2"
            fill="#0f766e"
            fillOpacity={0.25 + i * 0.18}
            style={{ animation: `feat-pulse 1.8s ${i * 0.2}s ease-in-out infinite` }}
          />
        ))}

        {/* Confirmed badge */}
        <g style={{ animation: "feat-fade-up 1.2s 0.8s ease-out both" }}>
          <rect x="68" y="136" width="56" height="16" rx="8" fill="#0f766e" fillOpacity="0.1" stroke="#0f766e" strokeWidth="0.75" strokeOpacity="0.4" />
          <text x="96" y="144" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="700" fill="#0f766e" letterSpacing="0.05em" fontFamily="monospace">CONFIRMED</text>
        </g>
      </svg>
    </div>
  );
}

/* ─── Card 2: AI Assessment ───────────────────────────────── */
export function AIIllustration() {
  // wire y positions that connect left text → chip pins → right badges
  const wires = [
    { y: 58, color: "#0f766e", dur: "1.4s", begin: "0s"   },
    { y: 70, color: "#0891b2", dur: "1.8s", begin: "0.3s" },
    { y: 82, color: "#6366f1", dur: "1.2s", begin: "0.6s" },
  ];
  const chipX = 125;
  const chipY = 45;
  const chipCenter = chipX + 25;
  const leftWireStart = 84;
  const leftWireEnd = chipX - 5;
  const rightWireStart = chipX + 55;
  const rightWireEnd = 226;

  return (
    <div className="relative w-full h-full overflow-hidden text-foreground">
      <GridBg />
      <svg viewBox="0 0 300 140" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
        <defs>
          {wires.map(({ color, dur, begin }, i) => (
            <linearGradient key={i} id={`volt-l${i}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="300" y2="0">
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

        {/* ── Left: Role Description ── */}
        <text x="12" y="32" fontSize="5.5" fontWeight="700" fill="currentColor" fillOpacity="0.3" letterSpacing="0.1em">ROLE DESCRIPTION</text>
        {[40, 50, 60, 70, 80, 90].map((y, i) => (
          <rect key={i} x="12" y={y} width={[66, 42, 60, 38, 54, 46][i]} height="4" rx="2"
            fill="currentColor" fillOpacity="0.12"
            style={{ animation: `feat-fade-up 0.35s ${i * 0.06}s ease-out both` }} />
        ))}

        {/* ── Voltage wires: left → chip left pins ── */}
        {wires.map(({ y, color }, i) => (
          <g key={i}>
            <line x1={leftWireStart} y1={y} x2={leftWireEnd} y2={y} stroke={color} strokeWidth="0.5" strokeOpacity="0.15" />
            <line x1={leftWireStart} y1={y} x2={leftWireEnd} y2={y} stroke={`url(#volt-l${i})`} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ))}

        {/* ── AI Chip — centered between input and output columns ── */}
        <g transform={`translate(${chipX}, ${chipY})`} style={{ animation: "feat-fade-up 0.5s 0.2s ease-out both" }}>
          <circle cx="25" cy="25" r="34" fill="#0f766e" fillOpacity="0.03" stroke="#0f766e" strokeWidth="0.6" strokeOpacity="0.14" />
          <rect x="0" y="0" width="50" height="50" rx="5"
            fill="#0f766e" fillOpacity="0.07" stroke="#0f766e" strokeWidth="0.8" strokeOpacity="0.55" />
          <rect x="7" y="7" width="36" height="36" rx="3"
            fill="#0f766e" fillOpacity="0.05" stroke="#0f766e" strokeWidth="0.5" strokeOpacity="0.4" />
          {[16, 25, 34].map(x => <line key={x} x1={x} y1="7" x2={x} y2="43" stroke="#0f766e" strokeWidth="0.4" strokeOpacity="0.25" />)}
          {[16, 25, 34].map(y => <line key={y} x1="7" y1={y} x2="43" y2={y} stroke="#0f766e" strokeWidth="0.4" strokeOpacity="0.25" />)}
          {/* left pins (outer edge x=−5, global x=120) */}
          {[10, 22, 34].map((py, j) => <rect key={j} x="-5" y={py} width="5" height="3" rx="0.5" fill="#0f766e" fillOpacity="0.35" />)}
          {/* right pins (outer edge x=55, global x=180) */}
          {[10, 22, 34].map((py, j) => <rect key={j} x="50" y={py} width="5" height="3" rx="0.5" fill="#0f766e" fillOpacity="0.35" />)}
          {[10, 22, 34].map((px, j) => <rect key={j} x={px} y="-5" width="3" height="5" rx="0.5" fill="#0f766e" fillOpacity="0.35" />)}
          {[10, 22, 34].map((px, j) => <rect key={j} x={px} y="50" width="3" height="5" rx="0.5" fill="#0f766e" fillOpacity="0.35" />)}
          <circle cx="25" cy="25" r="9" fill="#0f766e" fillOpacity="0.08" style={{ animation: "feat-pulse 2s ease-in-out infinite" }} />
          <text x="25" y="30" textAnchor="middle" fontSize="12" fontWeight="900" fill="#0f766e" fillOpacity="0.9" letterSpacing="0.04em">AI</text>
        </g>

        {/* ── Voltage wires: chip right pins → skills ── */}
        {wires.map(({ y, color }, i) => (
          <g key={i}>
            <line x1={rightWireStart} y1={y} x2={rightWireEnd} y2={y} stroke={color} strokeWidth="0.5" strokeOpacity="0.15" />
            <line x1={rightWireStart} y1={y} x2={rightWireEnd} y2={y} stroke={`url(#volt-l${i})`} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ))}

        <line x1={chipCenter} y1="22" x2={chipCenter} y2="118" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.08" strokeDasharray="2 4" />

        {/* ── Right: Skill badges ── */}
        <text x="228" y="32" fontSize="5.5" fontWeight="700" fill="currentColor" fillOpacity="0.3" letterSpacing="0.1em">SKILLS</text>
        {[
          { y: 46, label: "WIRING",  color: "#0f766e" },
          { y: 62, label: "SAFETY",  color: "#0891b2" },
          { y: 78, label: "QUALITY", color: "#6366f1" },
        ].map(({ y, label, color }, i) => (
          <g key={i} style={{ animation: `feat-fade-up 0.4s ${0.5 + i * 0.12}s ease-out both` }}>
            <rect x="228" y={y - 5} width="60" height="13" rx="6.5"
              fill={color} fillOpacity="0.07" stroke={color} strokeWidth="0.6" strokeOpacity="0.5" />
            <text x="258" y={y + 4} textAnchor="middle" fontSize="5.5" fontWeight="700" fill={color} letterSpacing="0.1em">{label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ─── Card 3: SHA-256 Seal ────────────────────────────────── */
export function HashIllustration() {
  const HASH = "a3f9c2e71b084d56";
  const HASH2 = "9e2a7f14c3b08d45";

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden text-foreground">
      <GridBg />
      <svg viewBox="0 0 200 140" width="200" height="140" className="relative z-10">
        {/* Certificate card outline */}
        <rect x="30" y="20" width="140" height="100" rx="8" fill="none"
          stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.15" />

        {/* Top bar */}
        <rect x="30" y="20" width="140" height="16" rx="8" fill="currentColor" fillOpacity="0.04" />
        <rect x="35" y="25" width="32" height="5" rx="2.5" fill="currentColor" fillOpacity="0.15" />
        <circle cx="158" cy="27.5" r="3" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />

        {/* Name line */}
        <rect x="40" y="48" width="80" height="7" rx="3.5" fill="currentColor" fillOpacity="0.12"
          style={{ animation: "feat-fade-up 0.4s 0.2s ease-out both" }} />
        <rect x="40" y="60" width="55" height="4" rx="2" fill="currentColor" fillOpacity="0.07"
          style={{ animation: "feat-fade-up 0.4s 0.3s ease-out both" }} />

        {/* Hash lines */}
        <text x="40" y="82" fontSize="5.5" fontFamily="monospace" fill="currentColor" fillOpacity="0.25"
          style={{ animation: "feat-fade-up 0.4s 0.5s ease-out both" }}>
          SHA256:
        </text>
        <text x="40" y="90" fontSize="5" fontFamily="monospace" fill="#0f766e" fillOpacity="0.7"
          style={{ animation: "feat-fade-up 0.4s 0.6s ease-out both" }}>
          {HASH}
        </text>
        <text x="40" y="98" fontSize="5" fontFamily="monospace" fill="#0f766e" fillOpacity="0.5"
          style={{ animation: "feat-fade-up 0.4s 0.7s ease-out both" }}>
          {HASH2}
        </text>

        {/* Shield badge */}
        <g transform="translate(148, 52)" style={{ animation: "feat-fade-up 0.5s 0.9s ease-out both" }}>
          <path d="M11 0 L22 4 L22 12 C22 18 11 24 11 24 C11 24 0 18 0 12 L0 4 Z"
            fill="#0f766e" fillOpacity="0.12" stroke="#0f766e" strokeWidth="0.8" strokeOpacity="0.5" />
          <text x="11" y="15" textAnchor="middle" fontSize="9" fill="#0f766e" fillOpacity="0.8">✓</text>
        </g>
      </svg>
    </div>
  );
}

/* ─── Card 4: 30-Second Employer Read ────────────────────── */
export function EmployerReadIllustration() {
  const bars = [
    { label: "TECHNICAL", pct: 82, color: "#0f766e", delay: 0.3 },
    { label: "SAFETY",    pct: 91, color: "#0891b2", delay: 0.5 },
    { label: "QUALITY",   pct: 74, color: "#6366f1", delay: 0.7 },
  ];
  const BAR_W = 100;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden text-foreground">
      <GridBg />
      <svg viewBox="0 0 220 140" width="220" height="140" className="relative z-10">
        {/* Grade badge */}
        <g style={{ animation: "feat-fade-up 0.5s 0.1s ease-out both" }}>
          <rect x="12" y="44" width="52" height="60" rx="8"
            fill="none" stroke="#0d9488" strokeWidth="1" strokeOpacity="0.4" />
          <text x="38" y="82" textAnchor="middle" fontSize="32" fontWeight="900"
            fill="#0d9488" fillOpacity="0.85" fontFamily="system-ui">B</text>
          <text x="38" y="96" textAnchor="middle" fontSize="6" fontWeight="700"
            fill="currentColor" fillOpacity="0.3" letterSpacing="0.12em">GRADE</text>
        </g>

        {/* Hire signal */}
        <g style={{ animation: "feat-fade-up 0.4s 0.25s ease-out both" }}>
          <rect x="12" y="112" width="52" height="12" rx="6"
            fill="#0f766e" fillOpacity="0.08" stroke="#0f766e" strokeWidth="0.6" strokeOpacity="0.4" />
          <text x="38" y="120.5" textAnchor="middle" fontSize="5.5" fontWeight="700"
            fill="#0f766e" letterSpacing="0.08em">STRONG HIRE</text>
        </g>

        {/* Score bars */}
        <g transform="translate(80, 44)">
          {bars.map(({ label, pct, color, delay }, i) => (
            <g key={i} transform={`translate(0, ${i * 28})`}
              style={{ animation: `feat-fade-up 0.4s ${delay}s ease-out both` }}>
              <text x="0" y="8" fontSize="5.5" fontWeight="700" fill="currentColor"
                fillOpacity="0.3" letterSpacing="0.1em">{label}</text>
              <rect x="0" y="13" width={BAR_W} height="5" rx="2.5" fill="currentColor" fillOpacity="0.06" />
              <rect x="0" y="13" width={BAR_W * pct / 100} height="5" rx="2.5" fill={color} fillOpacity="0.6"
                style={{
                  transformOrigin: "0 15px",
                  animation: `feat-bar-fill 1s ${delay + 0.1}s cubic-bezier(0.4,0,0.2,1) both`,
                }} />
              <text x={BAR_W + 4} y="18.5" fontSize="6" fontWeight="700"
                fill={color} fillOpacity="0.7">{pct}</text>
            </g>
          ))}
        </g>

        {/* Timer */}
        <g style={{ animation: "feat-fade-up 0.4s 1s ease-out both" }}>
          <text x="80" y="120" fontSize="6" fontWeight="700" fill="currentColor"
            fillOpacity="0.2" letterSpacing="0.1em">READ IN 0:30</text>
        </g>
      </svg>
    </div>
  );
}
