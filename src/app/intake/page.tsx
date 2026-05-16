"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileImage, Loader2, AlertCircle, ChevronLeft, Zap } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export default function IntakePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualSkills, setManualSkills] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(15);

  const handleFile = useCallback(
    async (file: File) => {
      if (!["image/png", "image/jpeg", "application/pdf"].includes(file.type)) {
        setError("Please upload a PNG, JPG, or PDF file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File must be 10 MB or smaller.");
        return;
      }

      setError("");
      setLoading(true);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("duration", duration.toString());

      try {
        const res = await fetch("/api/job-intake", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Extraction failed. Please try again.");
          setLoading(false);
          return;
        }

        router.push(`/intake/brief?id=${data.id}`);
      } catch {
        setError("Network error. Please try again.");
        setLoading(false);
      }
    },
    [router, duration]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRole.trim() || !manualSkills.trim()) {
      setError("Please enter a role title and at least one skill.");
      return;
    }

    setLoading(true);
    const skills = manualSkills
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/job-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual: true, roleTitle: manualRole, requiredSkills: skills, duration }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/intake/brief?id=${data.id}`);
      } else {
        setError(data.error ?? "Failed to create assessment.");
        setLoading(false);
      }
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-x-hidden relative transition-colors duration-300">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-primary/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[60%] h-[60%] bg-primary/4 rounded-full blur-[120px]" />
      </div>

      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-6 pt-20 pb-20 md:pt-32">
        <div className="max-w-4xl mx-auto">
        <div className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">
            Step 1: Technical Intake
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Initialize Assessment
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            VeriPro extracts the required practical skills from your role description to build a deterministic biometric brief.
          </p>
        </div>

        {/* Duration Selector - Integrated from HEAD and styled for Luxury UI */}
        <div className="mb-10 p-8 bg-card backdrop-blur-md border border-border rounded-4xl shadow-lg">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 ml-1">Complexity & Target Duration</label>
          <div className="grid grid-cols-3 gap-4">
            {[5, 10, 15].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`py-4 px-3 rounded-2xl text-sm font-bold transition-all border-2 ${
                  duration === d
                    ? "bg-primary/10 border-primary text-primary shadow-inner"
                    : "bg-muted border-border text-muted-foreground hover:border-muted-foreground/30"
                }`}
              >
                <span className="block">{d}</span>
                <span className="block text-[10px] opacity-80 mb-1">MINS</span>
                <span className="block text-[9px] opacity-60 font-bold tracking-widest">
                  {d === 5 ? "BASIC" : d === 10 ? "STANDARD" : "FORENSIC"}
                </span>
              </button>
            ))}
          </div>
        </div>
        {!manualMode ? (
          <div className="space-y-8">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`group relative overflow-hidden rounded-4xl p-16 text-center cursor-pointer transition-all duration-500 border-2 border-dashed ${
                dragging
                  ? "border-primary bg-primary/4 shadow-2xl shadow-primary/10"
                  : "border-border bg-card backdrop-blur-md hover:border-muted-foreground/30 hover:bg-muted/50 hover:shadow-xl"
              }`}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                  <div className="relative size-20">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                  <p className="text-lg font-bold text-foreground">Gemini Neural Extraction...</p>
                  <p className="text-sm text-muted-foreground">Building your forensic skill map</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="size-20 rounded-3xl border-2 border-primary flex items-center justify-center shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform">
                    {dragging ? (
                      <Upload className="size-10 text-primary" />
                    ) : (
                      <FileImage className="size-10 text-primary" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-foreground">Drop your role description here</p>
                    <p className="text-sm text-muted-foreground">Supports high-res PNG, JPG, or PDF (Max 10MB)</p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                    Browse Files
                  </div>
                </div>
              )}
            </div>
            
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/6 border border-destructive/20 text-destructive text-sm font-medium animate-in slide-in-from-top-2">
                <AlertCircle className="size-5" />
                {error}
              </div>
            )}

            <button
              onClick={() => setManualMode(true)}
              className="w-full text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              Enter skills manually instead →
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-8 bg-card backdrop-blur-md border border-border p-10 rounded-4xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Role Title</label>
                <input
                  value={manualRole}
                  onChange={(e) => setManualRole(e.target.value)}
                  placeholder="e.g. Lead Electrical Fitter"
                  className="w-full h-14 bg-background border border-border rounded-2xl px-6 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Key Requirements (One per line)</label>
                <textarea
                  value={manualSkills}
                  onChange={(e) => setManualSkills(e.target.value)}
                  placeholder={"IEC Standard Cable Termination\nContinuity Testing Protocols\nSchematic Interpretation"}
                  rows={5}
                  className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                <AlertCircle className="size-5" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 rounded-2xl transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : null}
                Generate Assessment Brief
              </button>
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Return to upload
              </button>
            </div>
            <div className="pt-8 border-t border-gray-100 flex flex-col items-center gap-4">
               <button
                onClick={() => router.push("/intake/brief?id=demo-bypass")}
                className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400 hover:text-purple-600 transition-colors flex items-center gap-2"
              >
                <Zap className="size-3" />
                Quick Demo (Bypass)
              </button>
              <p className="text-[10px] text-gray-400 font-medium tracking-tight">For evaluation and demonstration purposes only.</p>
            </div>
          </form>
        )}
        </div>
      </main>
    </div>
  );
}
