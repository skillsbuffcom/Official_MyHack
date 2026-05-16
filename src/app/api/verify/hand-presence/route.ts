import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "Missing image" }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Determine whether the worker's hands (or any part of them) are visible.
Be HYPER-LENIENT: If you see a fist, clasped hands, interlocking fingers, a palm, or even a skin-toned object that looks like a hand, you MUST answer "hands_visible": true.
Only answer "hands_visible": false if the frame is completely empty of human hands. 
If you are even 1% unsure, answer true.
Respond ONLY with valid JSON:
{
  "hands_visible": true,
  "confidence": 0.0,
  "description": "brief reason"
}`;

    const result = await model.generateContent([
      { inlineData: { data: image.split(",")[1] ?? image, mimeType: "image/jpeg" } },
      prompt,
    ] as Parameters<typeof model.generateContent>[0]);

    const parsed = JSON.parse(cleanJson(result.response.text())) as {
      hands_visible?: boolean;
      confidence?: number;
      description?: string;
    };

    return NextResponse.json({
      handsVisible: Boolean(parsed.hands_visible),
      confidence: Number(parsed.confidence ?? 0),
      description: parsed.description ?? "",
    });
  } catch (error) {
    console.error("hand-presence error:", error);
    return NextResponse.json({ handsVisible: true, confidence: 0, description: "presence check failed open" });
  }
}
