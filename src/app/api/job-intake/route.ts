import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const JOB_INTAKE_PROMPT = `You are VeriPro's Job Posting Analyser.
Extract practical skills from this job posting image.

Focus ONLY on hands-on, practical, technical skills.
Ignore soft skills (teamwork, communication, leadership).
Ignore tool brand names — extract the skill (e.g. "oscilloscope use" not "Fluke 117").

Return ONLY valid JSON, no other text:

{
  "role_title": "Exact job title as written in the posting",
  "required_skills": ["skill 1", "skill 2", "skill 3"],
  "preferred_skills": ["skill 1", "skill 2"],
  "raw_description": "One sentence summarising the role and main responsibility"
}

Rules:
- required_skills: 3–10 items, only what is explicitly required or essential
- preferred_skills: 0–5 items, only what is explicitly listed as preferred/bonus
- Each skill: 3–6 words, specific and action-oriented (e.g. "cable termination to IEC spec")
- If you cannot extract meaningful skills from the image, return:
  { "error": "Could not extract skills — please try a clearer image or enter manually" }`;

function buildBriefPrompt(roleTitle: string, requiredSkills: string[]): string {
  return `You are VeriPro's Assessment Generator.
Generate a hands-on practical project brief for a candidate applying for this role.

Role: ${roleTitle}
Required skills to assess: ${requiredSkills.join(", ")}

The project must:
- Be completable at a workbench in 15–30 minutes
- Test 3–5 of the required skills through physical action
- Require tools and components a training lab would have
- Produce a visible, verifiable output (e.g. a wired terminal block, a tested circuit)

Return ONLY valid JSON:

{
  "project_title": "Short title (5-8 words)",
  "task_description": "2-3 sentences. Exactly what the candidate must do, step by step. Be specific about components and actions.",
  "materials_needed": ["component or tool 1", "component or tool 2"],
  "expected_duration_minutes": 20,
  "skills_being_tested": ["skill from required_skills list", "..."]
}`;
}

function parseJSON(text: string): Record<string, unknown> {
  return JSON.parse(text.trim().replace(/^```json\n?|\n?```$/g, ""));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type as "image/png" | "image/jpeg" | "application/pdf";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Call 1: skill extraction
    const extractResult = await model.generateContent([
      { inlineData: { data: base64, mimeType } },
      JOB_INTAKE_PROMPT,
    ]);
    const extracted = parseJSON(extractResult.response.text());

    if (extracted.error) {
      return NextResponse.json({ error: extracted.error }, { status: 422 });
    }

    // Call 2: project brief
    const briefResult = await model.generateContent(
      buildBriefPrompt(
        extracted.role_title as string,
        extracted.required_skills as string[]
      )
    );
    const brief = parseJSON(briefResult.response.text());

    // Write to Firestore
    const docRef = await addDoc(collection(db, "jobPostings"), {
      roleTitle: extracted.role_title,
      requiredSkills: extracted.required_skills,
      preferredSkills: extracted.preferred_skills ?? [],
      rawDescription: extracted.raw_description,
      projectTitle: brief.project_title,
      projectBrief: brief,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      id: docRef.id,
      roleTitle: extracted.role_title,
      requiredSkills: extracted.required_skills,
      preferredSkills: extracted.preferred_skills ?? [],
      rawDescription: extracted.raw_description,
      projectTitle: brief.project_title,
      projectBrief: brief,
    });
  } catch (err) {
    console.error("job-intake error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
