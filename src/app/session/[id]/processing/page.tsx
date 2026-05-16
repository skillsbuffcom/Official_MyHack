"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Shield, Zap, Search, Fingerprint, FileCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const POLL_INTERVAL_MS = 3000;

const STATUS_STEPS = [
  { status: "PROCESSING", label: "Initialising forensic audit", icon: Search },
  { status: "DETECTING_ACTIONS", label: "Extracting action sequences", icon: Zap },
  { status: "SYNTHESISING", label: "Evaluating benchmark criteria", icon: Fingerprint },
  { status: "WRITING_CERTIFICATE", label: "Generating cryptographic seal", icon: FileCheck },
  { status: "COMPLETE", label: "Audit complete", icon: Shield },
];

export default function ProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
          setTimeout(() => {
            router.push(`/certificate/${data.certificateId}`);
          }, 2000);
        }

        if (data.status === "FAILED") {
          setFailed(true);
          clearInterval(interval);
        }
      } catch {
        // Poll again
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [id, router]);

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-gray-900 font-sans selection:bg-teal-500/30 overflow-x-hidden relative flex flex-col items-center justify-center">
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

      <style jsx global>{`
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
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>

      <div className="max-w-xl w-full relative z-10 px-6">
        <div className="flex justify-center mb-16">
          <BrandMark />
        </div>

        {failed ? (
          <div className="text-center animate-in fade-in zoom-in duration-500 bg-white/40 backdrop-blur-md p-12 rounded-[3rem] border border-red-100 shadow-2xl">
            <XCircle className="size-20 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 tracking-tight text-gray-950">Audit Terminated</h1>
            <p className="text-gray-600 mb-8 leading-relaxed max-w-sm mx-auto font-medium">
              The neural evaluation encountered a structural error. This may be due to insufficient video evidence or a biometric mismatch.
            </p>
            <button 
              onClick={() => router.push("/")}
              className="bg-gray-950 hover:bg-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-gray-950/10 active:scale-95"
            >
              Return to Control Panel
            </button>
          </div>
        ) : certId ? (
          <div className="text-center animate-in fade-in zoom-in duration-700 bg-white/40 backdrop-blur-md p-16 rounded-[4rem] border border-teal-100 shadow-2xl">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-teal-500 blur-3xl opacity-20 animate-pulse" />
              <CheckCircle className="size-24 text-teal-500 relative" />
            </div>
            <h1 className="text-4xl font-bold mb-4 tracking-tight text-gray-950">Audit Verified</h1>
            <p className="text-teal-600 font-bold text-xs uppercase tracking-[0.3em] animate-pulse">
              Transferring Encrypted Credential...
            </p>
          </div>
        ) : (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center space-y-6">
              <div className="relative inline-flex items-center justify-center p-6">
                 <div className="absolute inset-0 border border-teal-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                 <div className="absolute inset-0 border-t-2 border-teal-500 rounded-full animate-spin" />
                 <Loader2 className="size-12 text-teal-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-gray-950">Forensic Neural Audit</h1>
                <p className="text-gray-500 font-medium text-lg max-w-sm mx-auto">
                  Cross-referencing hand actions against job-specific technical benchmarks.
                </p>
              </div>
            </div>

            <div className="space-y-2 bg-white/40 backdrop-blur-md border border-white/60 p-8 rounded-[3rem] shadow-xl">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStepIdx;
                const active = i === currentStepIdx;
                const Icon = step.icon;
                return (
                  <div
                    key={step.status}
                    className={`flex items-center gap-6 py-3 transition-all duration-500 ${
                      active
                        ? "text-gray-900 translate-x-2"
                        : done
                        ? "text-teal-600/40"
                        : "text-gray-300"
                    }`}
                  >
                    <div className={`p-3 rounded-2xl border transition-all ${
                      active ? "bg-teal-500 text-white border-teal-500 shadow-lg shadow-teal-500/20" : "bg-transparent border-transparent"
                    }`}>
                      <Icon className={`size-6 ${active ? "animate-pulse" : ""}`} />
                    </div>
                    <div className="flex-1">
                      <span className={`text-lg font-bold ${active ? "text-gray-950" : ""}`}>{step.label}</span>
                      {active && (
                        <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-teal-500 to-purple-600 animate-[shimmer_2s_infinite]" style={{ width: '60%' }} />
                        </div>
                      )}
                    </div>
                    {done && <CheckCircle className="size-5 text-teal-500 shrink-0" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-12 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
               <div className="flex items-center gap-2">
                 <div className="size-1.5 bg-teal-500 rounded-full" />
                 Neural Audit Active
               </div>
               <div className="flex items-center gap-2">
                 <div className="size-1.5 bg-purple-500 rounded-full" />
                 Zero-Trust Protocol
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
