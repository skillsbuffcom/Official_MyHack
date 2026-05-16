import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore/lite";
import {
  Shield, CheckCircle, XCircle, Hash, ChevronRight,
  Zap, Layers, Users, BookOpen, Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CertificateClientActions } from "./client-actions";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

interface BenchmarkResult { name: string; score: number; pass: boolean; justification: string }
interface MentoringNeed { skill_gap: string; priority: "HIGH" | "MEDIUM" | "LOW"; suggested_intervention: string }
interface LinkageSignals { can_mentor_others_in: string[]; requires_mentor_for: string[]; eligible_programme_types: string[] }

interface Certificate {
  id: string; workerName: string; projectTitle: string; roleTargeted?: string;
  verdict: "CONFIRMED" | "PARTIAL" | "INCONSISTENT"; grade?: string;
  compositeScore?: number; technicalScore?: number; safetyScore?: number; workQualityScore?: number;
  safetyCapped?: boolean; criticalViolationCount?: number; liveWireContactDetected?: boolean;
  hireSignal?: string; employerScore?: number; ecosystemScore?: number;
  skillsMatched?: string[]; skillsMissing?: string[]; benchmarkResults?: BenchmarkResult[];
  sessionSummary?: string; employerSummary?: string; verdictRationale?: string;
  sessionHash?: string; issuedAt?: string; workerId?: string; totalInteractions?: number;
  ecosystemReadiness?: "READY_FOR_EMPLOYMENT" | "READY_FOR_PROGRAMME" | "NEEDS_MENTORING" | "NOT_READY";
  programmeFitTags?: string[]; mentoringNeeds?: MentoringNeed[]; linkageSignals?: LinkageSignals;
  safetyLevel?: string; safetySummary?: string; safetyStrengths?: string[];
  safetyAreasForImprovement?: { area: string; observation: string; recommendation: string }[];
}

