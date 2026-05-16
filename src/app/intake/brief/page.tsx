"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, Clock, Package, ChevronLeft, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

interface ProjectBrief {
  project_title: string;
  task_description: string;
  materials_needed: string[];
  expected_duration_minutes: number;
  skills_being_tested: string[];
}

interface PostingData {
  id: string;
  roleTitle: string;
  requiredSkills: string[];
  preferredSkills: string[];
  rawDescription: string;
  projectTitle: string;
  projectBrief: ProjectBrief;
}

function BriefContent() {
  const params = useSearchParams();
  const router = useRouter();
  const postingId = params.get("id");

  const [data, setData] = useState<PostingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!postingId) {
      router.replace("/intake");
      return;
    }

    async function load() {
      if (postingId === "demo-bypass") {
        setData({
          id: "demo-bypass",
          roleTitle: "Electrical Engineer basic",
          requiredSkills: ["Placing cables into the terminal block", "Safe tool usage"],
          preferredSkills: [],
          rawDescription: "Demo assessment for electrical cable termination.",
          projectTitle: "Basic Terminal Block Wiring",
          projectBrief: {
            project_title: "Basic Terminal Block Wiring",
            task_description: "Connect three 2.5mm cables to the designated terminal block. Ensure correct insulation stripping and tight screw connections.",
            materials_needed: ["2.5mm copper cable", "Terminal block", "Screwdriver", "Wire strippers"],
            expected_duration_minutes: 15,
            skills_being_tested: ["Placing cables into the terminal block"]
          }
        });
        setLoading(false);
        return;
      }

      try {
        const { db } = await import("@/lib/firebase");
        const { doc, getDoc } = await import("firebase/firestore/lite");
        const snap = await getDoc(doc(db, "jobPostings", postingId!));
        if (!snap.exists()) {
          setError("Assessment not found.");
        } else {
          setData({ id: snap.id, ...snap.data() } as PostingData);
        }
      } catch {
        setError("Failed to load assessment.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [postingId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
        <Loader2 className="size-12 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center text-red-500 font-bold">
        {error || "Something went wrong."}
      </div>
    );
  }

  const brief = data.projectBrief;

  const handleStart = () => {
    const sp = new URLSearchParams({
      jobPostingId: data.id,
      task: brief.project_title,
      role: data.roleTitle,
    });
    router.push(`/session/new?${sp}`);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-gray-900 font-sans selection:bg-teal-500/30 overflow-x-hidden relative">
      {/* Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.03] contrast-150 brightness-100" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

      {/* Technical Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[0] opacity-[0.03] animate-[grid-scroll_60s_linear_infinite]" 
           style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-purple-200/20 rounded-full blur-[140px] animate-[drift_20s_infinite_linear]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[60%] h-[60%] bg-teal-100/20 rounded-full blur-[120px] animate-[drift_25s_infinite_linear_reverse]" />
      </div>

      <style jsx>{`
        @keyframes grid-scroll {
          from { background-position: 0 0; }
          to { background-position: 400px 400px; }
        }
        @keyframes drift {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(5%, 10%) rotate(120deg) scale(1.1); }
          66% { transform: translate(-5%, 5%) rotate(240deg) scale(0.9); }
          100% { transform: translate(0, 0) rotate(360deg) scale(1); }
        }
      `}</style>

      <nav className="relative z-50 border-b border-gray-200/50 bg-white/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <BrandMark />
          <Link href="/intake" className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Upload Different Posting
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        <div className="space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold uppercase tracking-widest text-purple-600">
            Step 2: Assessment Brief
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-950">
            {brief.project_title}
          </h1>
          <p className="text-lg text-gray-500 font-medium">Target Role: {data.roleTitle}</p>
        </div>

        <div className="space-y-6">
          <div className="p-8 rounded-[2.5rem] bg-white/40 backdrop-blur-md border border-white/60 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">The Mission</h2>
            <p className="text-gray-700 leading-relaxed font-medium">{brief.task_description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/60 shadow-lg">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                <Clock className="size-4 text-teal-500" /> DURATION
              </div>
              <p className="text-xl font-bold text-gray-950">{brief.expected_duration_minutes} Minutes</p>
            </div>
            <div className="p-6 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/60 shadow-lg">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                <Package className="size-4 text-purple-500" /> MATERIALS
              </div>
              <ul className="text-sm font-bold text-gray-600 space-y-1">
                {brief.materials_needed.map((m, i) => (
                  <li key={i} className="truncate">• {m}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Skills Being Audited</h3>
             <div className="flex flex-wrap gap-3">
                {brief.skills_being_tested.map((s, i) => (
                  <div key={i} className="px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-600">
                    {s}
                  </div>
                ))}
             </div>
          </div>

          <div className="p-6 rounded-[2rem] bg-amber-50 border border-amber-100 flex gap-4 shadow-sm">
            <ShieldCheck className="size-6 text-amber-500 shrink-0" />
            <div className="text-sm text-amber-900 leading-relaxed">
              <strong>Identity Protocol:</strong> Your session will be recorded with <strong>continuous bare-hand biometric lock</strong>. 
              Do not wear gloves — physical markers must be visible for forensic validation.
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white font-bold h-16 rounded-[1.5rem] transition-all shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3 text-lg"
          >
            Start Verified Session
            <Zap className="size-5 fill-current" />
          </button>
        </div>
      </main>
    </div>
  );
}

export default function BriefPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
          <Loader2 className="size-12 text-teal-500 animate-spin" />
        </div>
      }
    >
      <BriefContent />
    </Suspense>
  );
}
