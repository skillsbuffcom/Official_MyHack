import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore/lite";
import { ref, uploadBytes } from "firebase/storage";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const formData = await req.formData();
    const chunk = formData.get("chunk") as File | null;
    const chunkIndex = formData.get("chunkIndex") as string | null;

    if (!chunk || chunkIndex === null) {
      return NextResponse.json({ error: "Missing chunk or chunkIndex" }, { status: 400 });
    }

    const bytes = await chunk.arrayBuffer();
    const storageRef = ref(
      storage,
      `sessions/${id}/chunks/chunk_${chunkIndex}.webm`
    );
    await uploadBytes(storageRef, bytes, { contentType: "video/webm" });

    await updateDoc(doc(db, "sessions", id), {
      uploadedChunks: increment(1),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("upload-chunk error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
