import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { processSession } from "@/lib/pipeline";

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await updateDoc(doc(db, "sessions", id), {
      status: "PROCESSING",
      sessionEnd: serverTimestamp(),
    });

    // Run pipeline async — don't await so we can return 200 immediately
    processSession(id).catch((e) =>
      console.error("processSession failed:", e)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("recording-end error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
