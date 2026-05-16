import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore/lite";
import { Shield, CheckCircle, XCircle, Hash, Layers, Users, BookOpen, Briefcase } from "lucide-react";
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
  significance?: "HIGH" | "MEDIUM" | "LOW";
  score?: number;
}

interface MentoringNeed {
  skill_gap: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  suggested_intervention: string;
}

interface LinkageSignals {
  can_mentor_others_in: string[];
  requires_mentor_for: string[];
  eligible_programme_types: string[];
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
  criticalViolationCount?: number;
  liveWireContactDetected?: boolean;
  hireSignal?: string;
  employerScore?: number;
  ecosystemScore?: number;
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
  ecosystemReadiness?: "READY_FOR_EMPLOYMENT" | "READY_FOR_PROGRAMME" | "NEEDS_MENTORING" | "NOT_READY";
  programmeFitTags?: string[];
  mentoringNeeds?: MentoringNeed[];
  linkageSignals?: LinkageSignals;
  safetyLevel?: "EXCELLENT" | "GOOD" | "NEEDS_IMPROVEMENT" | "UNSAFE";
  safetySummary?: string;
  safetyStrengths?: string[];
  safetyAreasForImprovement?: { area: string; observation: string; recommendation: string }[];
  safetyClosingRemark?: string;
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
        <div className="border border-white/10 rounded-2xl p-10 mb-8 bg-white/[0.01]">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">
            Certificate of Verified Competence
          </div>
          <h1 className="text-4xl font-bold mb-6">{cert.projectTitle}</h1>
          <div className="grid grid-cols-2 gap-6 text-lg">
            <div>
              <span className="text-gray-500 text-sm block mb-1">Candidate</span>
              <div className="font-semibold text-xl">{cert.workerName}</div>
            </div>
            {formattedDate && (
              <div>
                <span className="text-gray-500 text-sm block mb-1">Date Issued</span>
                <div className="font-semibold text-xl">{formattedDate}</div>
              </div>
            )}
            {cert.roleTargeted && (
              <div className="col-span-2 mt-2">
                <span className="text-gray-500 text-sm block mb-1">Role Targeted</span>
                <div className="font-semibold">{cert.roleTargeted}</div>
              </div>
            )}
          </div>
        </div>

