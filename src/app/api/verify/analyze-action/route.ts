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

SAFETY:
- safety_assessment.level: SAFE / CAUTION / UNSAFE
- safety_assessment.observation: one specific sentence on what you see
- safety_assessment.improvement_tip: one actionable safety correction; null if SAFE

PPE:
- ppe_check.gloves_worn: whether protective gloves are visibly worn
- ppe_check.remark: one sentence on PPE compliance

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
    "level": "SAFE|CAUTION|UNSAFE|UNASSESSABLE",
    "observation": "...|null",
    "improvement_tip": "...|null"
  },
  "ppe_check": { "gloves_worn": true, "remark": "...|null" }
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
      safety_assessment: { level: "UNASSESSABLE", observation: null, improvement_tip: null },
      ppe_check: { gloves_worn: "unclear", remark: null },
    });
  }
}
