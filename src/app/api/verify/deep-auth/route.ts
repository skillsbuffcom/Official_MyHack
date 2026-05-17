import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type NailLength = "very_short" | "short" | "medium" | "long" | "very_long";

type RegisteredMarker = {
  type?: string;
  hand?: string;
  location?: string;
  description?: string;
  confidence?: number;
};

type MarkerAudit = RegisteredMarker & {
  area_visible: boolean;
  confirmed: boolean;
  confidence: number;
  exact_visual_match?: boolean;
  notes: string;
};

type DeepAuthResponse = {
  hand_visibility?: {
    hands_visible?: "none" | "one" | "both";
    palm_or_back?: string;
    confidence?: number;
  };
  same_hand_structure?: {
    verdict?: "same" | "different" | "uncertain";
    confidence?: number;
    differences?: string[];
  };
  nail_length?: NailLength;
  nail_comparison?: {
    verdict?: "same" | "different" | "uncertain";
    confidence?: number;
    registered?: NailLength;
    observed?: NailLength;
    notes?: string;
  };
  marker_audit?: MarkerAudit[];
  accessories?: {
    registered?: string;
    observed?: string;
    changed?: boolean;
  };
  identity_verdict?: {
    verdict?: "same" | "different" | "uncertain";
    confidence?: number;
    reason?: string;
  };
  summary?: string;
};

type IndependentMarkerCheck = {
  visible_markers?: {
    type?: string;
    hand?: string;
    location?: string;
    description?: string;
    confidence?: number;
  }[];
};

type MarkerDecision = {
  type?: string;
  location?: string;
  status: "confirmed" | "missing" | "uncertain";
  comparisonConfirmed: boolean;
  independentConfirmed: boolean;
  confidence: number;
};

async function callGeminiWithRetry(
  model: ReturnType<typeof genAI.getGenerativeModel>,
  parts: Parameters<typeof model.generateContent>[0],
  maxRetries = 1,
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(parts);
    } catch (error) {
      const msg = String(error);
      const isRetryable = msg.includes("503") || msg.includes("overloaded") || msg.includes("high demand") || msg.includes("429");
      if (isRetryable && attempt < maxRetries) { await sleep(500); continue; }
      throw error;
    }
  }
  throw new Error("Unreachable");
}

const NAIL_SCALE: Record<NailLength, number> = {
  very_short: 0,
  short: 1,
  medium: 2,
  long: 3,
  very_long: 4,
};

const NAIL_VALUES = Object.keys(NAIL_SCALE) as NailLength[];

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseProfile(masterProfile: unknown) {
  if (!masterProfile) return null;
  try {
    return typeof masterProfile === "string" ? JSON.parse(masterProfile) : masterProfile;
  } catch {
    return null;
  }
}

function normalizeNail(value: unknown): NailLength | null {
  const normalized = String(value ?? "").toLowerCase().trim().replace(/\s+/g, "_");
  return NAIL_VALUES.includes(normalized as NailLength) ? normalized as NailLength : null;
}

function getRegisteredMarkers(profile: any): RegisteredMarker[] {
  const markers = Array.isArray(profile?.physical_markers) ? profile.physical_markers : [];
  const legacy = profile?.physical_marker?.present ? [profile.physical_marker] : [];
  return [...markers, ...legacy].filter((marker) => {
    const confidence = Number(marker?.confidence ?? 1);
    const type = String(marker?.type ?? "").toLowerCase();
    const location = String(marker?.location ?? "").toLowerCase();
    const threshold = ["mole", "scar", "birthmark", "tattoo"].includes(type) ? 0.68 : 0.8;
    return confidence >= threshold && type && location && type !== "none" && location !== "none";
  }).slice(0, 1);
}

function nailDiff(a: NailLength | null, b: NailLength | null) {
  if (!a || !b) return 0;
  return Math.abs(NAIL_SCALE[a] - NAIL_SCALE[b]);
}

function hasIndependentMarkerMatch(marker: RegisteredMarker, observedMarkers: NonNullable<IndependentMarkerCheck["visible_markers"]>) {
  const markerType = String(marker.type ?? "").toLowerCase();
  const markerLocation = String(marker.location ?? "").toLowerCase();
  // Only filter directional/relative words — keep anatomical words (hand, finger, knuckle, back, palm, etc.)
  const weakLocationWords = new Set(["left", "right", "approximately", "midway", "between", "first", "second"]);
  const markerWords = markerLocation
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 4 && !weakLocationWords.has(word));
  const compatibleTypes = markerType === "mole" ? ["mole", "freckle"] : [markerType];

  return observedMarkers.some((observed) => {
    const observedType = String(observed.type ?? "").toLowerCase();
    const observedLocation = String(observed.location ?? "").toLowerCase();
    const observedDescription = String(observed.description ?? "").toLowerCase();
    const confidence = Number(observed.confidence ?? 0);
    const typeMatches = compatibleTypes.some(type => observedType === type || observedType.includes(type));
    if (!typeMatches || confidence < 0.72) return false;
    // No specific location words: require very high confidence to pass without location
    if (markerWords.length === 0) return confidence >= 0.88;
    // Has specific location words: require a word match at the location
    return markerWords.some(word => observedLocation.includes(word) || observedDescription.includes(word));
  });
}

