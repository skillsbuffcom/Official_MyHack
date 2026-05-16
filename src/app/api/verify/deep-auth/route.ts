import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { DEEP_AUTH_PROMPT } from "@/lib/gemini";

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function parseDeepAuthResponse(text: string): {
  result: "MATCH" | "MISMATCH";
  flags: string[];
  raw: string;
} {
  const flags: string[] = [];
  const lines = text.split("\n");

  const get = (prefix: string) =>
    lines.find((l) => l.startsWith(prefix))?.split(": ")[1]?.trim() ?? "";

  const handVisible = get("HAND") === "YES";
  const nailMismatch = get("NAILCOMP") === "YES";
  const regmarkLine = lines.find((l) => l.startsWith("REGMARK:"));
  const regmarkConfirmed = regmarkLine
    ? get("REGMARK") === "YES"
    : true; // no marker registered → skip
  const accessoriesScan = get("ACCESSORIES");
  const accessoriesMaster = get("MACCESSORIES");
  const comparePass = get("COMPARE") === "YES";

  if (!handVisible) flags.push("no_hand_visible");
  if (nailMismatch) flags.push("nail_length_mismatch");
  if (!regmarkConfirmed && regmarkLine) flags.push("marker_not_confirmed");
  if (
    accessoriesScan !== "none" &&
    accessoriesMaster !== "none" &&
    accessoriesScan !== accessoriesMaster
  ) {
    if (accessoriesScan.length > accessoriesMaster.length) flags.push("accessories_added");
    else flags.push("accessories_removed");
  }

  const result = flags.length === 0 && comparePass ? "MATCH" : "MISMATCH";
  return { result, flags, raw: text };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { masterBase64, scanBase64, masterMime, scanMime, hasMarker } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = DEEP_AUTH_PROMPT;
    if (hasMarker) {
      prompt += "\nREGMARK: Does any mark match the registered mark? YES or NO.";
    }

    const result = await model.generateContent([
      { inlineData: { data: masterBase64, mimeType: masterMime ?? "image/jpeg" } },
      { inlineData: { data: scanBase64, mimeType: scanMime ?? "image/jpeg" } },
      prompt,
    ]);

    const text = result.response.text().trim();
    const parsed = parseDeepAuthResponse(text);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("deep-auth error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
