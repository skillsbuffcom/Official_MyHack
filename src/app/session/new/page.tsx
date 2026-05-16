"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="min-h-screen bg-background text-foreground px-6 py-12 transition-colors duration-300">
      <div className="fixed top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          {jobPostingId ? (
            <a href={`/intake/brief?id=${jobPostingId}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to brief
            </a>
          ) : (
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Home
            </a>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2">Start Session</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Your session will be biometrically verified. Make sure your hands are clearly visible and well-lit.
        </p>

        {taskFromBrief && (
          <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/[0.05]">
            <div className="text-xs text-primary font-semibold mb-1">Assessment</div>
            <p className="text-sm font-medium text-foreground">{taskFromBrief}</p>
            {roleFromBrief && (
              <p className="text-xs text-muted-foreground mt-1">{roleFromBrief}</p>
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
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">IC / Passport Number</label>
            <input
              value={icNumber}
              onChange={(e) => setIcNumber(e.target.value)}
              placeholder="e.g. 990101-10-1234"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">
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
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
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
              className="w-full border border-amber-500/25 hover:bg-amber-500/[0.08] text-amber-700 dark:text-amber-400 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
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
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <NewSessionContent />
    </Suspense>
  );
}
