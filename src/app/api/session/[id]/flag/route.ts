import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, arrayUnion } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { reason, timestamp } = body;

    await updateDoc(doc(db, "sessions", id), {
      flagCount: increment(1),
      flagEvents: arrayUnion({ reason, timestamp: timestamp ?? new Date().toISOString() }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("flag error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
