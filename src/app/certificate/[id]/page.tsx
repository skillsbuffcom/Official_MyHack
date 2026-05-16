import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, Timestamp } from "firebase/firestore/lite";
import {
  Shield, CheckCircle, XCircle, Hash, ChevronRight,
  Zap, Layers, Users, BookOpen, Fingerprint, BarChart2, ListChecks, Target, ScrollText, Scale, Clock, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CertificateClientActions, CertificateQR } from "./client-actions";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

interface BenchmarkResult { name: string; score: number; pass: boolean; justification: string }
interface MentoringNeed { skill_gap: string; priority: "HIGH" | "MEDIUM" | "LOW"; suggested_intervention: string }
interface LinkageSignals { can_mentor_others_in: string[]; requires_mentor_for: string[]; eligible_programme_types: string[] }
interface KeyAction { timestamp: string; action: string; significance: "HIGH" | "MEDIUM" | "LOW"; score: number }

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
  keyActions?: KeyAction[];
}

const VERDICT_STYLES = {
  CONFIRMED:    "text-emerald-700 border-emerald-300",
  PARTIAL:      "text-amber-700 border-amber-300",
  INCONSISTENT: "text-red-700 border-red-300",
};
const VERDICT_STYLES_DARK = {
  CONFIRMED:    "dark:text-emerald-400 dark:border-emerald-700/50",
  PARTIAL:      "dark:text-amber-400 dark:border-amber-700/50",
  INCONSISTENT: "dark:text-red-400 dark:border-red-700/50",
};

