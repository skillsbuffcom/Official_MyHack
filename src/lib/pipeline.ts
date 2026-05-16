import { db } from "@/lib/firebase";
import { evaluateSession, synthesizeSafetyReport } from "@/lib/gemini";
import {
  computeComposite,
  computeGrade,
  computeHireSignal,
} from "@/lib/scoring";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore/lite";
import crypto from "crypto";

async function setSessionStatus(sessionId: string, status: string) {
  await updateDoc(doc(db, "sessions", sessionId), { status });
}

function buildActionLog(events: Record<string, unknown>[]): string {
  return events
    .map((e) => {
      const safety = e.safetyAssessment as Record<string, unknown> | undefined;
      const ppe = e.ppeCheck as Record<string, unknown> | undefined;
      const wq = e.workQuality as Record<string, unknown> | undefined;
      return (
        `[${e.timestamp}] ${e.action} (conf:${e.confidence}) — ${e.description}` +
        (safety ? ` | Safety:${safety.level} — ${safety.observation}` : "") +
        (ppe ? ` | PPE:${ppe.gloves_worn}` : "") +
        (wq ? ` | Quality:${wq.rating}` : "")
      );
    })
    .join("\n");
}

export async function processSession(sessionId: string) {
  try {
    await setSessionStatus(sessionId, "PROCESSING");

    // Load session
    const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
    if (!sessionSnap.exists()) throw new Error("Session not found");
    const session = sessionSnap.data() as Record<string, unknown>;

    // Load action events
    await setSessionStatus(sessionId, "DETECTING_ACTIONS");
    const eventsSnap = await getDocs(
      collection(db, "sessions", sessionId, "actionEvents")
    );
    const actionEvents = eventsSnap.docs.map((d) => d.data() as Record<string, unknown>);

    // Fetch job posting skills if available
    let jobPostingSkills: string[] | undefined;
    if (session.jobPostingId) {
      const postingSnap = await getDoc(
        doc(db, "jobPostings", session.jobPostingId as string)
      );
      if (postingSnap.exists()) {
        const posting = postingSnap.data();
        jobPostingSkills = posting.requiredSkills as string[];
      }
    }

    // Build log text
    const logText = buildActionLog(actionEvents);

    // Evaluate session with Gemini
    await setSessionStatus(sessionId, "SYNTHESISING");
    const evaluation = await evaluateSession(
      logText,
      session.taskClaim as string,
      (session.flagCount as number) ?? 0,
      jobPostingSkills
    );

    // Hard block on too many flags
    if ((session.flagCount as number) > 3) {
      await writeResult(sessionId, session, {
        ...evaluation,
        verdict: "INCONSISTENT",
        certified: false,
      }, actionEvents);
      return;
    }

    await writeResult(sessionId, session, evaluation, actionEvents);
  } catch (err) {
    console.error("processSession error:", err);
    await setSessionStatus(sessionId, "FAILED");
  }
}

async function writeResult(
  sessionId: string,
  session: Record<string, unknown>,
  evaluation: Awaited<ReturnType<typeof evaluateSession>>,
  actionEvents: Record<string, unknown>[]
) {
  await setSessionStatus(sessionId, "WRITING_CERTIFICATE");

  // Compute T from criteria
  const T =
    evaluation.criteria?.length
      ? evaluation.criteria.reduce((sum, c) => sum + c.score, 0) /
        evaluation.criteria.length
      : 0;

  // Deterministic sub-scores from frame data
  const { S, Q, composite, safetyCapped } = computeComposite(T, actionEvents);

  const grade = computeGrade(composite, safetyCapped);
  const hireSignal = computeHireSignal(evaluation.verdict, composite, safetyCapped);

  const issuedAt = new Date().toISOString();

  const issuedFieldsSnapshot = {
    candidateId: session.workerId,
    sessionId,
    grade,
    compositeScore: Math.round(composite),
    technicalScore: Math.round(T),
    safetyScore: Math.round(S),
    workQualityScore: Math.round(Q),
    safetyCapped,
    skillsMatched: evaluation.skills_matched ?? [],
    benchmarkResults: evaluation.criteria ?? [],
    issuedAt,
  };

  const sessionHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(issuedFieldsSnapshot))
    .digest("hex");

  const certRef = doc(collection(db, "certificates"));
  await setDoc(certRef, {
    sessionId,
    workerId: session.workerId,
    workerName: session.workerName,
    trade: session.trade,
    roleTargeted: session.roleTargeted ?? null,
    projectTitle: session.taskClaim,
    verdict: evaluation.verdict,
    grade,
    compositeScore: Math.round(composite),
    technicalScore: Math.round(T),
    safetyScore: Math.round(S),
    workQualityScore: Math.round(Q),
    safetyCapped,
    hireSignal,
    skillsMatched: evaluation.skills_matched ?? [],
    skillsMissing: evaluation.skills_missing ?? [],
    verdictRationale: evaluation.verdict_rationale,
    sessionSummary: evaluation.summary,
    employerSummary: evaluation.employer_summary ?? null,
    keyActions: evaluation.key_actions ?? [],
    benchmarkResults: evaluation.criteria ?? [],
    totalInteractions: evaluation.total_qualifying_actions,
    issuedFieldsSnapshot,
    sessionHash,
    issuedAt: serverTimestamp(),
  });

  // Generate safety report separately
  const safetyObs = actionEvents
    .filter((e) => (e.safetyAssessment as Record<string, unknown>)?.level)
    .map((e) => ({
      timestamp: e.timestamp,
      action: e.action,
      level: (e.safetyAssessment as Record<string, unknown>).level,
      observation: (e.safetyAssessment as Record<string, unknown>).observation,
      improvement_tip: (e.safetyAssessment as Record<string, unknown>).improvement_tip,
      ppe_check: e.ppeCheck,
    }));

  if (safetyObs.length > 0) {
    try {
      const safetyReport = await synthesizeSafetyReport(safetyObs);
      await setDoc(
        doc(db, "safetyReports", certRef.id),
        { ...safetyReport, sessionId, certificateId: certRef.id, createdAt: serverTimestamp() }
      );
    } catch (e) {
      console.error("Safety report generation failed:", e);
    }
  }

  await updateDoc(doc(db, "sessions", sessionId), {
    status: "COMPLETE",
    certificateId: certRef.id,
  });
}
