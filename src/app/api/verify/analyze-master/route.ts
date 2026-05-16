import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { parseJSON } from "@/lib/gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            hand_structure: { type: "string" },
            nail_length: { 
              type: "string", 
              enum: ["very_short", "short", "medium", "long", "very_long"] 
            },
            physical_marker: {
              type: "object",
              properties: {
                present: { type: "boolean" },
                type: { type: "string" },
                location: { type: "string" },
                description: { type: "string" }
              },
              required: ["present"]
            },
            jewelry: { type: "string" },
            sleeve: { type: "string" },
            veins: { type: "string" }
          },
          required: ["hand_structure", "nail_length", "physical_marker"]
        }
      }
    });

    const prompt = `You are registering a worker's hands for biometric identity verification.
NOTE: This image has been processed with a green-channel filter — it will appear greenish/monochrome. This enhances skin texture and surface markers. Do NOT comment on skin tone or colour.

Analyze the hands and return a detailed biometric profile.
nail_length guidelines:
- very_short: flat at or below fingertip
- short: 1mm past fingertip
- medium: 2-4mm past
- long: 5-8mm past
- very_long: 9mm+

physical_marker: any mole, scar, cut, birthmark, or tattoo.`;

    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType: mimeType ?? "image/jpeg" } },
      prompt,
    ]);

    const profile = parseJSON(result.response.text());

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Analyze master error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
