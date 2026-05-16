import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  ppe_summary: string;
  strengths: string[];
  areas_for_improvement: ImprovementArea[];
  lecturer_closing_remark: string;
  certificateId?: string;
  sessionId?: string;
}

const LEVEL_STYLES: Record<string, string> = {
  EXCELLENT: "text-green-400 bg-green-900/20 border-green-700/50",
  GOOD: "text-teal-400 bg-teal-900/20 border-teal-700/50",
  NEEDS_IMPROVEMENT: "text-amber-400 bg-amber-900/20 border-amber-700/50",
  UNSAFE: "text-red-400 bg-red-900/20 border-red-700/50",
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
              VeriPro Safety Report
            </div>
            <h1 className="text-2xl font-bold">Post-Session Safety Feedback</h1>
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              LEVEL_STYLES[report.overall_safety_level] ?? "text-gray-400 border-white/10"
            }`}
          >
            {report.overall_safety_level.replace("_", " ")}
          </span>
        </div>

        {/* Score */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Overall Safety Score</div>
              <div className="text-4xl font-bold">
                {Math.round((report.overall_score ?? 0) * 100)} / 100
              </div>
            </div>
            <Shield className="w-12 h-12 text-teal-400 opacity-50" />
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] mb-6">
          <h2 className="font-semibold mb-2">Session Summary</h2>
          <p className="text-sm text-gray-300 leading-relaxed">{report.session_summary}</p>
          <div className="mt-3 pt-3 border-t border-white/10 text-sm text-gray-400">
            <strong className="text-gray-300">PPE: </strong>{report.ppe_summary}
          </div>
        </div>

        {/* Strengths */}
        {(report.strengths?.length ?? 0) > 0 && (
          <div className="p-6 rounded-xl border border-teal-800/40 bg-teal-900/10 mb-6">
            <h2 className="font-semibold mb-3 text-teal-300">Strengths</h2>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas for improvement */}
        {(report.areas_for_improvement?.length ?? 0) > 0 && (
          <div className="p-6 rounded-xl border border-amber-800/40 bg-amber-900/10 mb-6">
            <h2 className="font-semibold mb-3 text-amber-300">Areas for Improvement</h2>
            <div className="space-y-4">
              {report.areas_for_improvement.map((area, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium">{area.area}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{area.observation}</p>
                  <p className="text-sm text-amber-200 italic">→ {area.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Closing remark */}
        <blockquote className="border-l-2 border-teal-500 pl-4 italic text-gray-300 text-sm mb-8">
          {report.lecturer_closing_remark}
        </blockquote>

        {/* Links */}
        <div className="flex gap-4 text-sm">
          {report.certificateId && (
            <Link href={`/certificate/${report.certificateId}`} className="text-teal-400 hover:underline">
              ← Back to Certificate
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