const VERDICT_STYLES = {
  CONFIRMED:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL:      "bg-amber-50 text-amber-700 border-amber-200",
  INCONSISTENT: "bg-red-50 text-red-700 border-red-200",
};
const VERDICT_STYLES_DARK = {
  CONFIRMED:    "dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/50",
  PARTIAL:      "dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/50",
  INCONSISTENT: "dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50",
};
const GRADE_CERT_COLOUR: Record<string, string> = {
  A: "text-emerald-700", B: "text-teal-700", C: "text-amber-700", D: "text-orange-700", F: "text-red-700",
};
const HIRE_COLOURS: Record<string, string> = {
  "Strong Hire":       "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Hire":              "text-teal-700 bg-teal-50 border-teal-200",
  "Needs Development": "text-amber-700 bg-amber-50 border-amber-200",
  "Not Recommended":   "text-red-700 bg-red-50 border-red-200",
};
const HIRE_COLOURS_DARK: Record<string, string> = {
  "Strong Hire":       "dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-700/50",
  "Hire":              "dark:text-teal-400 dark:bg-teal-900/20 dark:border-teal-700/50",
  "Needs Development": "dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-700/50",
  "Not Recommended":   "dark:text-red-400 dark:bg-red-900/20 dark:border-red-700/50",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const snap = await getDoc(doc(db, "certificates", id));
  if (!snap.exists()) return { title: "Certificate Not Found — VeriPro" };
  const data = snap.data();
  return { title: `${data.workerName} — VeriPro Certificate`, description: `Verified competence certificate for ${data.projectTitle}` };
}

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await getDoc(doc(db, "certificates", id));
  if (!snap.exists()) notFound();

  const raw = snap.data();
  const cert: Certificate = {
    id: snap.id, ...raw,
    issuedAt: raw.issuedAt instanceof Timestamp ? raw.issuedAt.toDate().toISOString() : raw.issuedAt ?? null,
  } as Certificate;

  const formattedDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const vStyle = `${VERDICT_STYLES[cert.verdict] ?? ""} ${VERDICT_STYLES_DARK[cert.verdict] ?? ""}`;
  const hStyle = (sig: string) => `${HIRE_COLOURS[sig] ?? ""} ${HIRE_COLOURS_DARK[sig] ?? ""}`;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">

      {/* ── Nav ── */}
      <nav className="print:hidden fixed top-0 inset-x-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-3">
            <CertificateClientActions workerName={cert.workerName} projectTitle={cert.projectTitle} />
            <div className={`text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-widest ${vStyle}`}>
              {cert.verdict}{cert.verdict === "CONFIRMED" && " ✓"}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── Certificate (printable portrait) ── */}
      <section className="pt-24 pb-16 px-6 flex justify-center print:pt-0 print:pb-0 print:px-0 print:block">
        <div
          id="certificate-content"
          className="w-full max-w-[640px] bg-white text-gray-900 shadow-2xl print:shadow-none border-[3px] border-gray-900"
        >
          {/* Inner frame */}
          <div className="border border-gray-300 m-3 p-10 md:p-14 space-y-10">

            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Fingerprint className="size-5 text-gray-900" />
                <span className="font-black text-xl tracking-[-0.02em] text-gray-900">VeriPro</span>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-400">Certificate of Verified Competence</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-400">Biometric Identity Network</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-900" />
                <div className="size-1 bg-gray-900 rotate-45" />
                <div className="flex-1 h-px bg-gray-900" />
              </div>
            </div>

            {/* Candidate */}
            <div className="text-center space-y-3">
              <p className="text-xs text-gray-500 italic tracking-wide">This certifies that</p>
              <div className="py-3 border-b-2 border-gray-900 border-t-2">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 uppercase">
                  {cert.workerName}
                </h1>
              </div>
              <p className="text-xs text-gray-500 italic tracking-wide">has successfully demonstrated practical competence in</p>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">{cert.projectTitle}</h2>
                {cert.roleTargeted && (
                  <p className="text-sm text-gray-500 mt-1">
                    for the role of <span className="font-bold text-gray-700">{cert.roleTargeted}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Grade + Scores */}
            {cert.grade && (
              <div className="flex items-center gap-6">
                <div className="text-center border-2 border-gray-900 px-5 py-4 shrink-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Grade</p>
                  <p className={`text-6xl font-black leading-none ${GRADE_CERT_COLOUR[cert.grade] ?? "text-gray-900"}`}>
                    {cert.grade}
                  </p>
                  <p className="text-[9px] font-mono text-gray-500 mt-1">{cert.compositeScore} / 100</p>
                </div>
                {cert.technicalScore != null && (
                  <div className="flex-1 space-y-2.5">
                    {[
                      { label: "Technical", score: cert.technicalScore, weight: "50%", colour: "bg-teal-600" },
                      { label: "Safety",    score: cert.safetyScore ?? 0,    weight: "30%", colour: "bg-emerald-600" },
                      { label: "Quality",   score: cert.workQualityScore ?? 0, weight: "20%", colour: "bg-purple-600" },
                    ].map(({ label, score, weight, colour }) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 w-14 shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${colour} rounded-full`} style={{ width: `${score}%` }} />
                        </div>
                        <span className="text-[10px] font-bold tabular-nums text-gray-700 w-7 text-right">{score}</span>
                        <span className="text-[9px] text-gray-400 w-7">{weight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Verdict + Hire signal */}
            <div className="flex items-center justify-between gap-4">
              <div className={`text-[9px] font-bold px-3 py-1.5 border uppercase tracking-[0.2em] ${VERDICT_STYLES[cert.verdict]}`}>
                {cert.verdict}{cert.verdict === "CONFIRMED" && " ✓"}
              </div>
              {cert.hireSignal && (
                <div className={`text-[9px] font-bold px-3 py-1.5 border uppercase tracking-[0.2em] ${HIRE_COLOURS[cert.hireSignal] ?? ""}`}>
                  {cert.hireSignal}
                </div>
              )}
            </div>

            {/* Safety cap */}
            {cert.safetyCapped && (
              <div className="p-3 bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold flex items-center gap-2">
                <Shield className="size-3.5 shrink-0" />
                Safety score below threshold — composite grade capped at D
              </div>
            )}

            {/* Skills */}
            {(cert.skillsMatched?.length ?? 0) > 0 && (
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Verified Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {cert.skillsMatched?.map(s => (
                    <span key={s} className="text-[9px] font-semibold px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700">
                      {s}
                    </span>
                  ))}
                  {cert.skillsMissing?.map(s => (
                    <span key={s} className="text-[9px] font-semibold px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t-2 border-gray-900 pt-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Date Issued</p>
                  <p className="text-sm font-bold text-gray-900">{formattedDate}</p>
                </div>
                <div className="flex items-center gap-1.5 border border-gray-300 px-3 py-1.5">
                  <Shield className="size-3 text-gray-500" />
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-500">Tamper-Proof Digital Seal</span>
                </div>
              </div>
              {cert.sessionHash && (
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-1">SHA-256 Integrity Hash</p>
                  <p className="font-mono text-[7px] text-gray-400 break-all leading-relaxed">{cert.sessionHash}</p>
                </div>
              )}
              <div className="pt-2 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.35em] text-gray-300">
                  Verified by VeriPro · Forensic Biometric Assessment
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Analysis (hidden on print) ── */}
      <section className="print:hidden pb-24 px-6">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Section label */}
          <div className="border-b border-border pb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Full Assessment Analysis</p>
          </div>

          {/* Employer Intelligence */}
          {cert.employerSummary && (
            <div className="p-6 rounded-2xl border border-border bg-card">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-2 flex items-center gap-1.5">
                    <Zap className="size-3" /> Hiring Intelligence
                  </p>
                  <p className="text-base font-medium text-foreground leading-relaxed">{cert.employerSummary}</p>
                </div>
                {cert.hireSignal && (
                  <div className={`shrink-0 text-xs font-bold px-4 py-2 rounded-full border uppercase tracking-widest ${hStyle(cert.hireSignal)}`}>
                    {cert.hireSignal}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3-col: Scores · Skills · Ecosystem */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Scores */}
            {cert.technicalScore != null && (
              <div className="p-6 rounded-2xl border border-border bg-card">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-5">Score Breakdown</p>
                <div className="space-y-5">
                  {[
                    { label: "Technical", score: cert.technicalScore, weight: "50%", colour: "bg-primary" },
                    { label: "Safety",    score: cert.safetyScore ?? 0,    weight: "30%", colour: "bg-emerald-500" },
                    { label: "Quality",   score: cert.workQualityScore ?? 0, weight: "20%", colour: "bg-purple-500" },
                  ].map(({ label, score, weight, colour }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                        <span className="text-xs font-bold text-foreground tabular-nums">{score}<span className="text-muted-foreground font-normal text-[10px]"> / 100</span></span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${colour} rounded-full`} style={{ width: `${score}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Weight: {weight}</p>
                    </div>
                  ))}
                  {cert.safetyCapped && (
                    <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold">⚠ Grade capped — safety below threshold</p>
                  )}
                </div>
              </div>
            )}

            {/* Skills */}
            {((cert.skillsMatched?.length ?? 0) > 0 || (cert.skillsMissing?.length ?? 0) > 0) && (
              <div className="p-6 rounded-2xl border border-border bg-card">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-5">Skills Assessment</p>
                <div className="space-y-2.5">
                  {cert.skillsMatched?.map(s => (
                    <div key={s} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-foreground leading-snug">{s}</span>
                    </div>
                  ))}
                  {cert.skillsMissing?.map(s => (
                    <div key={s} className="flex items-start gap-2.5 text-sm">
                      <XCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-snug">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ecosystem */}
            {(cert.ecosystemReadiness || (cert.programmeFitTags?.length ?? 0) > 0) && (
              <div className="p-6 rounded-2xl border border-border bg-card">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-5 flex items-center gap-1.5">
                  <Layers className="size-3" /> Ecosystem Readiness
                </p>
                {cert.ecosystemReadiness && (
                  <div className={`text-xs font-bold px-3 py-2 rounded-lg border mb-4 inline-block ${
                    cert.ecosystemReadiness === "READY_FOR_EMPLOYMENT"
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50"
                      : cert.ecosystemReadiness === "READY_FOR_PROGRAMME"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : cert.ecosystemReadiness === "NEEDS_MENTORING"
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50"
                  }`}>
                    {cert.ecosystemReadiness.replace(/_/g, " ")}
                  </div>
                )}
                {(cert.programmeFitTags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cert.programmeFitTags?.map(tag => (
                      <span key={tag} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-muted border border-border text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Benchmark table */}
          {(cert.benchmarkResults?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Deterministic Benchmarks</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest">Criterion</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Score</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Pass</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest">AI Reasoning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cert.benchmarkResults?.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">{c.name}</td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-primary text-sm">{c.score}</td>
                        <td className="px-4 py-4 text-center">
                          {c.pass
                            ? <CheckCircle className="size-4 text-emerald-500 mx-auto" />
                            : <XCircle className="size-4 text-red-500 mx-auto" />}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground leading-relaxed italic max-w-xs">{c.justification}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary + Rationale */}
          {(cert.sessionSummary || cert.verdictRationale) && (
            <div className="grid md:grid-cols-2 gap-4">
              {cert.sessionSummary && (
                <div className="p-6 rounded-2xl border border-border bg-card">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">Session Summary</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cert.sessionSummary}</p>
                </div>
              )}
              {cert.verdictRationale && (
                <div className="p-6 rounded-2xl border border-border bg-card">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">Verdict Rationale</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cert.verdictRationale}</p>
                </div>
              )}
            </div>
          )}

          {/* Linkage signals */}
          {cert.linkageSignals && (
            <div className="grid md:grid-cols-2 gap-4">
              {(cert.linkageSignals.can_mentor_others_in?.length ?? 0) > 0 && (
                <div className="p-6 rounded-2xl border border-border bg-card">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
                    <Users className="size-3" /> Mentorship Assets
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cert.linkageSignals.can_mentor_others_in.map(s => (
                      <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {(cert.linkageSignals.requires_mentor_for?.length ?? 0) > 0 && (
                <div className="p-6 rounded-2xl border border-border bg-card">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                    <BookOpen className="size-3" /> Development Needs
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cert.linkageSignals.requires_mentor_for.map(s => (
                      <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hash + Portfolio */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <div className="flex-1 p-6 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                <Hash className="size-3.5" /> Cryptographic Integrity Seal
              </div>
              <p className="font-mono text-[10px] text-muted-foreground break-all leading-relaxed">{cert.sessionHash}</p>
            </div>
            {cert.workerId && (
              <Link href={`/profile/${cert.workerId}`} className="sm:self-center">
                <Button className="w-full sm:w-auto h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 rounded-xl">
                  View Portfolio <ChevronRight className="size-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>

        </div>
      </section>

    </div>
  );
}
