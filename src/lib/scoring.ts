export function frameSafetyScore(level: string): number {
  if (level === "SAFE") return 100;
  if (level === "CAUTION") return 60;
  if (level === "UNSAFE") return 0;
  return 60; // UNASSESSABLE → CAUTION
}

export function frameQualityScore(rating: string | null | undefined): number {
  if (rating === "GOOD") return 100;
  if (rating === "ACCEPTABLE") return 70;
  if (rating === "POOR") return 30;
  return 70;
}

export function computeComposite(
  T: number,
  actionEvents: Record<string, unknown>[]
): { S: number; Q: number; composite: number; safetyCapped: boolean } {
  const MIN_FRAMES = 3;

  const safetyScores = actionEvents
    .filter((e) => (e.safetyAssessment as Record<string, unknown>)?.level)
    .map((e) => frameSafetyScore((e.safetyAssessment as Record<string, unknown>).level as string));

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
  let safetyWeight = 0.3;
  let techWeight = 0.5;

  if (safetyScores.length < MIN_FRAMES) {
    S = 0;
    safetyWeight = 0;
    techWeight = 0.8;
  } else {
    const rawSafety =
      safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length;
    S = Math.min(100, Math.max(0, rawSafety + ppeBonus));
  }

  const Q =
    qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 70;

  const composite = T * techWeight + S * safetyWeight + Q * 0.2;
  const safetyCapped = safetyScores.length >= MIN_FRAMES && S < 50;

  return { S, Q, composite, safetyCapped };
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
