import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore/lite";
import { Award, Shield, Calendar, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
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
  A: "text-green-600 dark:text-green-400 border-green-200 dark:border-green-700/50 bg-green-50 dark:bg-green-900/20",
  B: "text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-700/50 bg-teal-50 dark:bg-teal-900/20",
  C: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20",
  D: "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-700/50 bg-orange-50 dark:bg-orange-900/20",
  F: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20",
};

const HIRE_SIGNAL_STYLES: Record<string, string> = {
  "Strong Hire": "text-green-600 dark:text-green-400 border-green-200 dark:border-green-700/50 bg-green-50 dark:bg-green-900/20",
  "Hire": "text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-700/50 bg-teal-50 dark:bg-teal-900/20",
  "Needs Development": "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20",
  "Not Recommended": "text-red-600 dark:text-red-400 border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20",
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
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <nav className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">VeriPro</Link>
            <div className="flex items-center gap-4">
              <Link href="/intake" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Get Verified</Link>
              <ThemeToggle />
            </div>
          </div>
        </nav>
        <div className="flex items-center justify-center flex-col gap-6 text-center px-6 py-32">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <Award className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="max-w-xs">
            <h2 className="text-xl font-bold mb-2">No certificates yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Complete your first practical assessment to showcase your verified skills here.</p>
            <Link 
              href="/intake" 
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white dark:text-gray-950 font-semibold px-6 py-3 rounded-lg transition-colors w-full justify-center shadow-lg shadow-teal-500/20"
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link href="/" className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">VeriPro</Link>
        <div className="flex items-center gap-4">
          <Link href="/intake" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Get Verified</Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header with Background Glow */}
        <div className="relative mb-16">
          <div className="absolute top-[-24px] left-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative">
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700/30 text-teal-700 dark:text-teal-400 text-[10px] font-bold uppercase tracking-wider mb-4">
                Verified Portfolio
              </div>
              <h1 className="text-5xl font-bold tracking-tight mb-4">{workerName}</h1>
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                {memberSince && (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Member since {memberSince}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-600/50 dark:text-teal-500/50" />
                  SHA-256 Tamper-evident
                </span>
              </div>
            </div>
            <CopyLinkButton workerId={workerId} />
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm dark:shadow-none">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total Certs</div>
              <div className="text-2xl font-bold">{certs.length}</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm dark:shadow-none">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Top Grade</div>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{topGrade}</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm dark:shadow-none">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Avg Safety</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{avgSafety}%</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm dark:shadow-none">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Verification</div>
              <div className="text-sm font-bold text-muted-foreground mt-2">100% Biometric</div>
            </div>
          </div>
        </div>

        {/* Cert cards */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground px-1">Verification History</h2>
          {certs.map((cert) => (
            <div
              key={cert.id}
              className="group p-8 rounded-2xl border border-border bg-card hover:border-teal-500/30 dark:hover:border-teal-500/30 transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-none"
            >
              <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                  <div className="flex-1">
                    {cert.roleTargeted && (
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{cert.roleTargeted}</div>
                    )}
                    <h2 className="text-2xl font-bold leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{cert.projectTitle}</h2>
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          HIRE_SIGNAL_STYLES[cert.hireSignal] ?? "text-muted-foreground border-border bg-muted"
                        }`}
                      >
                        {cert.hireSignal || "Assessed"}
                      </span>
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground/60" />
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
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 self-stretch md:self-auto">
                    <div className="h-16 w-[1px] bg-border hidden md:block" />
                    <div className="flex flex-col items-center">
                      <div
                        className={`text-4xl font-black w-20 h-20 rounded-2xl border-2 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${
                          GRADE_COLOURS[cert.grade] ?? "text-muted-foreground border-border"
                        }`}
                      >
                        {cert.grade}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2 font-bold">Grade</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-border">
                  <div className="flex flex-wrap gap-2">
                    {cert.skillsMatched.slice(0, 4).map(s => (
                      <span key={s} className="text-[10px] px-2 py-1 rounded bg-muted border border-border text-muted-foreground">
                        {s}
                      </span>
                    ))}
                    {cert.skillsMatched.length > 4 && (
                      <span className="text-[10px] px-2 py-1 text-muted-foreground">+{cert.skillsMatched.length - 4} more</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                     {/* UX Enhancement: Failure State Actions */}
                    {(cert.grade === "D" || cert.grade === "F" || cert.hireSignal === "Not Recommended" || cert.hireSignal === "Needs Development") ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href="/intake"
                          className="text-xs bg-muted hover:bg-border border border-border rounded-lg px-4 py-2 transition-colors font-semibold"
                        >
                          Retake
                        </Link>
                        <Link
                          href={`/certificate/${cert.id}`}
                          className="text-xs bg-teal-600 text-white hover:bg-teal-500 rounded-lg px-4 py-2 transition-colors font-bold shadow-sm"
                        >
                          View Full Certificate
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/certificate/${cert.id}`}
                        className="flex items-center gap-2 bg-muted hover:bg-border border border-border rounded-lg px-6 py-2 transition-colors text-sm font-semibold"
                      >
                        <ExternalLink className="w-4 h-4 text-teal-600 dark:text-teal-400" />
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

