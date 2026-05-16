"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const POLL_INTERVAL_MS = 3000;

const STATUS_STEPS = [
  { status: "PROCESSING", label: "Processing session" },
  { status: "DETECTING_ACTIONS", label: "Analysing actions with Gemini ER" },
  { status: "SYNTHESISING", label: "Evaluating benchmarks and skills" },
  { status: "WRITING_CERTIFICATE", label: "Generating certificate" },
  { status: "COMPLETE", label: "Certificate ready" },
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
          }, 1500);
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
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {failed ? (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Session Failed</h1>
            <p className="text-gray-400 mb-6">
              Something went wrong processing your session. Please try again.
            </p>
            <a href="/" className="text-teal-400 hover:underline">
              Return home
            </a>
          </>
        ) : certId ? (
          <>
            <CheckCircle className="w-16 h-16 text-teal-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Certificate Ready</h1>
            <p className="text-gray-400">Redirecting to your certificate…</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-teal-400 animate-spin mx-auto mb-8" />
            <h1 className="text-2xl font-bold mb-2">Processing Your Session</h1>
            <p className="text-gray-400 text-sm mb-8">
              AI is evaluating your work. This usually takes 30–90 seconds.
            </p>

            <div className="space-y-3 text-left">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStepIdx;
                const active = i === currentStepIdx;
                return (
                  <div
                    key={step.status}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      active
                        ? "bg-teal-900/20 border border-teal-700/50"
                        : done
                        ? "opacity-50"
                        : "opacity-30"
                    }`}
                  >
                    {done ? (
                      <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" />
                    ) : active ? (
                      <Loader2 className="w-5 h-5 text-teal-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
                    )}
                    <span className="text-sm">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
