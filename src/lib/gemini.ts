import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── Prompt: Action Detection ─────────────────────────────────────────────────
// Prompt lives in /api/verify/analyze-action — listed here for reference only.

// ─── Prompt: Hand Registration ────────────────────────────────────────────────
export const HAND_REGISTRATION_PROMPT = `You are registering a worker's hands for biometric identity verification.
NOTE: This image has been processed with a green-channel filter — it will appear
greenish/monochrome. This enhances skin texture and surface markers. Do NOT comment
on skin tone or colour.

Respond ONLY with valid JSON:

{
  "hand_structure": "finger length, width, overall size, knuckle prominence, nail bed shape",
  "nail_length": "EXACTLY one: very_short/short/medium/long/very_long (very_short=flat at fingertip, short=1mm past, medium=2-4mm, long=5-8mm, very_long=9mm+)",
  "nails": "shape, cleanliness, distinctive features — omit colour and polish",
  "physical_marker": {
    "present": true,
    "type": "mole|scar|cut|bruise|birthmark|tattoo|callus|other",
    "location": "precise location on hand",
    "description": "size, shape, details"
  },
  "jewelry": "position and style — omit metal colour. 'none' if absent.",
  "sleeve": "fabric type, length, pattern",
  "veins": "vein visibility and pattern if notable"
}`;

// ─── Prompt: Deep Authentication ──────────────────────────────────────────────
export const DEEP_AUTH_PROMPT = `You are a strict biometric security system. Your job is to find differences between
two hand images — not to confirm similarity. Be conservative: when in doubt, answer NO.

NOTE: Both images have been processed with a green-channel filter — they will appear
greenish/monochrome.

IMAGE 1: REGISTERED REFERENCE (session start)
IMAGE 2: CURRENT SCAN (now)

Answer each line exactly as shown.

HAND: Is at least one hand clearly visible in IMAGE 2? YES or NO.
NAIL: Nail length in IMAGE 2 only? very_short/short/medium/long/very_long
NAILCOMP: Do the nails in IMAGE 2 appear a different length from IMAGE 1? YES or NO.
MARKS: Every mole, scar, cut, or birthmark in IMAGE 2 with exact location. If none: none.
ACCESSORIES: Every ring, watch, bracelet in IMAGE 2. If none: none.
MACCESSORIES: Every ring, watch, bracelet in IMAGE 1. If none: none.
COMPARE: Find differences — nail length, skin tone, finger thickness/proportions, marks.
         YES if same person plausible. NO if meaningful physical difference.`;

// ─── Prompt: Session Evaluation ───────────────────────────────────────────────
const EVALUATION_PROMPT = `You are VeriPro's Session Certification and Assessment Engine.

You receive a session log from a hands-on practical assessment recorded by VeriPro.
The log contains timestamped action observations from Gemini Robotics-ER, including
action type, confidence, description, work quality, safety assessment, and tool usage.

CERTIFICATION CRITERIA (unchanged — evaluate these first):
- CONFIRMED: ≥3 qualifying actions (confidence ≥0.65, not HANDS_ONLY/NO_ACTION),
  actions consistent with task claim, ≥1 tool mentioned, hands present throughout
- PARTIAL: Conditions partially met — some qualifying actions but marginal
- INCONSISTENT: Fewer than 3 qualifying actions, inconsistent with task claim, or no tools

GRADING (evaluate from the same action log):
Assess the quality of work demonstrated across the entire session.
Use work_quality ratings, safety_assessment levels, completion states,
and action descriptions as your evidence.

If job posting skills are provided, assess which required skills were demonstrated
and which were not observed. If no job posting skills provided, derive 3–5 relevant
criteria from the task claim.

DO NOT return an overall_score — this is computed separately from frame data.

OUTPUT — return ONLY valid JSON, no text before or after:

{
  "certified": true,
  "verdict": "CONFIRMED|PARTIAL|INCONSISTENT",
  "summary": "2-3 sentences for formal certificate. Cite timestamps, tools, components.",
  "verdict_rationale": "One sentence citing specific evidence.",
  "reasons": ["Specific observable reason 1", "..."],
  "total_qualifying_actions": 0,
  "key_actions": [{ "timestamp": "HH:MM:SS", "action": "one-line description" }],
  "criteria": [
    {
      "name": "Criterion name (e.g. Cable preparation quality)",
      "score": 0,
      "pass": true,
      "justification": "One sentence citing specific action and timestamp as evidence."
    }
  ],
  "skills_matched": ["skill names from job posting that were observed"],
  "skills_missing": ["skill names from job posting that were NOT observed"],
  "employer_summary": "3-5 sentences written for a hiring manager. Mention what was done well, any gaps, and a clear recommendation. Tone: professional, honest, specific."
}

Criterion score guidelines:
- 90-100: Criterion fully met, excellent execution, no issues
- 75-89: Criterion met, good execution, minor issues
- 60-74: Criterion partially met, acceptable quality, some gaps
- 50-59: Criterion partially met, quality concerns
- Below 50: Criterion not met or significant quality issues`;

