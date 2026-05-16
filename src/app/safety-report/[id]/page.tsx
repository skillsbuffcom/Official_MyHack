import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore/lite";
import { Shield, AlertTriangle, CheckCircle, ArrowLeft, Info, Trophy, Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

interface ImprovementArea {
  area: string;
  observation: string;
  recommendation: string;
}

interface SafetyReport {
  overall_safety_level: string;
  overall_score: number;
  session_summary: string;
  strengths: string[];
  areas_for_improvement: ImprovementArea[];
  lecturer_closing_remark: string;
  certificateId?: string;
  sessionId?: string;
}

const LEVEL_CONFIG: Record<string, { styles: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  EXCELLENT: { styles: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50", label: "Excellent Safety", icon: Shield },
  GOOD: { styles: "text-primary bg-primary/[0.06] border-primary/20", label: "Good Compliance", icon: CheckCircle },
  NEEDS_IMPROVEMENT: { styles: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50", label: "Needs Improvement", icon: AlertTriangle },
  UNSAFE: { styles: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50", label: "Unsafe Actions", icon: AlertTriangle },
};

export default async function SafetyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snap = await getDoc(doc(db, "safetyReports", id));
  if (!snap.exists()) notFound();

  const report = snap.data() as SafetyReport;
  const score = Math.round((report.overall_score ?? 0) * 100);
  const config = LEVEL_CONFIG[report.overall_safety_level] ?? { styles: "text-gray-400 border-white/10", label: "Unrated", icon: Info };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-teal-500/30 transition-colors duration-300">
      {/* Neural Background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div className="h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-12 md:pt-32">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <Link href={report.certificateId ? `/certificate/${report.certificateId}` : "/"}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Certificate
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <BrandMark />
          </div>
        </nav>

        {/* Main Header Card */}
        <header className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row gap-8 items-center bg-card border border-border rounded-4xl p-8 md:p-12 backdrop-blur-xl shadow-lg">
            {/* Circular Progress */}
            <div className="relative shrink-0">
               <svg className="w-40 h-40 transform -rotate-90">
                 <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/10" />
                 <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="8" fill="transparent" 
                   strokeDasharray={465}
                   strokeDashoffset={465 - (465 * score) / 100}
                   className="text-primary transition-all duration-1000 ease-out" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-4xl font-bold text-foreground">{score}</span>
                 <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Score</span>
               </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${config.styles}`}>
                <config.icon className="w-3 h-3" />
                {config.label}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Safety Compliance Audit</h1>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                Detailed AI-generated feedback from your practical session. This report focuses on technical safety and procedural compliance.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Summary Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Session Summary */}
            <section className="bg-card border border-border rounded-2xl p-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
               <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                 <Info className="w-5 h-5 text-primary" />
                 Executive Summary
               </h2>
                <p className="text-muted-foreground leading-relaxed italic">
                  &ldquo;{report.session_summary}&rdquo;
                </p>
            </section>

            {/* Improvement Areas */}
            <section className="bg-card border border-border rounded-2xl p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
               <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                 <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                 Neural Observations
               </h2>
               <div className="space-y-6">
                 {report.areas_for_improvement.map((area, i) => (
                   <div key={i} className="group p-4 rounded-xl border border-border hover:border-amber-500/20 transition-all">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="text-xs font-mono text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Issue detected</span>
                       <h3 className="text-sm font-semibold text-foreground">{area.area}</h3>
                     </div>
                     <p className="text-sm text-muted-foreground mb-3">{area.observation}</p>
                     <div className="flex gap-2 items-start p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-[13px] text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p><span className="font-bold">Recommendation:</span> {area.recommendation}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </section>
          </div>

          {/* Side Column */}
          <div className="space-y-6">
            {/* Strengths Card */}
            <section className="bg-primary/4 border border-primary/15 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
               <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                 <Trophy className="w-4 h-4" />
                 Key Strengths
               </h2>
               <ul className="space-y-3">
                 {report.strengths.map((s, i) => (
                   <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                     <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                     {s}
                   </li>
                 ))}
               </ul>
            </section>

            {/* Closing Remark */}
             <section className="bg-card border border-border rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
               <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Lecturer&apos;s Remark</h2>
               <p className="text-sm text-foreground leading-relaxed font-serif italic">
                 &ldquo;{report.lecturer_closing_remark}&rdquo;
               </p>
               <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Shield className="size-4 text-primary" />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    DIGITALLY SIGNED<br/>VERIPRO AUDIT ENGINE
                  </div>
               </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
