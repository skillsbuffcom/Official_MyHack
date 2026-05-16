import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── JSON Parser Utility ──────────────────────────────────────────────────────
// ─── JSON Parser Utility ──────────────────────────────────────────────────────
export function parseJSON(text: string): Record<string, unknown> {
  try {
    let cleaned = text.trim().replace(/^```json\n?|\n?```$/g, "");
    
    // Attempt to fix common LLM JSON errors:
    cleaned = cleaned.replace(/,(\s*[\]}])/g, "$1");
    cleaned = cleaned.replace(/"\s*\n\s*",/g, '",');
    
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse Gemini JSON:", text);
    return {};
  }
}

// ─── Prompt: Action Detection (Robotics-ER) ───────────────────────────────────
export const ROBOTICS_ER_PROMPT = `You are VeriPro's Physical Action Recognition Engine and Safety Observer.
You analyze single frames from a hands-on electrical wiring practical session.
Work is performed on de-energized equipment. Hands are bare for identity verification.

Identify the specific electrical action being performed in this frame.
If the worker is transitioning between actions (moving hands, repositioning wire), return HANDS_ONLY with confidence 0.3.

SAFETY — classify with strict thresholds:
- SAFE: clear working posture, tool blade/tip directed away from hands, no energised conductor contact
- CAUTION: tool angled toward body or wire but no imminent contact; minor posture risk
- UNSAFE: tool blade or sharp tip within ~5 cm of bare skin; poor grip likely to slip; insulation stripped excessively exposing conductor
- CRITICAL: any of the following — (1) cutting edge or sharp tip making or about to make contact with bare fingers/palm, (2) bare hand or finger contacting an uninsulated conductor that may be live, (3) probing live terminals without insulated probes. When in doubt between UNSAFE and CRITICAL, escalate to CRITICAL.

For UNSAFE and CRITICAL, also set violation_type:
- "SHARP_TOOL_NEAR_HANDS": blade, stripper jaw, or cutter edge within immediate contact range of bare skin
- "LIVE_WIRE_CONTACT": bare hand or uninsulated probe on exposed conductor
- "TOOL_MISUSE": tool used in a way that creates immediate physical danger

COMPLETION STATE:
- completion: COMPLETE / ONGOING / PARTIAL

WORK QUALITY:
- work_quality.rating: GOOD / ACCEPTABLE / POOR
- work_quality.reason: one sentence naming the specific quality indicator

ANOMALY:
- anomaly: one sentence if something is out of place. null if normal.

Output ONLY valid JSON.
{
  "action": "WIRE_STRIPPING|CABLE_TERMINATION|TERMINAL_BLOCK_WIRING|CONNECTOR_SEATING|CONTINUITY_TESTING|CIRCUIT_TESTING|CABLE_ROUTING|CONDUIT_INSERTION|EARTH_BONDING|INSULATION_TESTING|LABEL_APPLICATION|PANEL_ACCESS|SCREWDRIVER_TORQUE|HANDS_ONLY|NO_ACTION",
  "confidence": 0.0-1.0,
  "description": "One sentence.",
  "hands_present": true|false,
  "tools_visible": ["tool names"],
  "completion": "COMPLETE|ONGOING|PARTIAL|null",
  "work_quality": { "rating": "GOOD|ACCEPTABLE|POOR|null", "reason": "string|null" },
  "anomaly": "string|null",
  "safety_assessment": {
    "level": "SAFE|CAUTION|UNSAFE|CRITICAL|UNASSESSABLE",
    "violation_type": "SHARP_TOOL_NEAR_HANDS|LIVE_WIRE_CONTACT|TOOL_MISUSE|null",
    "observation": "string",
    "improvement_tip": "string|null"
  }
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

ECOSYSTEM LINKAGE:
Beyond the hire signal, determine where this candidate sits in the broader ecosystem.
- ecosystem_readiness: one of READY_FOR_EMPLOYMENT | READY_FOR_PROGRAMME | NEEDS_MENTORING | NOT_READY
  - READY_FOR_EMPLOYMENT: strong performance, no critical gaps
  - READY_FOR_PROGRAMME: competent but needs structured upskilling before employment
  - NEEDS_MENTORING: clear skill gaps that a mentor can address in 1-on-1 sessions
  - NOT_READY: fundamental gaps, needs foundational training first
- programme_fit_tags: 2–4 short standardized tags for programme-matching engines
  (e.g. "pre-employment", "hrdc-upskilling", "safety-remediation", "advanced-track", "entry-level")
- mentoring_needs: for each missing/weak skill, produce a structured gap record
- linkage_signals: structured facts for automated ecosystem matching

KEY ACTION SCORING:
For every notable action recorded, assign:
- significance: HIGH (correct, complete, skilled execution — demonstrates mastery), MEDIUM (adequate but routine), LOW (partial, transitional, or unclear)
- score: 0–100 matching the quality of that specific action
  - HIGH → 80–100: precise technique, correct tool use, clean completion
  - MEDIUM → 50–79: acceptable but not exemplary
  - LOW → 0–49: incomplete, poor technique, or uncertain

Key action scores are weighted directly into the candidate's Technical score.
Include only actions with confidence ≥ 0.65 in key_actions (exclude HANDS_ONLY/NO_ACTION).

OUTPUT — return ONLY valid JSON:
{
  "certified": true,
  "verdict": "CONFIRMED|PARTIAL|INCONSISTENT",
  "summary": "2-3 sentences for formal certificate. Be specific.",
  "verdict_rationale": "One sentence citing specific evidence.",
  "reasons": ["Reason 1", "Reason 2"],
  "total_qualifying_actions": 0,
  "key_actions": [
    {
      "timestamp": "HH:MM:SS",
      "action": "description",
      "significance": "HIGH|MEDIUM|LOW",
      "score": 0
    }
  ],
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
  "employer_summary": "3-5 sentences for hiring manager.",
  "ecosystem_readiness": "READY_FOR_EMPLOYMENT|READY_FOR_PROGRAMME|NEEDS_MENTORING|NOT_READY",
  "programme_fit_tags": ["pre-employment", "hrdc-upskilling"],
  "mentoring_needs": [
    { "skill_gap": "skill name", "priority": "HIGH|MEDIUM|LOW", "suggested_intervention": "one sentence" }
  ],
  "linkage_signals": {
    "can_mentor_others_in": ["skills this candidate can already teach"],
    "requires_mentor_for": ["skills needing 1-on-1 development"],
    "eligible_programme_types": ["Pre-Employment|Upskilling|Certification Track|Remediation"]
  }
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

export interface SessionEvaluation {
  certified: boolean;
  verdict: "CONFIRMED" | "PARTIAL" | "INCONSISTENT";
  summary: string;
  verdict_rationale: string;
  reasons: string[];
  total_qualifying_actions: number;
  key_actions: Array<{ timestamp: string; action: string; significance: string; score: number }>;
  criteria: Array<{ name: string; score: number; pass: boolean; justification: string }>;
  skills_matched: string[];
  skills_missing: string[];
  employer_summary: string;
  ecosystem_readiness: "READY_FOR_EMPLOYMENT" | "READY_FOR_PROGRAMME" | "NEEDS_MENTORING" | "NOT_READY" | null;
  programme_fit_tags: string[];
  mentoring_needs: Array<{ skill_gap: string; priority: string; suggested_intervention: string }>;
  linkage_signals: {
    can_mentor_others_in: string[];
    requires_mentor_for: string[];
    eligible_programme_types: string[];
  } | null;
}

export interface SafetyReport {
  overall_safety_level: "EXCELLENT" | "GOOD" | "NEEDS_IMPROVEMENT" | "UNSAFE";
  overall_score: number;
  session_summary: string;
  strengths: string[];
  areas_for_improvement: Array<{ area: string; observation: string; recommendation: string }>;
  lecturer_closing_remark: string;
}

// ─── Logic: Session Evaluation ───────────────────────────────────────────────
export async function evaluateSession(
  logText: string,
  taskClaim: string,
  flagCount: number,
  jobPostingSkills?: string[]
): Promise<SessionEvaluation> {
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
    verdict: (raw.verdict as SessionEvaluation["verdict"]) ?? "INCONSISTENT",
    summary: (raw.summary as string) ?? "",
    verdict_rationale: (raw.verdict_rationale as string) ?? "",
    reasons: (raw.reasons as string[]) ?? [],
    total_qualifying_actions: Number(raw.total_qualifying_actions ?? 0),
    key_actions: (raw.key_actions as SessionEvaluation["key_actions"]) ?? [],
    criteria: (raw.criteria as SessionEvaluation["criteria"]) ?? [],
    skills_matched: (raw.skills_matched as string[]) ?? [],
    skills_missing: (raw.skills_missing as string[]) ?? [],
    employer_summary: (raw.employer_summary as string) ?? "",
    ecosystem_readiness: (raw.ecosystem_readiness as SessionEvaluation["ecosystem_readiness"]) ?? null,
    programme_fit_tags: (raw.programme_fit_tags as string[]) ?? [],
    mentoring_needs: (raw.mentoring_needs as SessionEvaluation["mentoring_needs"]) ?? [],
    linkage_signals: (raw.linkage_signals as SessionEvaluation["linkage_signals"]) ?? null,
  };
}

// ─── Logic: Safety Report Synthesis ──────────────────────────────────────────
export async function synthesizeSafetyReport(
  observations: Record<string, unknown>[]
): Promise<SafetyReport> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  const prompt =
    SAFETY_REPORT_PROMPT +
    "\n\nOBSERVATIONS:\n" +
    JSON.stringify(observations, null, 2);
  const result = await model.generateContent(prompt);
  const raw = parseJSON(result.response.text());

  return {
    overall_safety_level: (raw.overall_safety_level as SafetyReport["overall_safety_level"]) ?? "NEEDS_IMPROVEMENT",
    overall_score: Number(raw.overall_score ?? 0),
    session_summary: (raw.session_summary as string) ?? "",
    strengths: (raw.strengths as string[]) ?? [],
    areas_for_improvement: (raw.areas_for_improvement as SafetyReport["areas_for_improvement"]) ?? [],
    lecturer_closing_remark: (raw.lecturer_closing_remark as string) ?? "",
  };
}
