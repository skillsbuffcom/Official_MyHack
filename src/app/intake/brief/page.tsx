"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Clock, Package, ChevronLeft, ShieldCheck, Zap, Briefcase, Target, Brain } from "lucide-react";
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
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-primary/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[60%] h-[60%] bg-primary/4 rounded-full blur-[120px]" />
      </div>

      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
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

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-16 md:pt-32">
        <div className="space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">
            Step 2: Assessment Brief
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            {brief.project_title}
          </h1>
        </div>

        <div className="space-y-3">
          {/* Target Role + Duration side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="size-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Target Role</p>
                <p className="text-base font-bold text-foreground truncate">{data.roleTitle}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Duration</p>
                <p className="text-base font-bold text-foreground">{brief.expected_duration_minutes} Minutes</p>
              </div>
            </div>
          </div>

          {/* Mission */}
          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="size-5 text-primary" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">The Mission</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{brief.task_description}</p>
          </div>

          {/* Materials */}
          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="size-5 text-primary" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Materials Needed</p>
            </div>
            <ul className="text-sm font-medium text-muted-foreground space-y-1">
              {brief.materials_needed.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          </div>

          {/* Skills */}
          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="size-5 text-primary" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Skills Being Audited</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {brief.skills_being_tested.map((s, i) => (
                <div key={i} className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Identity Protocol */}
          <div className="p-5 rounded-2xl flex gap-4" style={{ backgroundColor: '#fef3c7', border: '2px solid #f59e0b' }}>
            <div className="size-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#d97706' }}>
              <ShieldCheck className="size-6" style={{ color: '#ffffff' }} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-tight" style={{ color: '#78350f' }}>Identity Protocol</h4>
              <p className="text-[13px] leading-relaxed font-medium" style={{ color: '#92400e' }}>
                Your session will be recorded with <strong>continuous bare-hand biometric lock</strong>. Do not wear gloves — physical markers must be visible for forensic validation.
              </p>
            </div>
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
