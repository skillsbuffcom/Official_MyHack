import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore/lite";
import { parseJSON } from "@/lib/gemini";

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

CRITICAL: Respond ONLY with valid JSON. Ensure all arrays are correctly closed with brackets and no trailing commas.

Rules:
- required_skills: 3–10 items, only what is explicitly required or essential
- preferred_skills: 0–5 items, only what is explicitly listed as preferred/bonus
- Each skill: 3–6 words, specific and action-oriented (e.g. "cable termination to IEC spec")
- If you cannot extract meaningful skills from the image, return:
  { "error": "Could not extract skills — please try a clearer image or enter manually" }`;

function buildBriefPrompt(roleTitle: string, requiredSkills: string[], duration: number): string {
  const complexity = duration <= 5 ? "simple and fast" : duration <= 10 ? "moderate complexity" : "highly detailed and comprehensive";
  
  return `You are VeriPro's Assessment Generator.
Generate a hands-on practical project brief for a candidate applying for this role.

Role: ${roleTitle}
Required skills to assess: ${requiredSkills.join(", ")}
Target Duration: ${duration} minutes
Complexity level: ${complexity}

The project must:
- Be strictly completable at a workbench in ${duration} minutes
- Test 3–5 of the required skills through physical action
- Require tools and components a training lab would have
- Produce a visible, verifiable output (e.g. a wired terminal block, a tested circuit)

Return ONLY valid JSON:

{
  "project_title": "Short title (5-8 words)",
  "task_description": "2-3 sentences. Exactly what the candidate must do, step by step. Be specific about components and actions.",
  "materials_needed": ["component or tool 1", "component or tool 2"],
  "expected_duration_minutes": ${duration},
  "skills_being_tested": ["skill from required_skills list", "..."]
}`;
}

export async function POST(req: NextRequest) {
  try {
    let roleTitle: string | null = null;
    let requiredSkills: string[] = [];
    let preferredSkills: string[] = [];
    let rawDescription: string | null = null;
    let duration = 15;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      roleTitle = body.roleTitle;
      requiredSkills = body.requiredSkills || [];
      duration = body.duration || 15;
      rawDescription = "Manually entered skills";
    } else {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      duration = Number(formData.get("duration") || 15);

      if (!file) {
        return NextResponse.json({ error: "No image provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = file.type as "image/png" | "image/jpeg" | "application/pdf";

      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              role_title: { type: SchemaType.STRING },
              required_skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              preferred_skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              raw_description: { type: SchemaType.STRING }
            },
            required: ["role_title", "required_skills", "raw_description"]
          }
        }
      });

      const extractResult = await model.generateContent([
        { inlineData: { data: base64, mimeType } },
        JOB_INTAKE_PROMPT,
      ]);
      const extracted = parseJSON(extractResult.response.text());

      if (!extracted.role_title) {
        return NextResponse.json({ error: "Failed to extract skills" }, { status: 422 });
      }

      roleTitle = extracted.role_title;
      requiredSkills = extracted.required_skills;
      preferredSkills = extracted.preferred_skills ?? [];
      rawDescription = extracted.raw_description;
    }

    // Call 2: project brief
    const briefModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            project_title: { type: SchemaType.STRING },
            task_description: { type: SchemaType.STRING },
            materials_needed: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            expected_duration_minutes: { type: SchemaType.NUMBER },
            skills_being_tested: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          },
          required: ["project_title", "task_description", "materials_needed", "expected_duration_minutes", "skills_being_tested"]
        }
      }
    });

    const briefResult = await briefModel.generateContent(
      buildBriefPrompt(roleTitle as string, requiredSkills, duration)
    );
    const brief = parseJSON(briefResult.response.text());

    if (!brief.project_title) {
      return NextResponse.json({ error: "Failed to generate brief" }, { status: 422 });
    }

    const docRef = await addDoc(collection(db, "jobPostings"), {
      roleTitle,
      requiredSkills,
      preferredSkills,
      rawDescription,
      projectTitle: brief.project_title,
      projectBrief: brief,
      targetDuration: duration,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      id: docRef.id,
      roleTitle,
      requiredSkills,
      preferredSkills,
      rawDescription,
      projectTitle: brief.project_title,
      projectBrief: brief,
    });
  } catch (err) {
    console.error("job-intake error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
