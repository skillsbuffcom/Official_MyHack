import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { Shield, Award, CheckCircle, XCircle, Hash } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

interface BenchmarkResult {
  name: string;
  score: number;
  pass: boolean;
  justification: string;
}

interface KeyAction {
  timestamp: string;
  action: string;
}

interface Certificate {
  id: string;
  workerName: string;
  projectTitle: string;
  roleTargeted?: string;
  verdict: "CONFIRMED" | "PARTIAL" | "INCONSISTENT";
  grade?: string;
  compositeScore?: number;
  technicalScore?: number;
  safetyScore?: number;
  workQualityScore?: number;
  safetyCapped?: boolean;
  hireSignal?: string;
  skillsMatched?: string[];
  skillsMissing?: string[];
  benchmarkResults?: BenchmarkResult[];
  sessionSummary?: string;
  employerSummary?: string;
  keyActions?: KeyAction[];
  verdictRationale?: string;
  sessionHash?: string;
  issuedAt?: string;
  workerId?: string;
  totalInteractions?: number;
}

const VERDICT_STYLES = {
  CONFIRMED: "bg-teal-900/40 text-teal-300 border-teal-700/50",
  PARTIAL: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  INCONSISTENT: "bg-red-900/40 text-red-300 border-red-700/50",
};

const GRADE_COLOURS: Record<string, string> = {
  A: "text-green-400",
  B: "text-teal-400",
  C: "text-amber-400",
  D: "text-orange-400",
  F: "text-red-400",
};

const HIRE_COLOURS: Record<string, string> = {
  "Strong Hire": "text-green-400 bg-green-900/20 border-green-700/50",
  Hire: "text-teal-400 bg-teal-900/20 border-teal-700/50",
  "Needs Development": "text-amber-400 bg-amber-900/20 border-amber-700/50",
  "Not Recommended": "text-red-400 bg-red-900/20 border-red-700/50",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const snap = await getDoc(doc(db, "certificates", id));
  if (!snap.exists()) return { title: "Certificate Not Found — VeriPro" };
  const data = snap.data();
  return {
    title: `${data.workerName} — VeriPro Certificate`,
    description: `Verified competence certificate for ${data.projectTitle}`,
  };
}