        {/* Grade + Hire signal */}
        {cert.grade && (
          <div className="flex gap-6 mb-8">
            <div className="flex-1 border border-white/10 rounded-xl p-8 text-center bg-white/[0.01]">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Composite Score</div>
              <div className={`text-7xl font-bold mb-2 ${GRADE_COLOURS[cert.grade] ?? ""}`}>
                {cert.grade}
              </div>
              <div className="text-2xl font-mono">{cert.compositeScore} / 100</div>
            </div>
            {cert.hireSignal && (
              <div className="flex-1 border border-white/10 rounded-xl p-8 text-center bg-white/[0.01] flex flex-col justify-center">
                <div className="text-xs uppercase tracking-widest text-gray-500 mb-4">Hire Signal</div>
                <div
                  className={`inline-block px-6 py-3 rounded-lg border text-xl font-bold ${
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
          <div className={`mb-8 p-6 rounded-xl border ${
            cert.liveWireContactDetected
              ? "border-red-700/60 bg-red-950/40 text-red-300"
              : (cert.criticalViolationCount ?? 0) > 0
              ? "border-red-700/50 bg-red-900/20 text-red-300"
              : "border-orange-700/50 bg-orange-900/20 text-orange-300"
          }`}>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">
                  {cert.liveWireContactDetected
                    ? "Critical Violation: Live Wire Contact Detected — grade capped at D"
                    : (cert.criticalViolationCount ?? 0) > 0
                    ? `Critical Violation${(cert.criticalViolationCount ?? 0) > 1 ? "s" : ""} Detected (${cert.criticalViolationCount}) — grade capped at D`
                    : `Safety score (${cert.safetyScore}/100) below threshold — grade capped at D`}
                </div>
                {cert.liveWireContactDetected && (
                  <div className="text-sm opacity-80">Bare hand or uninsulated probe contact with an exposed conductor was detected during this session.</div>
                )}
                {!cert.liveWireContactDetected && (cert.criticalViolationCount ?? 0) > 0 && (
                  <div className="text-sm opacity-80">Sharp tool blade or tip was detected in immediate contact range of bare skin during this session.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Score breakdown */}
        {cert.technicalScore != null && (
          <div className="border border-white/10 rounded-xl p-8 mb-8 bg-white/[0.01]">
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs uppercase tracking-widest text-gray-500">Score Breakdown</div>
              <div className="text-xs text-gray-600">composite {cert.compositeScore}/100</div>
            </div>
            <div className="space-y-5">
              <ScoreBar
                label="Technical"
                score={cert.technicalScore ?? 0}
                weight="45%"
                colour="bg-teal-500"
              />
              <ScoreBar
                label="Employer"
                score={cert.employerScore ?? 0}
                weight="20%"
                colour="bg-violet-500"
              />
              <ScoreBar
                label="Safety"
                score={cert.safetyScore ?? 0}
                weight="25%"
                colour="bg-green-500"
              />
              <ScoreBar
                label="Ecosystem"
                score={cert.ecosystemScore ?? 0}
                weight="10%"
                colour="bg-indigo-400"
              />
            </div>
            <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div>
                <span className="text-gray-500 font-medium">Technical</span> — benchmark criteria scores + pass rate
              </div>
              <div>
                <span className="text-gray-500 font-medium">Employer</span> — verdict strength + evidence depth
              </div>
              <div>
                <span className="text-gray-500 font-medium">Safety</span> — per-frame safety assessments
              </div>
              <div>
                <span className="text-gray-500 font-medium">Ecosystem</span> — AI readiness classification
              </div>
            </div>
          </div>
        )}

        {/* Skills */}
        {((cert.skillsMatched?.length ?? 0) > 0 || (cert.skillsMissing?.length ?? 0) > 0) && (
          <div className="border border-white/10 rounded-xl p-8 mb-8 bg-white/[0.01]">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-6">Skills Assessed</div>
            <div className="flex flex-wrap gap-4">
              {cert.skillsMatched?.map((s) => (
                <span key={s} className="text-lg bg-green-900/30 text-green-400 border border-green-800 rounded-full px-5 py-2 flex items-center gap-3">
                  <CheckCircle className="size-5" /> {s}
                </span>
              ))}
              {cert.skillsMissing?.map((s) => (
                <span key={s} className="text-lg bg-amber-900/30 text-amber-400 border border-amber-800 rounded-full px-5 py-2 flex items-center gap-3">
                  <XCircle className="size-5" /> {s}
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
          <div className="border-l-4 border-teal-500 pl-6 mb-8">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Employer Summary</div>
            <p className="text-xl text-gray-200 leading-relaxed font-medium">{cert.employerSummary}</p>
          </div>
        )}

        {/* Safety Summary */}
        {cert.safetySummary && (() => {
          const levelStyles: Record<string, string> = {
            EXCELLENT: "border-green-700/50 bg-green-950/20 text-green-400",
            GOOD: "border-teal-700/50 bg-teal-950/20 text-teal-400",
            NEEDS_IMPROVEMENT: "border-amber-700/50 bg-amber-950/20 text-amber-400",
            UNSAFE: "border-red-700/50 bg-red-950/20 text-red-400",
          };
          const level = cert.safetyLevel ?? "GOOD";
          const borderColour = {
            EXCELLENT: "border-green-700/40",
            GOOD: "border-teal-700/40",
            NEEDS_IMPROVEMENT: "border-amber-700/40",
            UNSAFE: "border-red-700/40",
          }[level] ?? "border-white/10";

          return (
            <div className={`border rounded-xl p-8 mb-8 bg-white/[0.01] ${borderColour}`}>
              <div className="flex items-center justify-between mb-5">
                <div className="text-xs uppercase tracking-widest text-gray-500">Safety Summary</div>
                {cert.safetyLevel && (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${levelStyles[cert.safetyLevel] ?? ""}`}>
                    {cert.safetyLevel.replace("_", " ")}
                  </span>
                )}
              </div>

              <p className="text-lg text-gray-300 leading-relaxed mb-6">{cert.safetySummary}</p>

              {(cert.safetyStrengths?.length ?? 0) > 0 && (
                <div className="mb-5">
                  <div className="text-xs text-gray-500 mb-2">Strengths</div>
                  <ul className="space-y-1.5">
                    {cert.safetyStrengths?.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle className="size-4 text-green-400 shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(cert.safetyAreasForImprovement?.length ?? 0) > 0 && (
                <div className="mb-5">
                  <div className="text-xs text-gray-500 mb-2">Areas for Improvement</div>
                  <div className="space-y-3">
                    {cert.safetyAreasForImprovement?.map((a, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="text-sm font-medium text-amber-400 mb-1">{a.area}</div>
                        <div className="text-xs text-gray-400">{a.observation}</div>
                        <div className="text-xs text-gray-500 mt-1 italic">{a.recommendation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cert.safetyClosingRemark && (
                <p className="text-sm text-gray-500 italic border-t border-white/5 pt-4">{cert.safetyClosingRemark}</p>
              )}
            </div>
          );
        })()}

        {/* Key actions */}
        {(cert.keyActions?.length ?? 0) > 0 && (() => {
          const sigStyles = {
            HIGH: { badge: "bg-green-900/40 text-green-400 border-green-700/50", dot: "bg-green-400" },
            MEDIUM: { badge: "bg-amber-900/40 text-amber-400 border-amber-700/50", dot: "bg-amber-400" },
            LOW: { badge: "bg-gray-800 text-gray-400 border-white/10", dot: "bg-gray-500" },
          };
          const scored = cert.keyActions?.filter((a) => typeof a.score === "number") ?? [];
          const avg = scored.length > 0
            ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length)
            : null;

          return (
            <div className="border border-white/10 rounded-xl p-8 mb-8 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-5">
                <div className="text-xs uppercase tracking-widest text-gray-500">Key Actions Log</div>
                {avg !== null && (
                  <div className="text-xs text-gray-500">
                    avg score <span className="font-mono text-teal-400 font-bold">{avg}/100</span>
                    <span className="text-gray-700 ml-2">· contributes to Technical score</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {cert.keyActions?.map((a, i) => {
                  const style = sigStyles[a.significance ?? "MEDIUM"];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className="font-mono text-teal-400 shrink-0 font-bold text-sm pt-0.5 w-20">{a.timestamp}</span>
                      <div className="flex-1 flex items-start gap-2 min-w-0">
                        <span className="text-gray-300 text-sm leading-relaxed">{a.action}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.significance && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${style.badge}`}>
                            {a.significance}
                          </span>
                        )}
                        {typeof a.score === "number" && (
                          <span className="font-mono text-xs text-gray-400 w-12 text-right">{a.score}/100</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Ecosystem Linkage */}
        {(cert.ecosystemReadiness || (cert.programmeFitTags?.length ?? 0) > 0 || cert.linkageSignals || (cert.mentoringNeeds?.length ?? 0) > 0) && (
          <div className="border border-indigo-700/40 rounded-xl p-8 mb-8 bg-indigo-950/20">
            <div className="text-xs uppercase tracking-widest text-indigo-400 mb-6">Ecosystem Linkage Status</div>

            {/* Readiness badge */}
            {cert.ecosystemReadiness && (
              <div className="flex items-center gap-3 mb-6">
                <Layers className="size-5 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Readiness Level</div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
                    cert.ecosystemReadiness === "READY_FOR_EMPLOYMENT"
                      ? "bg-green-900/30 text-green-400 border-green-700/50"
                      : cert.ecosystemReadiness === "READY_FOR_PROGRAMME"
                      ? "bg-teal-900/30 text-teal-400 border-teal-700/50"
                      : cert.ecosystemReadiness === "NEEDS_MENTORING"
                      ? "bg-amber-900/30 text-amber-400 border-amber-700/50"
                      : "bg-red-900/30 text-red-400 border-red-700/50"
                  }`}>
                    {cert.ecosystemReadiness.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            )}

            {/* Programme fit tags */}
            {(cert.programmeFitTags?.length ?? 0) > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Briefcase className="size-3.5" /> Programme Tracks
                </div>
                <div className="flex flex-wrap gap-2">
                  {cert.programmeFitTags?.map((tag) => (
                    <span key={tag} className="text-xs bg-indigo-900/30 text-indigo-300 border border-indigo-700/40 rounded-full px-3 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Linkage signals */}
            {cert.linkageSignals && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {(cert.linkageSignals.can_mentor_others_in?.length ?? 0) > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <Users className="size-3.5" /> Can Mentor Others In
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cert.linkageSignals.can_mentor_others_in.map((s) => (
                        <span key={s} className="text-xs bg-green-900/20 text-green-400 border border-green-800/40 rounded px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(cert.linkageSignals.requires_mentor_for?.length ?? 0) > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <BookOpen className="size-3.5" /> Requires Mentor For
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cert.linkageSignals.requires_mentor_for.map((s) => (
                        <span key={s} className="text-xs bg-amber-900/20 text-amber-400 border border-amber-800/40 rounded px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mentoring needs */}
            {(cert.mentoringNeeds?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-3">Mentoring Interventions</div>
                <div className="space-y-3">
                  {cert.mentoringNeeds?.map((need, i) => (
                    <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${
                        need.priority === "HIGH"
                          ? "bg-red-900/40 text-red-400"
                          : need.priority === "MEDIUM"
                          ? "bg-amber-900/40 text-amber-400"
                          : "bg-gray-800 text-gray-400"
                      }`}>
                        {need.priority}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-200">{need.skill_gap}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{need.suggested_intervention}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer / integrity */}
        <div className="border-t border-white/10 pt-8 mt-12">
          <div className="flex flex-wrap items-center justify-between gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <Hash className="size-4" />
              <span className="font-mono truncate max-w-sm">{cert.sessionHash}</span>
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
