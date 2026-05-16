import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "Missing image" }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      { inlineData: { data: image.split(",")[1], mimeType: "image/jpeg" } },
      `You are registering a worker's hands for biometric identity verification. Look at both hands carefully.
NOTE: This image has been processed with a green-channel filter — it will appear greenish/monochrome. This enhances vein patterns, skin texture, and surface markers. Do NOT comment on skin tone or colour.

Identify the most visually distinct and permanent features for identity locking.

Respond ONLY with valid JSON, no text before or after:

{
  "hand_structure": "Describe finger length (short/medium/long), finger width (slender/medium/thick), overall hand size, knuckle prominence, nail bed shape",
  "nail_length": "Pick EXACTLY one: very_short / short / medium / long / very_long. very_short=flat at or below fingertip, short=1mm past, medium=2-4mm past, long=5-8mm past, very_long=9mm+",
  "nails": "Describe shape (square/round/oval/pointed), cleanliness, any chips or distinctive features. Omit colour and polish.",
  "physical_marker": {
    "present": true or false,
    "type": "mole|scar|cut|bruise|birthmark|tattoo|callus|other — omit if present is false",
    "location": "Precise location on the hand, e.g. 'dorsal side, between index and middle finger knuckle' — omit if present is false",
    "description": "Size, shape, and any other details visible in the processed image — omit if present is false"
  },
  "jewelry": "Describe any rings, watches, bracelets — position and style only (omit metal colour). Say 'none' if absent.",
  "sleeve": "Describe the sleeve/clothing visible at the wrist — fabric type, length, pattern",
  "veins": "Describe vein visibility and pattern if notable",
  "other": "Any other distinctive feature not captured above"
}`,
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const profile = JSON.parse(cleaned);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("analyze-master error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
