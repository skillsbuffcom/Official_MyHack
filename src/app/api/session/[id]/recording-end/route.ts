import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore/lite";
import { processSession } from "@/lib/pipeline";

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await updateDoc(doc(db, "sessions", id), {
      status: "RECORDING_ENDED",
    });

    // Start background processing
    await processSession(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("recording-end error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
