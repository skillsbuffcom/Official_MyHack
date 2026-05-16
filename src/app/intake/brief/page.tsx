"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, Clock, Package } from "lucide-react";

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400">
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
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/intake" className="text-sm text-gray-500 hover:text-gray-300">← Upload different posting</a>
        </div>

        <div className="mb-2 text-sm text-teal-400 font-medium uppercase tracking-widest">
          Assessment Brief
        </div>
        <h1 className="text-4xl font-bold mb-1">{brief.project_title}</h1>
        <p className="text-gray-400 text-lg mb-6">Role: {data.roleTitle}</p>

        <div className="p-8 rounded-xl border border-white/10 bg-white/[0.02] mb-6">
          <h2 className="text-xl font-semibold mb-4">Task</h2>
          <p className="text-gray-200 text-lg leading-relaxed">{brief.task_description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 uppercase tracking-widest">
              <Clock className="w-4 h-4" /> DURATION
            </div>
            <p className="text-2xl font-bold">{brief.expected_duration_minutes} minutes</p>
          </div>
          <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 uppercase tracking-widest">
              <Package className="w-4 h-4" /> MATERIALS
            </div>
            <ul className="text-base text-gray-300 space-y-1">
              {brief.materials_needed.map((m, i) => (
                <li key={i} className="truncate">• {m}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-3">
            Skills Being Tested
          </h3>
          <div className="flex flex-wrap gap-2">
            {brief.skills_being_tested.map((s, i) => (
              <span
                key={i}
                className="text-sm bg-teal-900/40 text-teal-300 border border-teal-700/50 rounded-full px-4 py-1.5"
              >
                {s}
              </span>
            ))}
          </div>
        </div>


        <div className="p-6 rounded-xl border border-amber-800/40 bg-amber-900/10 mb-8 flex gap-4">
          <CheckCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-base text-amber-200">
            <strong className="block text-lg mb-1">Before you start:</strong> 
            <p>Set up your workbench with the listed materials. Your session will be recorded with continuous biometric identity lock. Ensure your hands are clearly visible to the camera at all times.</p>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-4 rounded-xl text-lg transition-colors"
        >
          Start Verified Session →
        </button>
      </div>
    </div>
  );
}

export default function BriefPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
      }
    >
      <BriefContent />
    </Suspense>
  );
}
