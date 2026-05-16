"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Camera } from "lucide-react";

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
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="mb-6 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Step 2 of 3</div>
          <h1 className="text-2xl font-bold">Ready to Record</h1>
          <p className="text-gray-400 text-sm mt-2">
            Review the checklist before starting your session.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {[
            { ok: hasProfile, label: "Biometric registration complete" },
            { ok: true, label: "Camera positioned at work bench" },
            { ok: true, label: "Materials and tools within reach" },
            { ok: true, label: "Wearing protective gloves (PPE)" },
            { ok: true, label: "Working area well-lit and clear" },
          ].map(({ ok, label }, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
              {ok ? (
                <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>

        {!hasProfile && (
          <div className="mb-4 p-4 rounded-xl border border-red-800/40 bg-red-900/10 text-sm text-red-300">
            Biometric registration is missing. Please complete hand registration first.
          </div>
        )}

        {hasProfile ? (
          <button
            onClick={() => router.push(`/session/${id}/record`)}
            className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-4 rounded-xl text-lg transition-colors"
          >
            Start Recording →
          </button>
        ) : (
          <button
            onClick={() => router.push(`/session/${id}/verify`)}
            className="w-full border border-white/20 hover:border-white/40 py-4 rounded-xl transition-colors"
          >
            Complete Registration First
          </button>
        )}
      </div>
    </div>
  );
}
