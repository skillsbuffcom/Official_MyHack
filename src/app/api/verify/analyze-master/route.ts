import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { HAND_REGISTRATION_PROMPT } from "@/lib/gemini";

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType: mimeType ?? "image/jpeg" } },
      HAND_REGISTRATION_PROMPT,
    ]);

    const text = result.response.text().trim().replace(/^```json\n?|\n?```$/g, "");
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("analyze-master error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
