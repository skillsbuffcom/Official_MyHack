import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { Award, Shield, Calendar, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

interface CertCard {
  id: string;
  projectTitle: string;
  roleTargeted: string | null;
  grade: string;
  compositeScore: number;
  safetyScore: number;
  verdict: string;
  hireSignal: string;
  skillsMatched: string[];
  issuedAt: Timestamp | null;
  workerName: string;
}

const GRADE_COLOURS: Record<string, string> = {
  A: "text-green-400 border-green-700/50 bg-green-900/20",
  B: "text-teal-400 border-teal-700/50 bg-teal-900/20",
  C: "text-amber-400 border-amber-700/50 bg-amber-900/20",
  D: "text-orange-400 border-orange-700/50 bg-orange-900/20",
  F: "text-red-400 border-red-700/50 bg-red-900/20",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workerId: string }>;
}): Promise<Metadata> {
  const { workerId } = await params;
  try {
    const q = query(
      collection(db, "certificates"),
      where("workerId", "==", workerId),
      orderBy("issuedAt", "desc")
    );
    const snap = await getDocs(q);
    const name = snap.docs[0]?.data()?.workerName ?? "Candidate";
    return { title: `${name} — VeriPro Portfolio` };
  } catch {
    return { title: "VeriPro Portfolio" };
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  let certs: CertCard[] = [];
  let workerName = "";

  try {
    const q = query(
      collection(db, "certificates"),
      where("workerId", "==", workerId),
      orderBy("issuedAt", "desc")
    );
    const snap = await getDocs(q);
    certs = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        projectTitle: data.projectTitle,
        roleTargeted: data.roleTargeted ?? null,
        grade: data.grade ?? "?",
        compositeScore: data.compositeScore ?? 0,
        safetyScore: data.safetyScore ?? 0,
        verdict: data.verdict ?? "",
        hireSignal: data.hireSignal ?? "",
        skillsMatched: data.skillsMatched ?? [],
        issuedAt: data.issuedAt ?? null,
        workerName: data.workerName ?? "",
      };
    });
    workerName = certs[0]?.workerName ?? "";
  } catch (e) {
    console.error("Profile page error:", e);
  }

  const memberSince =
    certs.length > 0 && certs[certs.length - 1].issuedAt
      ? (certs[certs.length - 1].issuedAt as Timestamp).toDate().toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })
      : null;

  if (certs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center flex-col gap-4">
        <Award className="w-12 h-12 text-gray-700" />
        <p className="text-gray-500">No verified certificates found for this profile.</p>
        <Link href="/intake" className="text-teal-400 hover:underline text-sm">
          Start your first assessment →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">VeriPro Portfolio</div>
            <h1 className="text-3xl font-bold">{workerName}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                {certs.length} verified certificate{certs.length !== 1 ? "s" : ""}
              </span>
              {memberSince && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Member since {memberSince}
                </span>
              )}
            </div>
          </div>
          <CopyLinkButton workerId={workerId} />
        </div>

        {/* Cert cards */}
        <div className="space-y-4">
          {certs.map((cert) => (
            <div
              key={cert.id}
              className="p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {cert.roleTargeted && (
                    <div className="text-xs text-gray-500 mb-1">{cert.roleTargeted}</div>
                  )}
                  <h2 className="font-semibold text-lg leading-tight">{cert.projectTitle}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded border ${cert.hireSignal === "Strong Hire" || cert.hireSignal === "Hire"
                        ? "text-teal-400 border-teal-700/50 bg-teal-900/20"
                        : "text-gray-400 border-white/10 bg-white/5"
                      }`}
                    >
                      {cert.hireSignal}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Safety {cert.safetyScore}/100
                    </span>
                    {cert.issuedAt && (
                      <span>
                        {(cert.issuedAt as Timestamp).toDate().toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {cert.skillsMatched.length > 0 && (
                      <span>{cert.skillsMatched.length} skills matched</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`text-3xl font-bold w-14 h-14 rounded-xl border flex items-center justify-center ${
                      GRADE_COLOURS[cert.grade] ?? "text-gray-400 border-white/10"
                    }`}
                  >
                    {cert.grade}
                  </div>
                  <Link
                    href={`/certificate/${cert.id}`}
                    className="flex items-center gap-1 text-sm text-teal-400 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CopyLinkButton({ workerId }: { workerId: string }) {
  // Client-side component for copy — use a client boundary
  return (
    <button
      onClick={undefined}
      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg px-4 py-2 transition-colors"
    >
      <Copy className="w-4 h-4" />
      Copy Link
    </button>
  );
}
