import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── JSON Parser Utility ──────────────────────────────────────────────────────
export function parseJSON(text: string): Record<string, any> {
  try {
    let cleaned = text.trim().replace(/^```json\n?|\n?```$/g, "");
    
    // Attempt to fix common LLM JSON errors:
    // 1. Remove trailing commas in arrays/objects
    cleaned = cleaned.replace(/,(\s*[\]}])/g, "$1");
    
    // 2. Fix weird newline quotes like: "string" \n ",
    cleaned = cleaned.replace(/"\s*\n\s*",/g, '",');
    
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse Gemini JSON:", text);
    // Return a safe minimal object based on typical usage
    return {};
  }
}

// ─── Prompt: Action Detection (Robotics-ER) ───────────────────────────────────
export const ROBOTICS_ER_PROMPT = `You are VeriPro's Physical Action Recognition Engine and Safety Observer.
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
- work_quality.reason: one sentence naming the specific quality indicator (e.g. strip length, screw engagement)

ANOMALY:
- anomaly: one sentence if something is out of place (wrong tool, multiple hands). null if normal.

Output ONLY valid JSON.
{
  "action": "WIRE_STRIPPING|CABLE_TERMINATION|TERMINAL_BLOCK_WIRING|CONNECTOR_SEATING|CONTINUITY_TESTING|CIRCUIT_TESTING|CABLE_ROUTING|CONDUIT_INSERTION|EARTH_BONDING|INSULATION_TESTING|LABEL_APPLICATION|PANEL_ACCESS|SCREWDRIVER_TORQUE|HANDS_ONLY|NO_ACTION",
  "confidence": 0.0-1.0,
  "description": "One sentence. Name the specific component and hand action.",
  "hands_present": true|false,
  "tools_visible": ["tool names"],
  "completion": "COMPLETE|ONGOING|PARTIAL|null",
  "work_quality": { "rating": "GOOD|ACCEPTABLE|POOR|null", "reason": "string|null" },
  "anomaly": "string|null",
  "safety_assessment": { "level": "SAFE|CAUTION|UNSAFE|UNASSESSABLE", "observation": "string", "improvement_tip": "string|null" },
  "ppe_check": { "gloves_worn": true, "remark": "string" }
}`;

// ─── Prompt: Session Evaluation ───────────────────────────────────────────────
export const EVALUATION_PROMPT = `You are VeriPro's Session Certification and Assessment Engine.

You receive a session log from a hands-on practical assessment recorded by VeriPro.
The log contains timestamped action observations from Gemini Robotics-ER.

CERTIFICATION CRITERIA:
- CONFIRMED: ≥3 qualifying actions (confidence ≥0.65, not HANDS_ONLY/NO_ACTION),
  actions consistent with task claim, ≥1 tool mentioned, hands present throughout
- PARTIAL: Conditions partially met — some qualifying actions but marginal
- INCONSISTENT: Fewer than 3 qualifying actions, inconsistent with task claim, or no tools

GRADING:
Assess the quality of work demonstrated across the entire session.
Use work_quality ratings, safety_assessment levels, completion states,
and action descriptions as your evidence.

If job posting skills are provided, assess which required skills were demonstrated
and which were not observed.

OUTPUT — return ONLY valid JSON:
{
  "certified": true,
  "verdict": "CONFIRMED|PARTIAL|INCONSISTENT",
  "summary": "2-3 sentences for formal certificate. Be specific.",
  "verdict_rationale": "One sentence citing specific evidence.",
  "reasons": ["Reason 1", "Reason 2"],
  "total_qualifying_actions": 0,
  "key_actions": [{ "timestamp": "HH:MM:SS", "action": "description" }],
  "criteria": [
    {
      "name": "Criterion name",
      "score": 0,
      "pass": true,
      "justification": "Evidence citation"
    }
  ],
  "skills_matched": ["skill names observed"],
  "skills_missing": ["skill names NOT observed"],
  "employer_summary": "3-5 sentences for hiring manager."
}`;

// ─── Prompt: Safety Report ────────────────────────────────────────────────────
export const SAFETY_REPORT_PROMPT = `You are an engineering lecturer reviewing a student's practical session safety record.
You have per-frame safety observations from an AI monitoring system.
Write a post-session safety feedback report in the style of a thoughtful lecturer.

Output ONLY valid JSON:
{
  "overall_safety_level": "EXCELLENT|GOOD|NEEDS_IMPROVEMENT|UNSAFE",
  "overall_score": 0.0,
  "session_summary": "2-3 sentences. Cite at least 2 actions with timestamps.",
  "ppe_summary": "One sentence on glove/PPE compliance.",
  "strengths": ["Action + timestamp + what was correct"],
  "areas_for_improvement": [
    {
      "area": "Short label",
      "observation": "What was specifically observed",
      "recommendation": "What to do differently"
    }
  ],
  "lecturer_closing_remark": "One encouraging closing statement."
}`;

// ─── Logic: Session Evaluation ───────────────────────────────────────────────
export async function evaluateSession(
  logText: string,
  taskClaim: string,
  flagCount: number,
  jobPostingSkills?: string[]
): Promise<any> {
  const skillsContext = jobPostingSkills?.length
    ? `\nJOB POSTING REQUIRED SKILLS TO ASSESS: ${jobPostingSkills.join(", ")}\n`
    : `\nNo job posting provided — derive 3–5 assessment criteria from the task claim: "${taskClaim}".\n`;

  const flagNote =
    flagCount > 0
      ? `\nNOTE: This session had ${flagCount} biometric flag(s). Consider this when assessing consistency.\n`
      : "";

  const prompt =
    EVALUATION_PROMPT + skillsContext + flagNote + "\n\nSESSION LOG:\n" + logText;

  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  const result = await model.generateContent(prompt);
  const raw = parseJSON(result.response.text());

  return {
    certified: Boolean(raw.certified),
    verdict: raw.verdict ?? "INCONSISTENT",
    summary: raw.summary ?? "",
    verdict_rationale: raw.verdict_rationale ?? "",
    reasons: raw.reasons ?? [],
    total_qualifying_actions: Number(raw.total_qualifying_actions ?? 0),
    key_actions: raw.key_actions ?? [],
    criteria: raw.criteria ?? [],
    skills_matched: raw.skills_matched ?? [],
    skills_missing: raw.skills_missing ?? [],
    employer_summary: raw.employer_summary ?? "",
  };
}

// ─── Logic: Safety Report Synthesis ──────────────────────────────────────────
export async function synthesizeSafetyReport(
  observations: any[]
): Promise<any> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  const prompt =
    SAFETY_REPORT_PROMPT +
    "\n\nOBSERVATIONS:\n" +
    JSON.stringify(observations, null, 2);
  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}
