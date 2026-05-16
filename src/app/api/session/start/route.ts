import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore/lite";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workerName, icNumber, taskClaim, trade, jobPostingId, roleTargeted } = body;

    if (!workerName || !icNumber || !taskClaim) {
      return NextResponse.json(
        { error: "workerName, icNumber, taskClaim are required" },
        { status: 400 }
      );
    }

    const workerId = icNumber.startsWith("DEMO-") 
      ? icNumber 
      : crypto.createHash("sha256").update(icNumber).digest("hex");

    const docRef = await addDoc(collection(db, "sessions"), {
      workerId,
      workerName,
      icNumber: icNumber.startsWith("DEMO-") 
        ? icNumber 
        : crypto.createHash("sha256").update(icNumber).digest("hex"),
      taskClaim,
      trade: trade ?? "ELECTRICAL_WIRING",
      jobPostingId: jobPostingId ?? null,
      roleTargeted: roleTargeted ?? null,
      status: "PENDING",
      flagCount: 0,
      flagEvents: [],
      uploadedChunks: 0,
      sessionStart: serverTimestamp(),
    });

    return NextResponse.json({ sessionId: docRef.id, workerId });
  } catch (err) {
    console.error("session/start error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
