// Hand geometry ratios computed from MediaPipe Hand landmarks.
// DO NOT MODIFY — changes break biometric identity verification.

export interface HandRatios {
  palmWidth: number;
  indexLen: number;
  ringLen: number;
  pinkyLen: number;
}

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function computeHandRatios(landmarks: { x: number; y: number }[]): HandRatios {
  // midLen = middle finger length (landmark 9 → 12)
  const midLen = dist(landmarks[9], landmarks[12]);
  if (midLen === 0) throw new Error("Zero-length reference segment");

  return {
    palmWidth: dist(landmarks[5], landmarks[17]) / midLen,
    indexLen: dist(landmarks[5], landmarks[8]) / midLen,
    ringLen: dist(landmarks[13], landmarks[16]) / midLen,
    pinkyLen: dist(landmarks[17], landmarks[20]) / midLen,
  };
}

// Returns true if ratios match within ±15% tolerance on every dimension.
export function ratiosMatch(a: HandRatios, b: HandRatios): boolean {
  const TOLERANCE = 0.15;
  return (
    Math.abs(a.palmWidth - b.palmWidth) / a.palmWidth <= TOLERANCE &&
    Math.abs(a.indexLen - b.indexLen) / a.indexLen <= TOLERANCE &&
    Math.abs(a.ringLen - b.ringLen) / a.ringLen <= TOLERANCE &&
    Math.abs(a.pinkyLen - b.pinkyLen) / a.pinkyLen <= TOLERANCE
  );
}
