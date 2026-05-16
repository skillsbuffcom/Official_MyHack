import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore/lite";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const snap = await getDoc(doc(db, "safetyReports", id));
    if (!snap.exists()) {
      return NextResponse.json({ error: "Safety report not found" }, { status: 404 });
    }
    return NextResponse.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error("safety-report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