const HIRE_COLOURS: Record<string, string> = {
  "Strong Hire":       "text-emerald-700 border-emerald-300",
  "Hire":              "text-teal-700 border-teal-300",
  "Needs Development": "text-amber-700 border-amber-300",
  "Not Recommended":   "text-red-700 border-red-300",
};
const HIRE_COLOURS_DARK: Record<string, string> = {
  "Strong Hire":       "dark:text-emerald-400 dark:border-emerald-700/50",
  "Hire":              "dark:text-teal-400 dark:border-teal-700/50",
  "Needs Development": "dark:text-amber-400 dark:border-amber-700/50",
  "Not Recommended":   "dark:text-red-400 dark:border-red-700/50",
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

  // Fetch action events from session subcollection as fallback for timeline
  let timelineEvents: KeyAction[] = cert.keyActions ?? [];
  if (timelineEvents.length === 0 && raw.sessionId) {
    try {
      const eventsSnap = await getDocs(collection(db, "sessions", raw.sessionId as string, "actionEvents"));
      console.log(`[timeline] sessionId=${raw.sessionId} docs=${eventsSnap.docs.length}`);
      timelineEvents = eventsSnap.docs
        .map(d => d.data())
        .filter(e => e.isQualifying === true)
        .sort((a, b) => (a.timestamp as string).localeCompare(b.timestamp as string))
        .map(e => ({
          timestamp: e.timestamp as string,
          action: (e.action as string).replace(/_/g, " "),
          significance: (
            (e.safetyAssessment as Record<string, unknown>)?.level === "CRITICAL" ||
            (e.safetyAssessment as Record<string, unknown>)?.level === "UNSAFE"
              ? "HIGH"
              : (e.confidence as number) >= 0.85 ? "HIGH"
              : (e.confidence as number) >= 0.7  ? "MEDIUM"
              : "LOW"
          ) as "HIGH" | "MEDIUM" | "LOW",
          score: Math.round((e.confidence as number) * 100),
        }));
      console.log(`[timeline] qualifying=${timelineEvents.length}`);
    } catch (err) {
      console.error("[timeline] fetch failed:", err);
    }
  }

  const formattedDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const vStyle = `${VERDICT_STYLES[cert.verdict] ?? ""} ${VERDICT_STYLES_DARK[cert.verdict] ?? ""}`;
  const hStyle = (sig: string) => `${HIRE_COLOURS[sig] ?? ""} ${HIRE_COLOURS_DARK[sig] ?? ""}`;

  const gradeColor = (grade: string): string => {
    switch (grade?.toUpperCase()) {
      case "A": return "#16a34a"; // green
      case "B": return "#0d9488"; // teal
      case "C": return "#d97706"; // amber
      case "D": return "#ea580c"; // orange
      case "F": return "#dc2626"; // red
      default:  return "#0f766e";
    }
  };
  const gc = gradeColor(cert.grade ?? "");

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">

      {/* ── Nav ── */}
      <nav className="print:hidden fixed top-0 inset-x-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-3">
            <CertificateClientActions workerName={cert.workerName} projectTitle={cert.projectTitle} />
            <div className={`hidden sm:block text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-widest ${vStyle}`}>
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
          className="w-full max-w-[800px] bg-white text-slate-900 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] print:shadow-none rounded-4xl overflow-hidden border border-slate-100 relative"
        >
          {/* Subtle Security Pattern Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <div className="h-full w-full bg-[radial-gradient(#000_1px,transparent_1px)] bg-size-[20px_20px]" />
          </div>

          <div className="relative p-10 md:p-16 space-y-12">
            
            {/* Header: Brand + Document Type */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-xl bg-primary flex items-center justify-center">
                    <Fingerprint className="size-6 text-white" />
                  </div>
                  <span className="font-black text-2xl tracking-tight text-slate-900">VeriPro</span>
                </div>
                <div>
                  <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Official Certificate of Competence</h1>
                  <p className="text-xs font-medium text-slate-400 mt-1">Biometric Verification Network · ID: {cert.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date of Issue</p>
                <p className="text-sm font-bold text-slate-900">{formattedDate}</p>
              </div>
            </div>

            {/* Recipient Section */}
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">This is to certify that</p>
                <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900">
                  {cert.workerName}
                </h2>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">has successfully demonstrated professional proficiency in</p>
                <div className="flex flex-col gap-2 items-start">
                  <span className="text-xl font-bold" style={{ color: "#0f766e" }}>{cert.projectTitle}</span>
                  {cert.roleTargeted && (
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">for the role of</span>
                      <span className="font-bold text-slate-900" style={{ fontSize: '1.25rem' }}>{cert.roleTargeted}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scores Section: Duolingo Style Split */}
            <div className="grid md:grid-cols-[1fr_1.5fr] gap-5 items-stretch py-4">
              {/* Overall Score Radial Chart */}
              <div className="flex flex-col items-center justify-center p-10 rounded-[2.5rem] bg-transparent border border-slate-200 relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Overall Score</p>
                
                <div className="relative size-48">
                  {/* Background Circle */}
                  <svg className="size-full -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="12"
                    />
                    {/* Progress Circle */}
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 88}
                      strokeDashoffset={2 * Math.PI * 88 * (1 - (cert.compositeScore ?? 0) / 100)}
                      style={{ stroke: gc }}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-6xl font-black tracking-tighter leading-none" style={{ color: gc }}>
                      {cert.compositeScore}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">out of 100</span>
                  </div>
                </div>

              </div>

              {/* Sub-scores Bars */}
              <div className="rounded-[2.5rem] border border-slate-200 p-10 space-y-6">
                {/* Grade header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Grade Assessment</p>
                  <p className="text-5xl font-black leading-none" style={{ color: gc }}>{cert.grade}</p>
                </div>
                {/* Breakdown label */}
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Score Breakdown</p>
                {[
                  { label: "Technical Proficiency", score: cert.technicalScore ?? 0, colour: "bg-teal-500", desc: "Mechanical accuracy and execution" },
                  { label: "Safety Compliance",    score: cert.safetyScore ?? 0,    colour: "bg-emerald-500", desc: "Risk mitigation and protocol adherence" },
                  { label: "Execution Quality",   score: cert.workQualityScore ?? 0, colour: "bg-indigo-500", desc: "Consistency and output standards" },
                ].map(({ label, score, colour, desc }) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{label}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{desc}</p>
                      </div>
                      <span className="text-sm font-black text-slate-900">{score}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colour} rounded-full transition-all duration-1000`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Skills */}
            {(cert.skillsMatched?.length ?? 0) > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Verified Skills & Proficiencies</h3>
                <div className="flex flex-wrap gap-2">
                  {cert.skillsMatched?.map(s => (
                    <div key={s} className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center gap-1.5">
                      <CheckCircle className="size-3 text-emerald-500" />
                      {s}
                    </div>
                  ))}
                  {cert.skillsMissing?.map(s => (
                    <div key={s} className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-400 text-[11px] font-bold">
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score Interpretation: Duolingo Style Blurb */}
            <div className="p-8 rounded-3xl bg-slate-50/50 border border-slate-100 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Score Interpretation</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                A score of <span className="font-bold text-slate-900">{cert.compositeScore}</span> indicates a 
                <span className="font-bold text-slate-900"> {cert.hireSignal ?? "Verified"}</span> level of competence. 
                Candidates at this level can generally perform complex technical tasks with 
                {cert.compositeScore && cert.compositeScore > 80 ? " minimal supervision and high precision." : " standard safety oversight and consistent quality."}
                Biometric markers remained {cert.verdict === "CONFIRMED" ? "fully consistent" : "largely stable"} throughout the assessment period.
              </p>
            </div>

            {/* Verification Footer */}
            <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="space-y-4 max-w-sm">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg border border-slate-200 flex items-center justify-center">
                    <Shield className="size-4 text-slate-400" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verified by VeriPro Forensic AI</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">SHA-256 Digital Signature</p>
                  <p className="font-mono text-[7px] text-slate-400 break-all leading-tight opacity-60">
                    {cert.sessionHash}
                  </p>
                </div>
              </div>

              {/* QR / Seal Placeholder */}
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Valid Certificate</p>
                  <p className="text-[9px] font-medium text-slate-400">Scan to verify authenticity</p>
                </div>
                <div className="size-24 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2">
                  <CertificateQR id={cert.id} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Analysis (hidden on print) ── */}
      <section className="print:hidden pb-24 px-6">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Section header */}
          <div className="flex items-center gap-4 py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shrink-0">Full Assessment Analysis</p>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Hiring Intelligence */}
          {cert.employerSummary && (
            <div className="p-6 rounded-2xl border border-border bg-card">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                    <Zap className="size-3" /> Hiring Intelligence
                  </p>
                  <p className="text-sm font-medium text-foreground leading-relaxed">{cert.employerSummary}</p>
                </div>
                {cert.hireSignal && (
                  <div className={`self-start sm:shrink-0 text-[10px] font-bold px-4 py-1.5 rounded-full border uppercase tracking-widest ${hStyle(cert.hireSignal)}`}>
                    {cert.hireSignal}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Timeline */}
          {timelineEvents.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-1.5">
                <Clock className="size-3 text-muted-foreground" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Session Timeline</p>
              </div>
              <div className="divide-y divide-border">
                {timelineEvents.map((ka, i) => {
                  const sigColour =
                    ka.significance === "HIGH"   ? "text-red-600 dark:text-red-400 border-red-300 dark:border-red-700/50" :
                    ka.significance === "MEDIUM" ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700/50" :
                                                   "text-muted-foreground border-border";
                  return (
                    <div key={i} className="flex items-start gap-4 px-6 py-4">
                      {/* Timestamp */}
                      <span className="font-mono text-[11px] font-bold text-muted-foreground shrink-0 mt-0.5 tabular-nums">{ka.timestamp}</span>

                      {/* Screenshot placeholder */}
                      <div className="shrink-0 size-14 rounded-lg border border-border bg-muted flex items-center justify-center">
                        <Camera className="size-4 text-muted-foreground/40" />
                      </div>

                      {/* Detail */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide">{ka.action.replace(/_/g, " ")}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${sigColour}`}>
                            {ka.significance}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">Score {ka.score}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scores + Skills side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {cert.technicalScore != null && (
              <div className="p-6 rounded-2xl border border-border bg-card space-y-5 h-full">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5"><BarChart2 className="size-3" /> Score Breakdown</p>
                {[
                  { label: "Technical", score: cert.technicalScore, weight: "50%", colour: "bg-primary" },
                  { label: "Safety",    score: cert.safetyScore ?? 0,    weight: "30%", colour: "bg-emerald-500" },
                  { label: "Quality",   score: cert.workQualityScore ?? 0, weight: "20%", colour: "bg-violet-500" },
                ].map(({ label, score, weight, colour }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">{label} <span className="font-normal opacity-50">· {weight}</span></span>
                      <span className="text-xs font-bold text-foreground tabular-nums">{score}<span className="text-muted-foreground font-normal"> /100</span></span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${colour} rounded-full`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
                {cert.safetyCapped && (
                  <p className="text-[10px] text-orange-500 font-semibold">⚠ Grade capped — safety below threshold</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-4 h-full">
              {((cert.skillsMatched?.length ?? 0) > 0 || (cert.skillsMissing?.length ?? 0) > 0) && (
                <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5"><ListChecks className="size-3" /> Skills Assessment</p>
                  <div className="flex flex-wrap gap-2">
                    {cert.skillsMatched?.map(s => (
                      <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle className="size-3 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{s}</span>
                      </div>
                    ))}
                    {cert.skillsMissing?.map(s => (
                      <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-300 dark:border-red-700/50 text-red-600 dark:text-red-400">
                        <XCircle className="size-3 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(cert.ecosystemReadiness || (cert.programmeFitTags?.length ?? 0) > 0) && (
                <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                    <Layers className="size-3" /> Ecosystem Readiness
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {cert.ecosystemReadiness && (
                      <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-widest ${
                        cert.ecosystemReadiness === "READY_FOR_EMPLOYMENT" ? "text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50"
                        : cert.ecosystemReadiness === "READY_FOR_PROGRAMME" ? "text-primary border-primary/30"
                        : cert.ecosystemReadiness === "NEEDS_MENTORING"     ? "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50"
                        : "text-red-700 dark:text-red-400 border-red-300 dark:border-red-700/50"
                      }`}>
                        {cert.ecosystemReadiness.replace(/_/g, " ")}
                      </span>
                    )}
                    {cert.programmeFitTags?.map(tag => (
                      <span key={tag} className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-border text-muted-foreground uppercase tracking-widest">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Benchmark table */}
          {(cert.benchmarkResults?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5"><Target className="size-3" /> Deterministic Benchmarks</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Criterion</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Score</th>
                      <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pass</th>
                      <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Reasoning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cert.benchmarkResults?.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">{c.name}</td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-foreground text-sm">{c.score}</td>
                        <td className="px-4 py-4 text-center">
                          {c.pass
                            ? <CheckCircle className="size-4 text-emerald-500 mx-auto" />
                            : <XCircle className="size-4 text-red-400 mx-auto" />}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground leading-relaxed max-w-xs">{c.justification}</td>
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
                <div className="p-6 rounded-2xl border border-border bg-card space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5"><ScrollText className="size-3" /> Session Summary</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cert.sessionSummary}</p>
                </div>
              )}
              {cert.verdictRationale && (
                <div className="p-6 rounded-2xl border border-border bg-card space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5"><Scale className="size-3" /> Verdict Rationale</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cert.verdictRationale}</p>
                </div>
              )}
            </div>
          )}

          {/* Mentorship Assets */}
          {cert.linkageSignals && (cert.linkageSignals.can_mentor_others_in?.length ?? 0) > 0 && (
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3" /> Mentorship Assets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cert.linkageSignals.can_mentor_others_in.map(s => (
                  <span key={s} className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Development Needs + Integrity Seal 50/50 */}
          <div className="grid md:grid-cols-2 gap-4">
            {cert.linkageSignals && (cert.linkageSignals.requires_mentor_for?.length ?? 0) > 0 && (
              <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="size-3" /> Development Needs
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cert.linkageSignals.requires_mentor_for.map(s => (
                    <span key={s} className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-current text-amber-600 dark:text-amber-400 uppercase tracking-widest">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Hash className="size-3" /> Integrity Seal
              </div>
              <p className="font-mono text-[10px] text-muted-foreground break-all leading-relaxed">{cert.sessionHash}</p>
            </div>
          </div>

          {/* View Portfolio */}
          {cert.workerId && (
            <Link href={`/profile/${cert.workerId}`}>
              <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 rounded-xl text-sm">
                View Portfolio <ChevronRight className="size-4 ml-1" />
              </Button>
            </Link>
          )}

        </div>
      </section>

    </div>
  );
}