// ─── Prompt: Safety Report ────────────────────────────────────────────────────
const SAFETY_REPORT_PROMPT = `You are an engineering lecturer reviewing a student's practical session safety record.
You have per-frame safety observations from an AI monitoring system.
Write a post-session safety feedback report in the style of a thoughtful lecturer.

Input: JSON array of safety observations (action, level, observation, improvement_tip, ppe_check).

Output ONLY valid JSON:
{
  "overall_safety_level": "EXCELLENT|GOOD|NEEDS_IMPROVEMENT|UNSAFE",
  "overall_score": 0.0,
  "session_summary": "2-3 sentences. Name at least 2 specific actions with timestamps.",
  "ppe_summary": "One sentence on glove/PPE compliance across session.",
  "strengths": ["Specific thing done well — action, timestamp, what was correct"],
  "areas_for_improvement": [
    {
      "area": "Short label",
      "observation": "What was specifically observed",
      "recommendation": "What to do differently, referencing correct technique"
    }
  ],
  "lecturer_closing_remark": "One encouraging but honest closing statement."
}`;

export function parseJSON(text: string): Record<string, unknown> {
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

export async function evaluateSession(
  logText: string,
  taskClaim: string,
  flagCount: number,
  jobPostingSkills?: string[]
): Promise<{
  certified: boolean;
  verdict: "CONFIRMED" | "PARTIAL" | "INCONSISTENT";
  summary: string;
  verdict_rationale: string;
  reasons: string[];
  total_qualifying_actions: number;
  key_actions: { timestamp: string; action: string }[];
  criteria: { name: string; score: number; pass: boolean; justification: string }[];
  skills_matched: string[];
  skills_missing: string[];
  employer_summary: string;
}> {
  const skillsContext = jobPostingSkills?.length
    ? `\nJOB POSTING REQUIRED SKILLS TO ASSESS: ${jobPostingSkills.join(", ")}\n`
    : `\nNo job posting provided — derive 3–5 assessment criteria from the task claim: "${taskClaim}".\n`;

  const flagNote =
    flagCount > 0
      ? `\nNOTE: This session had ${flagCount} biometric flag(s). Consider this when assessing consistency.\n`
      : "";

  const prompt =
    EVALUATION_PROMPT + skillsContext + flagNote + "\n\nSESSION LOG:\n" + logText;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const raw = parseJSON(result.response.text()) as Record<string, unknown>;

  return {
    certified: Boolean(raw.certified),
    verdict: (raw.verdict as "CONFIRMED" | "PARTIAL" | "INCONSISTENT") ?? "INCONSISTENT",
    summary: (raw.summary as string) ?? "",
    verdict_rationale: (raw.verdict_rationale as string) ?? "",
    reasons: (raw.reasons as string[]) ?? [],
    total_qualifying_actions: Number(raw.total_qualifying_actions ?? 0),
    key_actions: (raw.key_actions as { timestamp: string; action: string }[]) ?? [],
    criteria: (raw.criteria as { name: string; score: number; pass: boolean; justification: string }[]) ?? [],
    skills_matched: (raw.skills_matched as string[]) ?? [],
    skills_missing: (raw.skills_missing as string[]) ?? [],
    employer_summary: (raw.employer_summary as string) ?? "",
  };
}

export async function synthesizeSafetyReport(
  observations: Record<string, unknown>[]
): Promise<Record<string, unknown>> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt =
    SAFETY_REPORT_PROMPT +
    "\n\nOBSERVATIONS:\n" +
    JSON.stringify(observations, null, 2);
  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}
