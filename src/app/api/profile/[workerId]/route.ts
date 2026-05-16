import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ workerId: string }> }
) {
  const { workerId } = await context.params;
  try {

    const q = query(
      collection(db, "certificates"),
      where("workerId", "==", workerId),
      orderBy("issuedAt", "desc")
    );

    const snap = await getDocs(q);
    const certs = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        projectTitle: data.projectTitle,
        roleTargeted: data.roleTargeted ?? null,
        grade: data.grade,
        compositeScore: data.compositeScore,
        safetyScore: data.safetyScore,
        verdict: data.verdict,
        hireSignal: data.hireSignal,
        skillsMatched: data.skillsMatched ?? [],
        issuedAt: data.issuedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    if (certs.length === 0) {
      return NextResponse.json({
        workerName: null,
        workerId,
        memberSince: null,
        totalCertificates: 0,
        certificates: [],
      });
    }

    const firstCert = snap.docs[snap.docs.length - 1].data();
    const memberSince = firstCert.issuedAt?.toDate?.()?.toISOString() ?? null;

    return NextResponse.json({
      workerName: snap.docs[0].data().workerName,
      workerId,
      memberSince,
      totalCertificates: certs.length,
      certificates: certs,
    });
  } catch (err) {
    console.error("profile route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
