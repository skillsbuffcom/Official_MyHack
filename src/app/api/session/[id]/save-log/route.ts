import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore/lite";

export const dynamic = 'force-dynamic';

const CONFIDENCE_GATE = 0.65;
const SKIP_ACTIONS = ["HANDS_ONLY", "NO_ACTION"];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await req.json();

    // Map the incoming Robotics-ER entry to the session database
    const isQualifying =
      body.confidence >= CONFIDENCE_GATE &&
      !SKIP_ACTIONS.includes(body.action);

    await addDoc(collection(db, "sessions", id, "actionEvents"), {
      ...body,
      isQualifying,
      recordedAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("save-log error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