export async function POST(req: Request) {
  try {
    const { currentImage, masterImage, masterProfile, currentColorImage, masterColorImage, currentHandCrops } = await req.json();
    if (!currentImage) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const profile = parseProfile(masterProfile) as any;
    const regNail = normalizeNail(profile?.nail_length);
    const regMarkers = getRegisteredMarkers(profile);

    console.log("DEEP AUTH - regNail:", regNail, "| regMarkers:", regMarkers.length);

    if (masterImage) {
      const markerText = regMarkers.length
        ? regMarkers.map((m, i) => `${i}. ${m.type ?? "mark"} on ${m.hand ?? "unknown hand"} at ${m.location ?? "unknown location"}; ${m.description ?? "no description"}`).join("\n")
        : "none";
      const currentCropParts = Array.isArray(currentHandCrops)
        ? currentHandCrops.slice(0, 2).flatMap((crop: string, index: number) => [
            { inlineData: { data: crop.split(",")[1], mimeType: "image/jpeg" } },
            { text: `IMAGE 2 ZOOMED HAND CROP ${index + 1} - inspect this crop closely for the registered mole/marker.` },
          ])
        : [];

      const prompt = `You are a strict but fair biometric hand verifier.

Compare IMAGE 1 (registered reference) and IMAGE 2 (current scan). The worker must show BOTH hands. Focus on:
- persistent skin markers such as moles, freckles, scars, birthmarks, tattoos, cuts, calluses
- nail length differences across multiple fingers
- overall hand structure differences such as finger width, finger proportions, nail bed shape, knuckles, wrist shape

Important security rule: if IMAGE 1 has a registered mole/marker, IMAGE 2 must show the same marker at the same location. Do not confirm a mark just because there is any dark spot, crease, shadow, glare, nail edge, knuckle fold, or compression artifact near that area. Confirm only when the mark in IMAGE 2 matches the registered marker's exact location, type, approximate size, shape, and color/tone. If the match is not visually exact, set confirmed=false and exact_visual_match=false. Use confidence >= 0.90 only for an unmistakable exact match; otherwise use confidence <= 0.60.

Registered nail length: ${regNail ?? "unknown"}
Registered markers:
${markerText}
If registered markers is "none", return an empty marker_audit array.

Respond ONLY with valid JSON matching this shape:
{
  "hand_visibility": {
    "hands_visible": "none|one|both",
    "palm_or_back": "short description of visible hand side/orientation",
    "confidence": 0.0
  },
  "same_hand_structure": {
    "verdict": "same|different|uncertain",
    "confidence": 0.0,
    "differences": ["specific visible structural differences, or empty"]
  },
  "nail_length": "very_short|short|medium|long|very_long",
  "nail_comparison": {
    "verdict": "same|different|uncertain",
    "confidence": 0.0,
    "registered": "${regNail ?? "very_short"}",
    "observed": "very_short|short|medium|long|very_long",
    "notes": "specific fingers compared"
  },
  "marker_audit": [
    {
      "type": "registered marker type",
      "hand": "left|right|unknown",
      "location": "registered marker location",
      "description": "registered marker description",
      "area_visible": true,
      "confirmed": true,
      "exact_visual_match": true,
      "confidence": 0.0,
      "notes": "state the exact size/shape/color/location evidence, or explain why it is likely a crease/shadow/artifact"
    }
  ],
  "accessories": {
    "registered": "rings/watches/bracelets in IMAGE 1 or none",
    "observed": "rings/watches/bracelets in IMAGE 2 or none",
    "changed": false
  },
  "identity_verdict": {
    "verdict": "same|different|uncertain",
    "confidence": 0.0,
    "reason": "strict same-person judgment based on markers, nails, and hand structure"
  },
  "summary": "one concise reason for the verdict"
}`;

      const parts = [
        { inlineData: { data: (masterColorImage ?? masterImage).split(",")[1], mimeType: "image/jpeg" } },
        { text: "IMAGE 1 - REGISTERED REFERENCE" },
        { inlineData: { data: (currentColorImage ?? currentImage).split(",")[1], mimeType: "image/jpeg" } },
        { text: "IMAGE 2 - CURRENT SCAN" },
        ...currentCropParts,
        { text: prompt },
      ] as Parameters<typeof model.generateContent>[0];

      const independentMarkersPromise = (async (): Promise<NonNullable<IndependentMarkerCheck["visible_markers"]>> => {
        if (regMarkers.length === 0) return [];

        const independentPrompt = `Look at this hand image by itself. You are NOT comparing to a reference.
List only clearly visible persistent physical markers on the hands, such as a real mole, freckle, scar, birthmark, tattoo, cut, or callus.
Do not infer or guess. Ignore pores, wrinkles, knuckle folds, shadows, glare, compression artifacts, and vague discoloration.
If no real marker is plainly visible, return an empty visible_markers array.
Respond ONLY with valid JSON:
{
  "visible_markers": [
    {
      "type": "mole|freckle|scar|birthmark|tattoo|cut|callus|other",
      "hand": "left|right|unknown",
      "location": "precise location",
      "description": "size, shape, and color/tone",
      "confidence": 0.0
    }
  ]
}`;

        try {
          const independentResult = await callGeminiWithRetry(model, [
            { inlineData: { data: (currentColorImage ?? currentImage).split(",")[1], mimeType: "image/jpeg" } },
            ...currentCropParts,
            independentPrompt,
          ] as Parameters<typeof model.generateContent>[0]);
          const independentText = independentResult.response.text().trim();
          const independentAudit = JSON.parse(cleanJson(independentText)) as IndependentMarkerCheck;
          return Array.isArray(independentAudit.visible_markers) ? independentAudit.visible_markers : [];
        } catch (error) {
          console.warn("Independent marker check failed:", error);
          return [];
        }
      })();

      const [result, independentMarkers] = await Promise.all([
        callGeminiWithRetry(model, parts),
        independentMarkersPromise,
      ]);
      const text = result.response.text().trim();
      console.log("RESPONSE:\n", text);
      console.log("INDEPENDENT MARKERS:", independentMarkers);

      let audit: DeepAuthResponse;
      try {
        audit = JSON.parse(cleanJson(text)) as DeepAuthResponse;
      } catch {
        return NextResponse.json({
          result: "ERROR",
          reason: "Biometric verifier returned invalid JSON.",
          flags: ["verifier_parse_error"],
          raw: text,
        });
      }

      const handsVisible = audit.hand_visibility?.hands_visible ?? "none";
      const handConfidence = Number(audit.hand_visibility?.confidence ?? 0);
      const observedNail = normalizeNail(audit.nail_comparison?.observed ?? audit.nail_length);
      const nailVerdict = audit.nail_comparison?.verdict ?? "uncertain";
      const nailConfidence = Number(audit.nail_comparison?.confidence ?? 0);
      const structureVerdict = audit.same_hand_structure?.verdict ?? "uncertain";
      const structureConfidence = Number(audit.same_hand_structure?.confidence ?? 0);
      const markerResults = Array.isArray(audit.marker_audit) ? audit.marker_audit : [];
      const identityVerdict = audit.identity_verdict?.verdict ?? "uncertain";
      const identityConfidence = Number(audit.identity_verdict?.confidence ?? 0);

      const flags: string[] = [];
      const warnings: string[] = [];

      if (handsVisible !== "both" || handConfidence < 0.55) {
        flags.push(`both_hands_not_visible: observed=${handsVisible}`);
      }

      if (regNail && observedNail) {
        const diff = nailDiff(regNail, observedNail);
        if (diff >= 1) {
          flags.push(`nail_length_mismatch: reg=${regNail}, obs=${observedNail}`);
        } else if (nailVerdict === "uncertain") {
          warnings.push(`nail_length_uncertain: reg=${regNail}, obs=${observedNail ?? "unknown"}`);
        }
      }

      if (structureVerdict === "different" && structureConfidence >= 0.55) {
        warnings.push(`hand_structure_mismatch: ${(audit.same_hand_structure?.differences ?? []).join("; ") || "visible structural differences"}`);
      }

      const markerDecisions: MarkerDecision[] = [];

      regMarkers.forEach((registeredMarker, index) => {
        const marker = markerResults[index];
        const independentMatch = hasIndependentMarkerMatch(registeredMarker, independentMarkers);
        if (!marker) {
          markerDecisions.push({
            type: registeredMarker.type,
            location: registeredMarker.location,
            status: independentMatch ? "confirmed" : "missing",
            comparisonConfirmed: false,
            independentConfirmed: independentMatch,
            confidence: 0,
          });
          if (!independentMatch) flags.push(`marker_missing: ${registeredMarker.type ?? "marker"} at ${registeredMarker.location ?? "unknown location"} (not audited)`);
          return;
        }
        const confidence = Number(marker.confidence ?? 0);
        const comparisonMatch = Boolean(marker.confirmed) && confidence >= 0.6;
        const markerPassed = comparisonMatch || independentMatch;
        markerDecisions.push({
          type: marker.type ?? registeredMarker.type,
          location: marker.location ?? registeredMarker.location,
          status: markerPassed ? "confirmed" : "missing",
          comparisonConfirmed: comparisonMatch,
          independentConfirmed: independentMatch,
          confidence,
        });

        if (!markerPassed) {
          flags.push(`marker_missing: ${marker.type ?? "marker"} at ${marker.location ?? "unknown location"}`);
          return;
        }
        if (!comparisonMatch || !independentMatch) {
          warnings.push(`marker_partially_confirmed: ${marker.type ?? "marker"} at ${marker.location ?? "unknown location"}`);
        }
      });

      // When no marker is registered, identity verdict is the only biometric discriminator
      if (regMarkers.length === 0) {
        if (identityVerdict === "different" && identityConfidence >= 0.55) {
          flags.push(`identity_verdict_different: ${audit.identity_verdict?.reason ?? "different hand appearance"}`);
        } else if (identityVerdict !== "same") {
          warnings.push(`no_marker_registered: identity verdict is ${identityVerdict} — register with a visible mole/scar for stronger verification`);
        }
      } else {
        if (identityVerdict === "different" && identityConfidence >= 0.65) {
          flags.push(`identity_verdict_different: ${audit.identity_verdict?.reason ?? "different hand appearance"}`);
        } else if (identityVerdict === "different" && identityConfidence >= 0.50) {
          warnings.push(`identity_verdict_different: ${audit.identity_verdict?.reason ?? "different hand appearance"}`);
        }
      }

      if (audit.accessories?.changed) {
        flags.push(`accessories_changed: reg=${audit.accessories.registered ?? "none"}, obs=${audit.accessories.observed ?? "none"}`);
      }

      const isMismatch = flags.length > 0;
      console.log("FLAGS:", flags, "| WARNINGS:", warnings, "| MISMATCH:", isMismatch);

      return NextResponse.json({
        result: isMismatch ? "MISMATCH" : "MATCH",
        reason: audit.summary ?? text.replace(/\n/g, " ").trim(),
        flags,
        warnings,
        observed: {
          hand: handsVisible === "both" ? "BOTH" : handsVisible === "one" ? "ONE" : "NO",
          handConfidence,
          nail: observedNail,
          nailcomp: nailVerdict === "different" ? "YES" : nailVerdict === "same" ? "NO" : "UNCERTAIN",
          nailConfidence,
          structure: structureVerdict,
          structureConfidence,
          identity: identityVerdict,
          identityConfidence,
          markerResults: markerResults.slice(0, regMarkers.length),
          markerDecisions,
          independentMarkers,
          accessories: audit.accessories?.observed ?? "none",
        },
      });
    }

    const result = await callGeminiWithRetry(model, [
      { inlineData: { data: currentImage.split(",")[1], mimeType: "image/jpeg" } },
      `Look at this image and answer with valid JSON only: {"hands_visible":"none|one|both","nail_length":"very_short|short|medium|long|very_long"}`,
    ]);

    const text = result.response.text().trim();
    const audit = JSON.parse(cleanJson(text)) as { hands_visible?: string; nail_length?: string };
    const observedNail = normalizeNail(audit.nail_length);

    const flags: string[] = [];
    if (audit.hands_visible !== "both") flags.push(`both_hands_not_visible: observed=${audit.hands_visible ?? "none"}`);
    if (regNail && observedNail && nailDiff(regNail, observedNail) >= 1) {
      flags.push(`nail_mismatch: registered=${regNail}, observed=${observedNail}`);
    }

    return NextResponse.json({
      result: flags.length > 0 ? "MISMATCH" : "MATCH",
      reason: text.replace(/\n/g, " ").trim(),
      flags,
      observed: { hand: audit.hands_visible === "both" ? "BOTH" : audit.hands_visible === "one" ? "ONE" : "NO", nail: observedNail },
    });
  } catch (error) {
    console.error("Deep auth error:", error);
    return NextResponse.json({ result: "ERROR", reason: String(error) });
  }
}
