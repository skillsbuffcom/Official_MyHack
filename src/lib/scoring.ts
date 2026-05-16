/**
 * VeriPro Deterministic Scoring Engine
 * Implements PRD Section 6: (T * 0.5) + (S * 0.3) + (Q * 0.2)
 */

export interface ScoringInput {
  technicalScore: number; // T: From Gemini criteria
  safetyLevelCounts: { SAFE: number; CAUTION: number; UNSAFE: number; UNASSESSABLE: number };
  qualityRatingCounts: { GOOD: number; ACCEPTABLE: number; POOR: number; unclear: number };
}

export interface ScoringResult {
  compositeScore: number;
  technicalScore: number;
  safetyScore: number;
  workQualityScore: number;
  grade: string;
  hireSignal: string;
  safetyCapped: boolean;
}

export function frameSafetyScore(level: string): number {
  if (level === "SAFE") return 100;
  if (level === "CAUTION") return 40;   // tightened — minor hazard still meaningfully penalised
  if (level === "UNSAFE") return 10;    // significant hazard
  if (level === "CRITICAL") return 0;   // critical — frame contributes nothing + extra penalty applied separately
  return 45; // UNASSESSABLE
}

export function frameQualityScore(rating: string): number {
  if (rating === "GOOD") return 100;
  if (rating === "ACCEPTABLE") return 70;
  if (rating === "POOR") return 30;
  return 70; // unclear
}

// Employer score: derived from Gemini verdict + how many qualifying actions were observed
export function computeEmployerScore(verdict: string, totalQualifyingActions: number): number {
  if (verdict === "INCONSISTENT") return 20;
  if (verdict === "PARTIAL") return Math.min(70, 50 + totalQualifyingActions * 3);
  // CONFIRMED — scale with depth of evidence
  if (totalQualifyingActions >= 8) return 95;
  if (totalQualifyingActions >= 5) return 87;
  return 78;
}

// Ecosystem score: derived from AI-assessed readiness level
export function computeEcosystemScore(ecosystemReadiness: string | null): number {
  if (ecosystemReadiness === "READY_FOR_EMPLOYMENT") return 95;
  if (ecosystemReadiness === "READY_FOR_PROGRAMME") return 75;
  if (ecosystemReadiness === "NEEDS_MENTORING") return 50;
  if (ecosystemReadiness === "NOT_READY") return 20;
  return 60;
}

export function computeComposite(
  T: number,
  actionEvents: Record<string, unknown>[],
  criteriaPassRate: number,
  verdict: string,
  totalQualifyingActions: number,
  ecosystemReadiness: string | null,
  keyActions: Array<{ score?: number; significance?: string }>
): { S: number; Q: number; E: number; Eco: number; T_adj: number; composite: number; safetyCapped: boolean; criticalViolationCount: number; liveWireContactDetected: boolean } {
  const MIN_FRAMES = 3;

  const safetyEvents = actionEvents.filter(
    (e) => (e.safetyAssessment as Record<string, unknown>)?.level
  );
  const safetyScores = safetyEvents.map((e) =>
    frameSafetyScore((e.safetyAssessment as Record<string, unknown>).level as string)
  );

  // Identify critical violations for hard penalties
  const criticalViolationCount = safetyEvents.filter(
    (e) => (e.safetyAssessment as Record<string, unknown>).level === "CRITICAL"
  ).length;
  const liveWireContactDetected = safetyEvents.some(
    (e) => (e.safetyAssessment as Record<string, unknown>).violation_type === "LIVE_WIRE_CONTACT"
  );

  const qualityScores = actionEvents
    .filter((e) => (e.workQuality as Record<string, unknown>)?.rating)
    .map((e) => frameQualityScore((e.workQuality as Record<string, unknown>).rating as string));

  const ppeFrames = actionEvents.filter(
    (e) => (e.ppeCheck as Record<string, unknown>)?.gloves_worn !== undefined
  );
  const ppeRate =
    ppeFrames.length > 0
      ? ppeFrames.filter((e) => (e.ppeCheck as Record<string, unknown>).gloves_worn === true).length /
        ppeFrames.length
      : 1.0;

  const ppeBonus =
    ppeRate === 1.0 ? 10 : ppeRate >= 0.8 ? 0 : ppeRate >= 0.5 ? -10 : -25;

  let S: number;
  let safetyWeight = 0.25;

  if (safetyScores.length < MIN_FRAMES) {
    S = 0;
    safetyWeight = 0;
  } else {
    const rawSafety = safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length;
    // Each CRITICAL event deducts 30 on top of its already-zero frame score
    const criticalPenalty = criticalViolationCount * 30;
    const afterPenalty = Math.max(0, rawSafety + ppeBonus - criticalPenalty);
    // Live wire contact hard-caps safety at 20 — no partial credit possible
    S = liveWireContactDetected ? Math.min(afterPenalty, 20) : afterPenalty;
  }

  const Q =
    qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 70;

  // Key action average — scored actions from Gemini (HIGH/MEDIUM/LOW + 0-100)
  const scoredActions = keyActions.filter((a) => typeof a.score === "number");
  const keyActionAvg =
    scoredActions.length > 0
      ? scoredActions.reduce((sum, a) => sum + (a.score ?? 0), 0) / scoredActions.length
      : 70;

  // Technical: criteria avg (55%) + pass rate checkboxes (25%) + key action quality (20%)
  const T_adj = Math.min(100, T * 0.55 + criteriaPassRate * 100 * 0.25 + keyActionAvg * 0.20);

  const E = computeEmployerScore(verdict, totalQualifyingActions);
  const Eco = computeEcosystemScore(ecosystemReadiness);

  // Weights: Technical 45%, Employer 20%, Safety 25%, Ecosystem 10%
  const techWeight = safetyWeight === 0 ? 0.70 : 0.45;
  const employerWeight = 0.20;
  const ecoWeight = 0.10;

  const composite =
    T_adj * techWeight +
    E * employerWeight +
    S * safetyWeight +
    Eco * ecoWeight;

  // Any CRITICAL violation automatically triggers the grade cap (D), regardless of S value
  const safetyCapped =
    safetyScores.length >= MIN_FRAMES && (S < 50 || criticalViolationCount > 0);

  return { S, Q, E, Eco, T_adj, composite, safetyCapped, criticalViolationCount, liveWireContactDetected };
}

export function computeGrade(composite: number, safetyCapped: boolean): string {
  if (safetyCapped) return "D";
  if (composite >= 90) return "A";
  if (composite >= 75) return "B";
  if (composite >= 60) return "C";
  if (composite >= 50) return "D";
  return "F";
}

export function computeHireSignal(
  verdict: string,
  composite: number,
  safetyCapped: boolean
): string {
  if (verdict === "INCONSISTENT" || safetyCapped) return "Not Recommended";
  if (verdict === "PARTIAL")
    return composite >= 75 ? "Hire" : "Needs Development";
  if (composite >= 90) return "Strong Hire";
  if (composite >= 60) return "Hire";
  if (composite >= 50) return "Needs Development";
  return "Not Recommended";
}
