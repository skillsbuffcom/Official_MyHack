import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore/lite";
import { Shield, AlertTriangle, CheckCircle, ArrowLeft, Info, Trophy, Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
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

const LEVEL_CONFIG: Record<string, { styles: string; label: string; icon: any }> = {
  EXCELLENT: { styles: "text-emerald-400 bg-emerald-900/20 border-emerald-700/50", label: "Excellent Safety", icon: Shield },
  GOOD: { styles: "text-teal-400 bg-teal-900/20 border-teal-700/50", label: "Good Compliance", icon: CheckCircle },
  NEEDS_IMPROVEMENT: { styles: "text-amber-400 bg-amber-900/20 border-amber-700/50", label: "Needs Improvement", icon: AlertTriangle },
  UNSAFE: { styles: "text-red-400 bg-red-900/20 border-red-700/50", label: "Unsafe Actions", icon: AlertTriangle },
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
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-teal-500/30">
      {/* Neural Background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div className="h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <Link href={report.certificateId ? `/certificate/${report.certificateId}` : "/"}>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Certificate
            </Button>
          </Link>
          <BrandMark />
        </nav>

        {/* Main Header Card */}
        <header className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row gap-8 items-center bg-white/[0.03] border border-white/[0.08] rounded-[2rem] p-8 md:p-12 backdrop-blur-xl">
            {/* Circular Progress */}
            <div className="relative flex-shrink-0">
               <svg className="w-40 h-40 transform -rotate-90">
                 <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                 <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="8" fill="transparent" 
                   strokeDasharray={465}
                   strokeDashoffset={465 - (465 * score) / 100}
                   className="text-teal-500 transition-all duration-1000 ease-out" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-4xl font-bold text-white">{score}</span>
                 <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Score</span>
               </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${config.styles}`}>
                <config.icon className="w-3 h-3" />
                {config.label}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">Safety Compliance Audit</h1>
              <p className="text-gray-400 leading-relaxed max-w-md">
                Detailed AI-generated feedback from your practical session. This report focuses on technical safety and procedural compliance.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Summary Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Session Summary */}
            <section className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
               <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                 <Info className="w-5 h-5 text-teal-500" />
                 Executive Summary
               </h2>
               <p className="text-gray-400 leading-relaxed italic">
                 "{report.session_summary}"
               </p>
            </section>

            {/* Improvement Areas */}
            <section className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
               <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                 <Target className="w-5 h-5 text-amber-500" />
                 Neural Observations
               </h2>
               <div className="space-y-6">
                 {report.areas_for_improvement.map((area, i) => (
                   <div key={i} className="group p-4 rounded-xl border border-white/[0.03] hover:border-amber-500/20 transition-all">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="text-xs font-mono text-amber-500 uppercase tracking-tighter">Issue detected</span>
                       <h3 className="text-sm font-semibold text-white">{area.area}</h3>
                     </div>
                     <p className="text-sm text-gray-400 mb-3">{area.observation}</p>
                     <div className="flex gap-2 items-start p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[13px] text-amber-200">
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
            <section className="bg-teal-500/5 border border-teal-500/10 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
               <h2 className="text-sm font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2">
                 <Trophy className="w-4 h-4" />
                 Key Strengths
               </h2>
               <ul className="space-y-3">
                 {report.strengths.map((s, i) => (
                   <li key={i} className="flex items-start gap-2 text-[13px] text-gray-300">
                     <CheckCircle className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                     {s}
                   </li>
                 ))}
               </ul>
            </section>

            {/* Closing Remark */}
            <section className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
               <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Lecturer's Remark</h2>
               <p className="text-sm text-gray-300 leading-relaxed font-serif italic">
                 "{report.lecturer_closing_remark}"
               </p>
               <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                    <Shield className="size-4 text-teal-400" />
                  </div>
                  <div className="text-[10px] font-mono text-gray-500">
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
