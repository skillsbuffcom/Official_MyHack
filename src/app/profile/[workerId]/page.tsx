import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore/lite";
import { Award, Shield, Calendar, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { CopyLinkButton } from "@/components/profile/CopyLinkButton";

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

const HIRE_SIGNAL_STYLES: Record<string, string> = {
  "Strong Hire": "text-green-400 border-green-700/50 bg-green-900/20",
  "Hire": "text-teal-400 border-teal-700/50 bg-teal-900/20",
  "Needs Development": "text-amber-400 border-amber-700/50 bg-amber-900/20",
  "Not Recommended": "text-red-400 border-red-700/50 bg-red-900/20",
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
    workerName = certs[0]?.workerName ?? "Candidate";
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
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">VeriPro</Link>
          <div className="flex gap-4 text-sm text-gray-400">
            <Link href="/intake" className="hover:text-white transition-colors">Get Verified</Link>
          </div>
        </nav>
        <div className="flex items-center justify-center flex-col gap-6 text-center px-4 py-32">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <Award className="w-12 h-12 text-gray-700" />
          </div>
          <div className="max-w-xs">
            <h2 className="text-xl font-bold mb-2">No certificates yet</h2>
            <p className="text-gray-500 text-sm mb-6">Complete your first practical assessment to showcase your verified skills here.</p>
            <Link 
              href="/intake" 
              className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold px-6 py-3 rounded-lg transition-colors w-full justify-center"
            >
              Start First Assessment
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const avgSafety = Math.round(certs.reduce((acc, c) => acc + c.safetyScore, 0) / certs.length);
  const topGrade = certs.map(c => c.grade).sort()[0] || "N/A";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-950/80 backdrop-blur-md z-50">
        <Link href="/" className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">VeriPro</Link>
        <div className="flex gap-4 text-sm text-gray-400">
          <Link href="/intake" className="hover:text-white transition-colors">Get Verified</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header with Background Glow */}
        <div className="relative mb-16">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative">
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-teal-900/30 border border-teal-700/30 text-teal-400 text-[10px] font-bold uppercase tracking-wider mb-4">
                Verified Portfolio
              </div>
              <h1 className="text-5xl font-bold tracking-tight mb-4">{workerName}</h1>
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                {memberSince && (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    Member since {memberSince}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-500/50" />
                  SHA-256 Tamper-evident
                </span>
              </div>
            </div>
            <CopyLinkButton workerId={workerId} />
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Certs</div>
              <div className="text-2xl font-bold">{certs.length}</div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Top Grade</div>
              <div className="text-2xl font-bold text-teal-400">{topGrade}</div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Avg Safety</div>
              <div className="text-2xl font-bold text-green-400">{avgSafety}%</div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Verification</div>
              <div className="text-sm font-bold text-gray-300 mt-2">100% Biometric</div>
            </div>
          </div>
        </div>

        {/* Cert cards */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-400 px-1">Verification History</h2>
          {certs.map((cert) => (
            <div
              key={cert.id}
              className="group p-8 rounded-2xl border border-white/10 bg-white/[0.01] hover:border-teal-500/30 hover:bg-white/[0.02] transition-all duration-300"
            >
              <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                  <div className="flex-1">
                    {cert.roleTargeted && (
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{cert.roleTargeted}</div>
                    )}
                    <h2 className="text-2xl font-bold leading-tight group-hover:text-teal-400 transition-colors">{cert.projectTitle}</h2>
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-400">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          HIRE_SIGNAL_STYLES[cert.hireSignal] ?? "text-gray-400 border-white/10 bg-white/5"
                        }`}
                      >
                        {cert.hireSignal || "Assessed"}
                      </span>
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-600" />
                        Safety {cert.safetyScore}/100
                      </span>
                      {cert.issuedAt && (
                        <span className="text-gray-600">
                          {(cert.issuedAt as Timestamp).toDate().toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 self-stretch md:self-auto">
                    <div className="h-16 w-[1px] bg-white/5 hidden md:block" />
                    <div className="flex flex-col items-center">
                      <div
                        className={`text-4xl font-black w-20 h-20 rounded-2xl border-2 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${
                          GRADE_COLOURS[cert.grade] ?? "text-gray-400 border-white/10"
                        }`}
                      >
                        {cert.grade}
                      </div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest mt-2 font-bold">Grade</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {cert.skillsMatched.slice(0, 4).map(s => (
                      <span key={s} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/5 text-gray-400">
                        {s}
                      </span>
                    ))}
                    {cert.skillsMatched.length > 4 && (
                      <span className="text-[10px] px-2 py-1 text-gray-600">+{cert.skillsMatched.length - 4} more</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                     {/* UX Enhancement: Failure State Actions */}
                    {(cert.grade === "D" || cert.grade === "F" || cert.hireSignal === "Not Recommended" || cert.hireSignal === "Needs Development") ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href="/intake"
                          className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-2 transition-colors font-semibold text-white"
                        >
                          Retake
                        </Link>
                        <Link
                          href={`/certificate/${cert.id}#mentoring`}
                          className="text-xs bg-teal-500 text-gray-950 hover:bg-teal-400 rounded-lg px-4 py-2 transition-colors font-bold"
                        >
                          Improve Score
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/certificate/${cert.id}`}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-6 py-2 transition-colors text-sm font-semibold"
                      >
                        <ExternalLink className="w-4 h-4 text-teal-400" />
                        View Full Certificate
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

