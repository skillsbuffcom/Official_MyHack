import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { parseJSON } from "@/lib/gemini";

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ACTION_DETECTION_PROMPT = `You are VeriPro's Physical Action Recognition Engine and Safety Observer.
You analyze single frames from a hands-on electrical wiring practical session
recorded on a smartphone or webcam pointed at a work bench.
Work is performed on de-energized equipment. Hands are bare or in thin latex gloves.

Identify the specific electrical action being performed in this frame.
If the worker is transitioning between actions (moving hands, repositioning wire),
return HANDS_ONLY with confidence 0.3.
Reserve NO_ACTION for frames where hands are not visible at all.

For any real electrical action (not HANDS_ONLY or NO_ACTION) with confidence >= 0.65,
also evaluate:

SAFETY — classify with strict thresholds:
- SAFE: clear working posture, tool blade/tip directed away from hands, no energised conductor contact
- CAUTION: tool angled toward body or wire but no imminent contact; minor posture risk
- UNSAFE: tool blade or sharp tip within ~5 cm of bare skin; poor grip likely to slip; insulation stripped excessively exposing conductor
- CRITICAL: any of the following — (1) cutting edge or sharp tip making or about to make contact with bare fingers/palm, (2) bare hand or finger contacting an uninsulated conductor that may be live, (3) probing live terminals without insulated probes. When in doubt between UNSAFE and CRITICAL, escalate to CRITICAL.

For UNSAFE and CRITICAL, set violation_type:
- "SHARP_TOOL_NEAR_HANDS": blade, stripper jaw, or cutter edge within immediate contact range of bare skin
- "LIVE_WIRE_CONTACT": bare hand or uninsulated probe on exposed conductor
- "TOOL_MISUSE": tool used in a way that creates immediate physical danger

COMPLETION STATE:
- completion: COMPLETE / ONGOING / PARTIAL

WORK QUALITY:
- work_quality.rating: GOOD / ACCEPTABLE / POOR
- work_quality.reason: one sentence naming the specific observed quality indicator

ANOMALY:
- anomaly: one sentence if something is out of place; null if nothing unusual

Output ONLY valid JSON. No text before or after.

{
  "action": "WIRE_STRIPPING|CABLE_TERMINATION|TERMINAL_BLOCK_WIRING|CONNECTOR_SEATING|CONTINUITY_TESTING|CIRCUIT_TESTING|CABLE_ROUTING|CONDUIT_INSERTION|EARTH_BONDING|INSULATION_TESTING|LABEL_APPLICATION|PANEL_ACCESS|SCREWDRIVER_TORQUE|HANDS_ONLY|NO_ACTION",
  "confidence": 0.0,
  "description": "One sentence. Name the specific component and hand action.",
  "hands_present": true,
  "tools_visible": ["name every visible tool specifically"],
  "completion": "COMPLETE|ONGOING|PARTIAL|null",
  "work_quality": { "rating": "GOOD|ACCEPTABLE|POOR|null", "reason": "..." },
  "anomaly": "...|null",
  "safety_assessment": {
    "level": "SAFE|CAUTION|UNSAFE|CRITICAL|UNASSESSABLE",
    "violation_type": "SHARP_TOOL_NEAR_HANDS|LIVE_WIRE_CONTACT|TOOL_MISUSE|null",
    "observation": "...|null",
    "improvement_tip": "...|null"
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, timestamp } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-robotics-er-1.6-preview" });
    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType: mimeType ?? "image/jpeg" } },
      ACTION_DETECTION_PROMPT,
    ]);

    const parsed = parseJSON(result.response.text());

    return NextResponse.json({ ...parsed, timestamp });
  } catch (err) {
    console.error("analyze-action error:", err);
    // Fallback to a safe default response
    return NextResponse.json({
      action: "HANDS_ONLY",
      confidence: 0.3,
      description: "Unable to analyze frame",
      hands_present: false,
      tools_visible: [],
      completion: null,
      work_quality: { rating: null, reason: null },
      anomaly: null,
      safety_assessment: { level: "UNASSESSABLE", violation_type: null, observation: null, improvement_tip: null },
    });
  }
}
