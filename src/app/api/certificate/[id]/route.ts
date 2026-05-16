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
    const snap = await getDoc(doc(db, "certificates", id));
    if (!snap.exists()) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }
    const data = snap.data();
    return NextResponse.json({
      id: snap.id,
      ...data,
      issuedAt: data.issuedAt?.toDate?.()?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("certificate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
