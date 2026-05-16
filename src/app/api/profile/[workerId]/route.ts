import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore/lite";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workerId: string }> }
) {
  try {
    const { workerId } = await params;

    // Query all certificates for this workerId, sorted by issuedAt desc
    const q = query(
      collection(db, "certificates"),
      where("workerId", "==", workerId),
      orderBy("issuedAt", "desc")
    );

    const snap = await getDocs(q);
    const certificates = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // If no certificates found, still return 200 with empty list
    // (the page will handle the empty state)
    return NextResponse.json({
      workerId,
      certificates,
      count: certificates.length,
      // Metadata for the profile
      displayName: certificates[0]?.workerName || "Worker Profile",
      memberSince: certificates[certificates.length - 1]?.issuedAt || null,
    });
  } catch (error) {
    console.error("Profile API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile data" },
      { status: 500 }
    );
  }
}
