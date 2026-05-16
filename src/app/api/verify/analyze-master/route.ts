import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { image, colorImage, handCrops } = await req.json();
    if (!image) return NextResponse.json({ error: "Missing image" }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are registering a worker's hands for biometric identity verification. Look at both hands carefully.
CRITICAL: You must detect persistent physical markers, but do not over-register ordinary skin texture. Include only highly distinctive, repeatable identity anchors such as a clear mole, freckle, scar, birthmark, tattoo, cut, callus, or distinct dark dot. Ignore shadows, wrinkles, knuckle creases, pores, lighting artifacts, and vague discoloration. Inspect the full image first, then every zoomed crop. Return at most 1 physical_marker unless a second marker is extremely obvious. If there are no clearly repeatable markers after checking the zoomed crops, return an empty physical_markers array.
Respond ONLY with valid JSON, no text before or after:

{
  "hand_visibility": "both|one|none",
  "hand_structure": {
    "finger_length": "short|medium|long",
    "finger_width": "slender|medium|thick",
    "overall_size": "small|medium|large",
    "knuckles": "subtle|medium|prominent",
    "nail_beds": "short|medium|long and round|square|oval",
    "notes": "Distinctive proportions useful for later comparison"
  },
  "nail_length": "Pick EXACTLY one: very_short / short / medium / long / very_long. very_short=flat at or below fingertip, short=1mm past, medium=2-4mm past, long=5-8mm past, very_long=9mm+",
  "nails": "Describe shape (square/round/oval/pointed), cleanliness, any chips or distinctive features.",
  "physical_markers": [
    {
      "type": "mole|scar|cut|bruise|birthmark|tattoo|callus|other",
      "hand": "left|right|unknown",
      "location": "Precise location on the hand",
      "description": "Size, shape, color, and any other details. Explain why this is not just a crease or shadow.",
      "confidence": 0.0
    }
  ],
  "jewelry": "Describe any rings, watches, bracelets - position and style only. Say none if absent.",
  "sleeve": "Describe the sleeve/clothing visible at the wrist",
  "other": "Any other distinctive feature not captured above"
}`;

    const cropParts = Array.isArray(handCrops)
      ? handCrops.slice(0, 2).flatMap((crop: string, index: number) => [
          { inlineData: { data: crop.split(",")[1], mimeType: "image/jpeg" } },
          { text: `ZOOMED HAND CROP ${index + 1} - inspect closely for tiny moles, freckles, scars, cuts, and nail length.` },
        ])
      : [];

    const parts = (colorImage
      ? [
          { inlineData: { data: image.split(",")[1], mimeType: "image/jpeg" } },
          { text: "IMAGE 1 - SHARP REFERENCE (nail/structure analysis):" },
          { inlineData: { data: colorImage.split(",")[1], mimeType: "image/jpeg" } },
          { text: "IMAGE 2 - NATURAL COLOR (mark detection):" },
          ...cropParts,
          { text: prompt },
        ]
      : [
          { inlineData: { data: image.split(",")[1], mimeType: "image/jpeg" } },
          ...cropParts,
          prompt,
        ]) as Parameters<typeof model.generateContent>[0];

    const result = await model.generateContent(parts);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const profile = JSON.parse(cleaned);
    const markers = (Array.isArray(profile.physical_markers) ? profile.physical_markers : [])
      .filter((marker: { confidence?: unknown; location?: unknown; type?: unknown }) => {
        const confidence = Number(marker.confidence ?? 0);
        const location = String(marker.location ?? "").toLowerCase();
        const type = String(marker.type ?? "").toLowerCase();
        const threshold = ["mole", "scar", "birthmark", "tattoo"].includes(type) ? 0.68 : 0.8;
        return confidence >= threshold && location && location !== "none" && type && type !== "none";
      })
      .sort((a: { confidence?: unknown }, b: { confidence?: unknown }) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0))
      .slice(0, 1);
    profile.physical_markers = markers;

    if (!profile.physical_marker) {
      const primary = markers[0];
      profile.physical_marker = primary
        ? { present: true, type: primary.type ?? "marker", location: primary.location ?? "unknown" }
        : { present: false, type: "none", location: "none" };
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("analyze-master error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
