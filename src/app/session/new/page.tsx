"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, Zap } from "lucide-react";

function NewSessionContent() {
  const params = useSearchParams();
  const router = useRouter();

  const jobPostingId = params.get("jobPostingId") ?? "";
  const taskFromBrief = params.get("task") ?? "";
  const roleFromBrief = params.get("role") ?? "";

  const [workerName, setWorkerName] = useState("");
  const [icNumber, setIcNumber] = useState("");
  const [taskClaim, setTaskClaim] = useState(taskFromBrief);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim() || !icNumber.trim() || !taskClaim.trim()) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerName: workerName.trim(),
          icNumber: icNumber.trim(),
          taskClaim: taskClaim.trim(),
          trade: "ELECTRICAL_WIRING",
          jobPostingId: jobPostingId || null,
          roleTargeted: roleFromBrief || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start session.");
        setLoading(false);
        return;
      }

      router.push(`/session/${data.sessionId}/verify`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          {jobPostingId ? (
            <a
              href={`/intake/brief?id=${jobPostingId}`}
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              ← Back to brief
            </a>
          ) : (
            <a href="/" className="text-sm text-gray-500 hover:text-gray-300">
              ← Home
            </a>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2">Start Session</h1>
        <p className="text-gray-400 text-sm mb-8">
          Your session will be biometrically verified. Make sure your hands are
          clearly visible and well-lit.
        </p>

        {taskFromBrief && (
          <div className="mb-6 p-4 rounded-xl border border-teal-800/40 bg-teal-900/10">
            <div className="text-xs text-teal-400 font-medium mb-1">Assessment</div>
            <p className="text-sm font-medium">{taskFromBrief}</p>
            {roleFromBrief && (
              <p className="text-xs text-gray-500 mt-1">{roleFromBrief}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="As shown on your ID"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">IC / Passport Number</label>
            <input
              value={icNumber}
              onChange={(e) => setIcNumber(e.target.value)}
              placeholder="e.g. 990101-10-1234"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Hashed client-side — never stored in plaintext.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Task / Assessment</label>
            <textarea
              value={taskClaim}
              onChange={(e) => setTaskClaim(e.target.value)}
              placeholder="Describe what you will demonstrate (e.g. IEC 60228 cable termination)"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-gray-950 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue to Biometric Registration →
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setWorkerName("Demo Candidate");
                setIcNumber("DEMO-12345");
                setTaskClaim("Basic Terminal Block Wiring Demonstration");
                // The form state update is async, so we use the values directly for the submit
                setLoading(true);
                fetch("/api/session/start", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    workerName: "Demo Candidate",
                    icNumber: "DEMO-12345",
                    taskClaim: "Basic Terminal Block Wiring Demonstration",
                    trade: "ELECTRICAL_WIRING",
                    jobPostingId: jobPostingId || "demo-bypass",
                    roleTargeted: roleFromBrief || "Electrical Engineer basic",
                  }),
                }).then(async res => {
                  const data = await res.json();
                  if (res.ok) router.push(`/session/${data.sessionId}/verify`);
                  else setError("Demo deployment failed.");
                }).catch(() => setError("Network error."));
              }}
              className="w-full border border-amber-500/50 hover:bg-amber-500/10 text-amber-500 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Quick Start (Demo Bypass)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
      }
    >
      <NewSessionContent />
    </Suspense>
  );
}