function ScoreBar({
  label,
  score,
  weight,
  colour,
}: {
  label: string;
  score: number;
  weight: string;
  colour: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-sm text-gray-400 shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${colour} rounded-full transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="w-14 text-sm text-right font-mono">{score}/100</div>
      <div className="w-12 text-xs text-gray-600 text-right">{weight}</div>
    </div>
  );
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snap = await getDoc(doc(db, "certificates", id));
  if (!snap.exists()) notFound();

  const raw = snap.data();
  const cert: Certificate = {
    id: snap.id,
    ...raw,
    issuedAt: raw.issuedAt instanceof Timestamp
      ? raw.issuedAt.toDate().toISOString()
      : raw.issuedAt ?? null,
  } as Certificate;

  const formattedDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <span className="font-bold text-lg tracking-tight">VeriPro</span>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              VERDICT_STYLES[cert.verdict] ?? "bg-gray-800 text-gray-400 border-white/10"
            }`}
          >
            {cert.verdict}
            {cert.verdict === "CONFIRMED" && " ✓"}
          </span>
        </div>

        {/* Title block */}
        <div className="border border-white/10 rounded-2xl p-8 mb-6 bg-white/[0.01]">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">
            Certificate of Verified Competence
          </div>
          <h1 className="text-2xl font-bold mb-4">{cert.projectTitle}</h1>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Candidate</span>
              <div className="font-medium">{cert.workerName}</div>
            </div>
            {formattedDate && (
              <div>
                <span className="text-gray-500">Date Issued</span>
                <div className="font-medium">{formattedDate}</div>
              </div>
            )}
            {cert.roleTargeted && (
              <div className="col-span-2">
                <span className="text-gray-500">Role Targeted</span>
                <div className="font-medium">{cert.roleTargeted}</div>
              </div>
            )}
          </div>
        </div>

        {/* Grade + Hire signal */}
        {cert.grade && (
          <div className="flex gap-4 mb-6">
            <div className="flex-1 border border-white/10 rounded-xl p-5 text-center bg-white/[0.01]">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Composite Score</div>
              <div className={`text-5xl font-bold ${GRADE_COLOURS[cert.grade] ?? ""}`}>
                {cert.grade}
              </div>
              <div className="text-lg font-mono mt-1">{cert.compositeScore} / 100</div>
            </div>
            {cert.hireSignal && (
              <div className="flex-1 border border-white/10 rounded-xl p-5 text-center bg-white/[0.01]">
                <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Hire Signal</div>
                <div
                  className={`mt-3 inline-block px-4 py-2 rounded-lg border text-sm font-semibold ${
                    HIRE_COLOURS[cert.hireSignal] ?? ""
                  }`}
                >
                  {cert.hireSignal}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Safety cap warning */}
        {cert.safetyCapped && (
          <div className="mb-6 flex items-center gap-2 p-4 rounded-xl border border-orange-700/50 bg-orange-900/20 text-orange-300 text-sm">
            <Shield className="w-4 h-4 shrink-0" />
            Safety score ({cert.safetyScore}/100) below threshold — grade capped at D
          </div>
        )}

        {/* Score breakdown */}
        {cert.technicalScore != null && (
          <div className="border border-white/10 rounded-xl p-6 mb-6 bg-white/[0.01]">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-4">Score Breakdown</div>
            <div className="space-y-3">
              <ScoreBar label="Technical" score={cert.technicalScore ?? 0} weight="50%" colour="bg-teal-500" />
              <ScoreBar label="Safety" score={cert.safetyScore ?? 0} weight="30%" colour="bg-green-500" />
              <ScoreBar label="Work Quality" score={cert.workQualityScore ?? 0} weight="20%" colour="bg-purple-500" />
            </div>
          </div>
        )}

        {/* Skills */}
        {((cert.skillsMatched?.length ?? 0) > 0 || (cert.skillsMissing?.length ?? 0) > 0) && (
          <div className="border border-white/10 rounded-xl p-6 mb-6 bg-white/[0.01]">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Skills Assessed</div>
            <div className="flex flex-wrap gap-2">
              {cert.skillsMatched?.map((s) => (
                <span key={s} className="text-xs bg-green-900/30 text-green-400 border border-green-800 rounded-full px-3 py-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {s}
                </span>
              ))}
              {cert.skillsMissing?.map((s) => (
                <span key={s} className="text-xs bg-amber-900/30 text-amber-400 border border-amber-800 rounded-full px-3 py-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Benchmark table */}
        {(cert.benchmarkResults?.length ?? 0) > 0 && (
          <div className="border border-white/10 rounded-xl p-6 mb-6 bg-white/[0.01] overflow-x-auto">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Benchmark Breakdown</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  <th className="text-left py-2 pr-4 font-medium">Criterion</th>
                  <th className="text-right py-2 pr-4 font-medium">Score</th>
                  <th className="text-right py-2 pr-4 font-medium">Pass</th>
                  <th className="text-left py-2 font-medium">Justification</th>
                </tr>
              </thead>
              <tbody>
                {cert.benchmarkResults?.map((c, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 pr-4">{c.name}</td>
                    <td className="text-right py-2 pr-4 font-mono">{c.score}</td>
                    <td className="text-right py-2 pr-4">
                      {c.pass ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-gray-400">{c.justification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Employer summary */}
        {cert.employerSummary && (
          <div className="border-l-2 border-teal-500 pl-4 mb-6">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Employer Summary</div>
            <p className="text-sm text-gray-300 leading-relaxed">{cert.employerSummary}</p>
          </div>
        )}

        {/* Session summary */}
        {cert.sessionSummary && (
          <div className="border border-white/10 rounded-xl p-6 mb-6 bg-white/[0.01]">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Session Summary</div>
            <p className="text-sm text-gray-300 leading-relaxed">{cert.sessionSummary}</p>
            {cert.verdictRationale && (
              <p className="text-xs text-gray-500 mt-2 italic">{cert.verdictRationale}</p>
            )}
          </div>
        )}

        {/* Key actions */}
        {(cert.keyActions?.length ?? 0) > 0 && (
          <div className="border border-white/10 rounded-xl p-6 mb-6 bg-white/[0.01]">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Key Actions</div>
            <div className="space-y-2">
              {cert.keyActions?.map((a, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-teal-400 shrink-0">{a.timestamp}</span>
                  <span className="text-gray-300">{a.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer / integrity */}
        <div className="border-t border-white/10 pt-6 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Hash className="w-3 h-3" />
              <span className="font-mono truncate max-w-xs">{cert.sessionHash}</span>
            </div>
            {cert.workerId && (
              <Link
                href={`/profile/${cert.workerId}`}
                className="text-teal-400 hover:underline text-sm"
              >
                View full portfolio →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
