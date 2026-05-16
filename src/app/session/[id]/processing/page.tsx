"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Shield, Zap, Search, Fingerprint, FileCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const POLL_INTERVAL_MS = 3000;

const STATUS_STEPS = [
  { status: "PROCESSING",         label: "Initialising forensic audit",       icon: Search },
  { status: "DETECTING_ACTIONS",  label: "Extracting action sequences",        icon: Zap },
  { status: "SYNTHESISING",       label: "Evaluating benchmark criteria",      icon: Fingerprint },
  { status: "WRITING_CERTIFICATE",label: "Generating cryptographic seal",      icon: FileCheck },
  { status: "COMPLETE",           label: "Audit complete",                     icon: Shield },
];

export default function ProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState("PROCESSING");
  const [certId, setCertId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/${id}/status`);
        const data = await res.json();
        setCurrentStatus(data.status);

        if (data.status === "COMPLETE" && data.certificateId) {
          setCertId(data.certificateId);
          clearInterval(interval);
          setTimeout(() => router.push(`/certificate/${data.certificateId}`), 2000);
        }

        if (data.status === "FAILED") {
          setFailed(true);
          clearInterval(interval);
        }
      } catch {
        // Poll again next tick
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [id, router]);

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-x-hidden relative flex flex-col items-center justify-center transition-colors duration-300">
      <div className="fixed top-6 right-6 z-[60]">
        <ThemeToggle />
      </div>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-primary/[0.04] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[60%] h-[60%] bg-primary/[0.04] rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] animate-[grid-scroll_60s_linear_infinite]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
      </div>

      <div className="max-w-xl w-full relative z-10 px-6">
        <div className="flex justify-center mb-16">
          <BrandMark />
        </div>

        {failed ? (
          <div className="text-center animate-in fade-in zoom-in duration-500 bg-card p-12 rounded-3xl border border-border shadow-2xl">
            <XCircle className="size-20 text-destructive mx-auto mb-6" />
            <h1 className="text-3xl font-black mb-4 tracking-tight">Audit Terminated</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto">
              The neural evaluation encountered a structural error. This may be due to insufficient video evidence or a biometric mismatch.
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-bold text-lg transition-colors shadow-xl shadow-primary/10 active:scale-95"
            >
              Return to Home
            </button>
          </div>
        ) : certId ? (
          <div className="text-center animate-in fade-in zoom-in duration-700 bg-card p-16 rounded-3xl border border-border shadow-2xl">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-primary blur-3xl opacity-15 animate-pulse" />
              <CheckCircle className="size-24 text-primary relative" />
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">Audit Verified</h1>
            <p className="text-primary font-bold text-xs uppercase tracking-[0.3em] animate-pulse">
              Transferring Encrypted Credential…
            </p>
          </div>
        ) : (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center space-y-6">
              <div className="relative inline-flex items-center justify-center p-6">
                <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
                <Loader2 className="size-12 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tight">Forensic Neural Audit</h1>
                <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
                  Cross-referencing hand actions against job-specific technical benchmarks.
                </p>
              </div>
            </div>

            <div className="space-y-1 bg-card p-8 rounded-3xl border border-border shadow-xl">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStepIdx;
                const active = i === currentStepIdx;
                const Icon = step.icon;
                return (
                  <div
                    key={step.status}
                    className={`flex items-center gap-6 py-3 transition-all duration-500 ${
                      active ? "text-foreground translate-x-2" : done ? "text-primary/40" : "text-muted-foreground/30"
                    }`}
                  >
                    <div className={`p-3 rounded-2xl border transition-all ${
                      active ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-transparent border-transparent"
                    }`}>
                      <Icon className={`size-6 ${active ? "animate-pulse" : ""}`} />
                    </div>
                    <div className="flex-1">
                      <span className={`text-lg font-bold ${active ? "text-foreground" : ""}`}>{step.label}</span>
                      {active && (
                        <div className="h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-primary w-3/5 animate-[shimmer_2s_infinite]" />
                        </div>
                      )}
                    </div>
                    {done && <CheckCircle className="size-5 text-primary shrink-0" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-12 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
              <div className="flex items-center gap-2">
                <div className="size-1.5 bg-primary rounded-full" />
                Neural Audit Active
              </div>
              <div className="flex items-center gap-2">
                <div className="size-1.5 bg-primary rounded-full" />
                Zero-Trust Protocol
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
