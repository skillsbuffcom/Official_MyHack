import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

const NAIL_SCALE: Record<string, number> = {
  very_short: 0, short: 1, medium: 2, long: 3, very_long: 4,
};

export async function POST(req: Request) {
  try {
    const { currentImage, masterImage, masterProfile } = await req.json();
    if (!currentImage) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const parsed = (() => {
      if (!masterProfile) return null;
      try {
        return typeof masterProfile === "string" ? JSON.parse(masterProfile) : masterProfile;
      } catch { return null; }
    })();

    const regNail: string | null = parsed?.nail_length ?? null;
    const regMarker = parsed?.physical_marker?.present ? parsed.physical_marker : null;

    console.log("DEEP AUTH — regNail:", regNail, "| regMarker:", regMarker?.type ?? "none");

    if (masterImage) {
      const markHint = regMarker
        ? `\nIMPORTANT: The registered person (IMAGE 1) has a ${regMarker.type}${regMarker.location ? ` at ${regMarker.location}` : ""}${regMarker.description ? ` — ${regMarker.description}` : ""}. This is a PERMANENT mark. Look for it at this exact location in IMAGE 2.`
        : "";

      const comparePrompt = `You are a strict biometric security system. Your job is to find differences between two hand images — not to confirm similarity. Default to NO when uncertain.

NOTE: Both images have been processed with a green-channel filter — they appear greenish/monochrome. This enhances skin texture and surface markers but also makes shadows and skin creases more visible. Do NOT mistake shadows, knuckle creases, wrinkles, or normal skin texture for permanent marks.

IMAGE 1: REGISTERED REFERENCE (captured at session start)
IMAGE 2: CURRENT SCAN (captured now)
${markHint}

Answer each line exactly as shown.

HAND: Is at least one hand clearly visible in IMAGE 2? YES or NO.
NAIL: Nail length in IMAGE 2 only? very_short / short / medium / long / very_long
  very_short = flat at fingertip  |  short = 1mm past  |  medium = 2-4mm past  |  long = 5-8mm past  |  very_long = 9mm+
NAILCOMP: Do the nails in IMAGE 2 appear a different length from IMAGE 1 — either clearly longer OR clearly shorter? Compare across multiple fingers. Do not excuse differences as pose or angle. YES or NO.
MARKS: List only clearly distinct, permanent marks on IMAGE 2 — moles (raised or flat dark spots), scars, cuts, birthmarks, tattoos. Do NOT list shadows, skin creases, knuckle pigmentation, wrinkles, or normal skin texture. Each mark: type and exact location. If none clearly present, write: none.${markHint ? `\nREGMARK: A registered mark is described above. Look ONLY at the exact location specified. Is there a clearly visible mark of the same type at that precise location in IMAGE 2? Do not confirm based on a mark in a different location. If you are not certain it is the same mark at the same spot, answer NO. YES or NO.` : ""}
ACCESSORIES: Every ring, watch, bracelet, or hand/wrist accessory visible in IMAGE 2. If none, write: none.
MACCESSORIES: Every ring, watch, bracelet, or hand/wrist accessory visible in IMAGE 1. If none, write: none.
COMPARE: Compare IMAGE 1 and IMAGE 2. Your job is to find differences, not confirm similarity.
(1) Finger thickness and proportions — the most reliable indicator. Noticeably wider, thicker, or differently shaped fingers = NO.
(2) Nail length — directly compare across all fingers. Clearly different length = NO.
(3) Skin tone — only flag if the difference is extreme and cannot be explained by lighting.
(4) Registered marks — if a mark is present in IMAGE 1 but clearly absent in IMAGE 2, answer NO.
Answer YES only if the hands could plausibly belong to the same person. Otherwise NO. YES or NO.`;

      const result = await callGeminiWithRetry(model, [
        { inlineData: { data: masterImage.split(",")[1], mimeType: "image/jpeg" } },
        { text: "IMAGE 1 — REGISTERED REFERENCE:" },
        { inlineData: { data: currentImage.split(",")[1], mimeType: "image/jpeg" } },
        { text: "IMAGE 2 — CURRENT SCAN:\n\n" + comparePrompt },
      ]);

      const text = result.response.text().trim();
      console.log("COMPARE RESPONSE:\n", text);

      const getLine = (key: string) =>
        new RegExp(`^${key}:\\s*(.+)$`, "im").exec(text)?.[1]?.trim() ?? null;

      const hand = getLine("HAND")?.toUpperCase();
      const obsNailRaw = getLine("NAIL")?.toLowerCase().replace(/\s+/g, "_") ?? null;
      const obsNail = obsNailRaw && obsNailRaw in NAIL_SCALE ? obsNailRaw : null;
      const nailComp = getLine("NAILCOMP")?.toUpperCase() ?? null;
      const obsMarks = getLine("MARKS") ?? "none";
      const compareAnswer = getLine("COMPARE")?.toUpperCase() ?? null;
      const regMarkAnswer = regMarker ? (getLine("REGMARK")?.toUpperCase() ?? null) : null;
      const obsAccessories = getLine("ACCESSORIES")?.toLowerCase() ?? "none";
      const masterAccessories = getLine("MACCESSORIES")?.toLowerCase() ?? "none";
      console.log("PARSED:", { hand, obsNail, nailComp, obsMarks, compareAnswer, regMarkAnswer, obsAccessories, masterAccessories });

      const flags: string[] = [];
      if (hand === "NO") flags.push("no_hand_visible");
      // COMPARE is informational — logged but not a flag. Lighting, angle, and
      // single-vs-two-hand composition differences make it unreliable as a hard check.
      // NAILCOMP + REGMARK are the reliable anchors.
      console.log("[COMPARE]", compareAnswer);

      if (nailComp === "YES") {
        flags.push(`nail_length_mismatch: nails in scan appear different length from registered reference (reg=${regNail ?? "?"}, obs=${obsNail ?? "?"})`);
      }

      if (regMarker && regMarkAnswer !== "YES") {
        const reason = obsMarks.toLowerCase() === "none"
          ? "scan shows no marks"
          : regMarkAnswer === "NO"
            ? "marks found but none match registered mark"
            : "marker presence unconfirmed";
        flags.push(`marker_not_confirmed: registered ${regMarker.type} — ${reason}`);
      }

      const masterHasAccessories = masterAccessories !== "none";
      const obsHasAccessories = obsAccessories !== "none";
      if (!masterHasAccessories && obsHasAccessories) {
        flags.push(`accessories_added: scan shows ${obsAccessories} — not present in registered reference`);
      } else if (masterHasAccessories && !obsHasAccessories) {
        flags.push(`accessories_removed: registered reference shows ${masterAccessories} — absent in scan`);
      }

      const isMismatch = flags.length > 0;
      console.log("FLAGS:", flags, "| MISMATCH:", isMismatch);

      return NextResponse.json({
        result: isMismatch ? "MISMATCH" : "MATCH",
        reason: text.replace(/\n/g, " ").trim(),
        flags,
        observed: { hand, nail: obsNail, marks: obsMarks, compare: compareAnswer, accessories: obsAccessories, regmark: regMarkAnswer },
      });
    }

    // Fallback: no master image — use profile text only
    const regMarkLine = regMarker
      ? `\nREGMARK: The registered person has a ${regMarker.type}${regMarker.description ? ` (${regMarker.description})` : ""} on their hand. Look at the marks you listed above in MARKS. Does any mark you listed match this — same type, same rough area of the hand, similar appearance? Answer YES if clear match, NO if not.`
      : "";

    const prompt = `Look carefully at the hands in this image. NOTE: This image has been processed with a green-channel filter — it will appear greenish/monochrome. This enhances vein patterns and surface markers. Do NOT comment on skin colour.

Answer each line exactly as shown.

HAND: Is at least one hand clearly visible? YES or NO.
NAIL: How long are the nails? Pick one word only: very_short / short / medium / long / very_long
  very_short = nails flat at or below the fingertip  |  short = 1mm past  |  medium = 2-4mm past  |  long = 5-8mm past  |  very_long = 9mm+
MARKS: List every mole, scar, cut, bruise, or birthmark you can see anywhere on both hands with exact location. If none, write: none${regMarkLine}`;

    const result = await callGeminiWithRetry(model, [
      { inlineData: { data: currentImage.split(",")[1], mimeType: "image/jpeg" } },
      prompt,
    ]);

    const text = result.response.text().trim();
    console.log("FALLBACK RESPONSE:\n", text);

    const getLine = (key: string) =>
      new RegExp(`^${key}:\\s*(.+)$`, "im").exec(text)?.[1]?.trim() ?? null;

    const hand = getLine("HAND")?.toUpperCase();
    const obsNailRaw = getLine("NAIL")?.toLowerCase().replace(/\s+/g, "_") ?? null;
    const obsNail = obsNailRaw && obsNailRaw in NAIL_SCALE ? obsNailRaw : null;
    const obsMarks = getLine("MARKS") ?? "none";
    const regMarkAnswer = regMarker ? (getLine("REGMARK")?.toUpperCase() ?? null) : null;

    const flags: string[] = [];
    if (hand === "NO") flags.push("no_hand_visible");
    if (regNail && obsNail) {
      const diff = Math.abs((NAIL_SCALE[obsNail] ?? 2) - (NAIL_SCALE[regNail] ?? 2));
      if (diff >= 2) flags.push(`nail_mismatch: registered=${regNail}, observed=${obsNail}`);
    }
    if (regMarker && regMarkAnswer === "NO") {
      flags.push(`marker_missing: registered ${regMarker.type} at ${regMarker.location} not found`);
    }

    const isMismatch = flags.length > 0;
    console.log("FLAGS:", flags, "| MISMATCH:", isMismatch);

    return NextResponse.json({
      result: isMismatch ? "MISMATCH" : "MATCH",
      reason: text.replace(/\n/g, " ").trim(),
      flags,
      observed: { hand, nail: obsNail, marks: obsMarks, regmark: regMarkAnswer },
    });

  } catch (error) {
    console.error("Deep auth error:", error);
    return NextResponse.json({ result: "ERROR", reason: String(error) });
  }
}
