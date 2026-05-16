import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore/lite";

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await updateDoc(doc(db, "sessions", id), {
      status: "UPLOADING",
      recordingStart: serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("recording-start error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
