import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const snap = await getDoc(doc(db, "sessions", id));
    if (!snap.exists()) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const data = snap.data();
    return NextResponse.json({
      status: data.status,
      certificateId: data.certificateId ?? null,
      flagCount: data.flagCount ?? 0,
    });
  } catch (err) {
    console.error("status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
