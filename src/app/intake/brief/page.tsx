"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Clock, Package, ChevronLeft, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-12 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-destructive font-bold">
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-x-hidden relative transition-colors duration-300">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-primary/[0.04] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[60%] h-[60%] bg-primary/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-4">
            <Link href="/intake" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Upload Different Posting
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        <div className="space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">
            Step 2: Assessment Brief
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            {brief.project_title}
          </h1>
          <p className="text-lg text-muted-foreground font-medium">Target Role: {data.roleTitle}</p>
        </div>

        <div className="space-y-5">
          <div className="p-8 rounded-2xl bg-card border border-border">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">The Mission</h2>
            <p className="text-foreground leading-relaxed">{brief.task_description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                <Clock className="size-4 text-primary" /> Duration
              </div>
              <p className="text-xl font-bold text-foreground">{brief.expected_duration_minutes} Minutes</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                <Package className="size-4 text-primary" /> Materials
              </div>
              <ul className="text-sm font-medium text-muted-foreground space-y-1">
                {brief.materials_needed.map((m, i) => (
                  <li key={i} className="truncate">• {m}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Skills Being Audited</h3>
            <div className="flex flex-wrap gap-2">
              {brief.skills_being_tested.map((s, i) => (
                <div key={i} className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-amber-400/20 dark:bg-amber-500/[0.08] border border-amber-400 dark:border-amber-500/25 flex gap-4">
            <ShieldCheck className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>Identity Protocol:</strong> Your session will be recorded with{" "}
              <strong>continuous bare-hand biometric lock</strong>. Do not wear gloves — physical markers must be visible for forensic validation.
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 rounded-2xl transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-[15px]"
          >
            Start Verified Session
            <Zap className="size-4 fill-current" />
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
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="size-12 text-primary animate-spin" />
        </div>
      }
    >
      <BriefContent />
    </Suspense>
  );
}
