import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore/lite";
import { Shield, CheckCircle, XCircle, Hash, ChevronRight, Zap, Layers, Users, BookOpen, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CertificateClientActions } from "./client-actions";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

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
  CONFIRMED: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
  PARTIAL: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  INCONSISTENT: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const GRADE_COLOURS: Record<string, string> = {
  A: "text-emerald-700 dark:text-emerald-400",
  B: "text-teal-700 dark:text-teal-400",
  C: "text-amber-700 dark:text-amber-400",
  D: "text-orange-700 dark:text-orange-400",
  F: "text-red-700 dark:text-red-400",
};

const HIRE_COLOURS: Record<string, string> = {
  "Strong Hire": "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-700/50",
  Hire: "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-700/50",
  "Needs Development": "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-700/50",
  "Not Recommended": "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-700/50",
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
      <div className="w-28 text-sm font-bold text-gray-500 shrink-0 uppercase tracking-widest text-[10px]">{label}</div>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full ${colour} rounded-full transition-all duration-1000`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="w-14 text-sm text-right font-bold text-foreground">{score}%</div>
      <div className="w-12 text-[10px] font-bold text-gray-400 text-right uppercase tracking-tighter">{weight}</div>
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-x-hidden relative px-6 py-12 transition-colors duration-300">
      {/* Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.03] contrast-150 brightness-100" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

      {/* Technical Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[0] opacity-[0.03] animate-[grid-scroll_60s_linear_infinite]" 
           style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-teal-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[60%] h-[60%] bg-teal-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 bg-background/40 backdrop-blur-md p-6 rounded-[2rem] border border-border shadow-lg">
          <BrandMark />
          <div className="flex items-center gap-3">
            <CertificateClientActions workerName={cert.workerName} projectTitle={cert.projectTitle} />
            <div
              className={`text-[10px] font-bold px-4 py-2 rounded-xl border uppercase tracking-widest ${
                VERDICT_STYLES[cert.verdict] ?? "bg-muted text-muted-foreground border-border"
              }`}
            >
              {cert.verdict}
              {cert.verdict === "CONFIRMED" && " ✓"}
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div id="certificate-content" className="bg-card p-8 md:p-12 rounded-[3rem] border border-border shadow-2xl relative overflow-hidden">
            {/* Decorative Seal Background */}
            <div className="absolute top-[-5rem] right-[-5rem] size-64 bg-teal-500/5 rounded-full blur-3xl" />

          {/* Title block */}
          <div className="space-y-6 mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Certificate of Verified Competence
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
              {cert.projectTitle}
            </h1>
            
            <div className="grid grid-cols-2 gap-8 border-t border-border pt-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Candidate</p>
                <p className="text-xl font-bold text-foreground">{cert.workerName}</p>
              </div>
              <div className="space-y-1 text-right md:text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Date Issued</p>
                <p className="text-xl font-bold text-foreground">{formattedDate}</p>
              </div>
              {cert.roleTargeted && (
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Strategic Alignment</p>
                  <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{cert.roleTargeted}</p>
                </div>
              )}
            </div>
          </div>

          {/* Grade + Hire signal */}
          {cert.grade && (
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="p-8 rounded-[2.5rem] bg-muted/30 border border-border text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">Composite Grade</p>
                <p className={`text-7xl font-black ${GRADE_COLOURS[cert.grade] ?? ""}`}>
                  {cert.grade}
                </p>
                <p className="text-sm font-bold text-muted-foreground/40 mt-2 font-mono">{cert.compositeScore} / 100</p>
              </div>
              {cert.hireSignal && (
                <div className="p-8 rounded-[2.5rem] bg-muted/30 border border-border text-center flex flex-col justify-center items-center shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-4">Hiring Intelligence</p>
                  <div
                    className={`px-6 py-3 rounded-2xl border text-sm font-black uppercase tracking-widest shadow-sm ${
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
            <div className="mb-8 p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-400 text-sm font-bold flex items-center gap-4">
              <Shield className="size-6 shrink-0 text-orange-600 dark:text-orange-500" />
              Safety score ({cert.safetyScore}/100) below network threshold — grade capped at D
            </div>
          )}

          {/* Score breakdown */}
          {cert.technicalScore != null && (
            <div className="bg-card rounded-[2.5rem] border border-border p-8 mb-8 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">Neural Audit Breakdown</p>
              <div className="space-y-6">
                <ScoreBar label="Technical" score={cert.technicalScore ?? 0} weight="50%" colour="bg-teal-600 dark:bg-teal-500" />
                <ScoreBar label="Safety" score={cert.safetyScore ?? 0} weight="30%" colour="bg-emerald-600 dark:bg-emerald-500" />
                <ScoreBar label="Quality" score={cert.workQualityScore ?? 0} weight="20%" colour="bg-purple-600 dark:bg-purple-500" />
              </div>
            </div>
          )}

          {/* Skills */}
          {((cert.skillsMatched?.length ?? 0) > 0 || (cert.skillsMissing?.length ?? 0) > 0) && (
            <div className="mb-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 ml-2 mb-4">Verified Practical Skills</p>
              <div className="flex flex-wrap gap-3">
                {cert.skillsMatched?.map((s) => (
                  <div key={s} className="px-5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-700/50 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="size-4" /> {s}
                  </div>
                ))}
                {cert.skillsMissing?.map((s) => (
                  <div key={s} className="px-5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700/50 text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <XCircle className="size-4" /> {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ecosystem Linkage Status */}
          {(cert.ecosystemReadiness || (cert.programmeFitTags?.length ?? 0) > 0 || cert.linkageSignals) && (
            <div className="bg-indigo-50/10 dark:bg-indigo-950/10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800/40 p-8 mb-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Layers className="size-16 text-indigo-900" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-6 flex items-center gap-2">
                <Layers className="size-3" /> Ecosystem Linkage Status
              </p>
              
              {cert.ecosystemReadiness && (
                <div className="mb-6">
                  <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-2">Readiness Level</div>
                  <span className={`text-xs font-bold px-4 py-2 rounded-xl border ${
                    cert.ecosystemReadiness === "READY_FOR_EMPLOYMENT" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    cert.ecosystemReadiness === "READY_FOR_PROGRAMME" ? "bg-teal-50 text-teal-600 border-teal-100" :
                    cert.ecosystemReadiness === "NEEDS_MENTORING" ? "bg-amber-50 text-amber-600 border-amber-100" :
                    "bg-red-50 text-red-600 border-red-100"
                  }`}>
                    {cert.ecosystemReadiness.replace(/_/g, " ")}
                  </span>
                </div>
              )}

              {(cert.programmeFitTags?.length ?? 0) > 0 && (
                <div className="mb-6">
                  <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Briefcase className="size-3" /> Programme Tracks
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cert.programmeFitTags?.map((tag) => (
                      <span key={tag} className="text-[10px] bg-white/60 text-indigo-600 border border-indigo-100 rounded-lg px-3 py-1 font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {cert.linkageSignals && (
                <div className="grid grid-cols-2 gap-6">
                  {(cert.linkageSignals.can_mentor_others_in?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Users className="size-3" /> Mentorship Assets
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cert.linkageSignals.can_mentor_others_in.map(s => (
                          <span key={s} className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md px-2 py-0.5 font-bold uppercase">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(cert.linkageSignals.requires_mentor_for?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <BookOpen className="size-3" /> Development Needs
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cert.linkageSignals.requires_mentor_for.map(s => (
                          <span key={s} className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 rounded-md px-2 py-0.5 font-bold uppercase">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Benchmark results */}
          {(cert.benchmarkResults?.length ?? 0) > 0 && (
            <div className="bg-muted/30 rounded-[2.5rem] border border-border p-8 mb-10 overflow-x-auto shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">Deterministic Benchmarks</p>
              <table className="w-full text-sm font-medium">
                <thead>
                  <tr className="border-b border-border text-muted-foreground/40">
                    <th className="text-left py-3 pr-4 font-bold uppercase tracking-widest text-[9px]">Criterion</th>
                    <th className="text-right py-3 pr-4 font-bold uppercase tracking-widest text-[9px]">Score</th>
                    <th className="text-right py-3 pr-4 font-bold uppercase tracking-widest text-[9px]">Status</th>
                    <th className="text-left py-3 font-bold uppercase tracking-widest text-[9px]">AI Reasoning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cert.benchmarkResults?.map((c, i) => (
                    <tr key={i} className="group hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 font-bold text-foreground">{c.name}</td>
                      <td className="text-right py-4 pr-4 font-mono font-bold text-teal-600 dark:text-teal-400">{c.score}</td>
                      <td className="text-right py-4 pr-4">
                        {c.pass ? (
                          <div className="size-6 rounded-full bg-emerald-500 flex items-center justify-center mx-auto"><CheckCircle className="size-3.5 text-white" /></div>
                        ) : (
                          <div className="size-6 rounded-full bg-red-500 flex items-center justify-center mx-auto"><XCircle className="size-3.5 text-white" /></div>
                        )}
                      </td>
                      <td className="py-4 text-[11px] text-muted-foreground leading-relaxed italic">{c.justification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Employer Intelligence */}
          {cert.employerSummary && (
            <div className="bg-card p-10 rounded-[3rem] border border-border mb-10 relative overflow-hidden shadow-sm">
               <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-teal-600 dark:text-teal-400">
                    <Zap className="size-4" /> Hiring Intelligence Report
                 </div>
                 <p className="text-lg font-bold text-foreground leading-snug">{cert.employerSummary}</p>
               </div>
            </div>
          )}

          {/* Integrity Hash */}
          <div className="bg-card border border-border rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 text-muted-foreground/60 font-bold text-[9px] uppercase tracking-[0.2em]">
                <Hash className="size-4" /> Cryptographic Integrity Seal
              </div>
              <div className="font-mono text-[9px] text-muted-foreground/60 break-all bg-muted/30 p-4 rounded-xl border border-border">
                {cert.sessionHash}
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
               <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-700/50 text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-widest shadow-sm">
                  <Shield className="size-4" /> Tamper-Proof Digital Seal
               </div>
               
               {cert.workerId && (
                <Link href={`/profile/${cert.workerId}`} className="w-full sm:w-auto">
                  <Button className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold h-14 rounded-2xl shadow-xl shadow-teal-500/20 group">
                    View Verified Portfolio
                    <ChevronRight className="size-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-12 text-center opacity-30">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground/40">
              Verified by VeriPro Biometric Identity Network
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
