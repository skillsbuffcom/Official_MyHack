"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const profile = localStorage.getItem(`hand_profile_${id}`);
    setHasProfile(!!profile);
  }, [id]);

  if (hasProfile === null) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-12 transition-colors duration-300">
      <div className="fixed top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full">
        <div className="mb-6 text-center">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Step 2 of 3</div>
          <h1 className="text-2xl font-bold">Ready to Record</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Review the checklist before starting your session.
          </p>
        </div>

        <div className="space-y-2 mb-8">
          {[
            { ok: hasProfile, label: "Biometric registration complete" },
            { ok: true, label: "Camera positioned at work bench" },
            { ok: true, label: "Materials and tools within reach" },
            { ok: true, label: "Wearing protective gloves (PPE)" },
            { ok: true, label: "Working area well-lit and clear" },
          ].map(({ ok, label }, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              {ok ? (
                <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              )}
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>

        {!hasProfile && (
          <div className="mb-4 p-4 rounded-xl border border-destructive/20 bg-destructive/[0.05] text-sm text-destructive">
            Biometric registration is missing. Please complete hand registration first.
          </div>
        )}

        {hasProfile ? (
          <button
            onClick={() => router.push(`/session/${id}/record`)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl text-lg transition-colors shadow-lg shadow-primary/20"
          >
            Start Recording →
          </button>
        ) : (
          <button
            onClick={() => router.push(`/session/${id}/verify`)}
            className="w-full border border-border hover:bg-muted/50 py-4 rounded-xl transition-colors font-medium text-muted-foreground"
          >
            Complete Registration First
          </button>
        )}
      </div>
    </div>
  );
}
