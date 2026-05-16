import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Lightweight endpoint — MediaPipe runs client-side.
// This route exists for server-side logging / future extension.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ ok: true, received: !!body });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
