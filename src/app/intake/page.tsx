"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import { Upload, FileImage, Loader2, AlertCircle } from "lucide-react";
=======
import { Upload, FileImage, Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
>>>>>>> 08bcee1 (feat: Luxury Premium UI overhaul and Forensic Dual-Hand verification logic)

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
    <div className="min-h-screen bg-[#FDFDFF] text-gray-900 font-sans selection:bg-teal-500/30 overflow-x-hidden relative">
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

      <style jsx>{`
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
      `}</style>

      <nav className="relative z-50 border-b border-gray-200/50 bg-white/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <BrandMark />
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        <div className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] font-bold uppercase tracking-widest text-teal-600">
            Step 1: Technical Intake
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-950">
            Initialize Assessment
          </h1>
          <p className="text-lg text-gray-600 max-w-xl">
            VeriPro extracts the required practical skills from your job posting to build a deterministic biometric brief.
          </p>
        </div>

        {/* Duration Selector - Integrated from HEAD and styled for Luxury UI */}
        <div className="mb-10 p-8 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2.5rem] shadow-lg">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 ml-1">Complexity & Target Duration</label>
          <div className="grid grid-cols-3 gap-4">
            {[5, 10, 15].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`py-4 px-3 rounded-2xl text-sm font-bold transition-all border-2 ${
                  duration === d
                    ? "bg-teal-500/10 border-teal-500 text-teal-600 shadow-inner"
                    : "bg-white/50 border-gray-100 text-gray-400 hover:border-gray-200"
                }`}
              >
                {d} MINS
                <span className="block text-[9px] opacity-60 font-bold tracking-widest mt-1">
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
              className={`group relative overflow-hidden rounded-[2.5rem] p-16 text-center cursor-pointer transition-all duration-500 border-2 border-dashed ${
                dragging
                  ? "border-teal-500 bg-teal-50/50 shadow-2xl shadow-teal-500/10"
                  : "border-gray-200 bg-white/40 backdrop-blur-md hover:border-gray-300 hover:bg-white/60 hover:shadow-xl"
              }`}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                  <div className="relative size-20">
                    <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
                  </div>
                  <p className="text-lg font-bold text-gray-950">Gemini Neural Extraction...</p>
                  <p className="text-sm text-gray-500">Building your forensic skill map</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="size-20 rounded-3xl bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
                    {dragging ? (
                      <Upload className="size-10 text-white" />
                    ) : (
                      <FileImage className="size-10 text-white" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-gray-950">Drop your job posting here</p>
                    <p className="text-sm text-gray-500">Supports high-res PNG, JPG, or PDF (Max 10MB)</p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gray-950 text-white text-[10px] font-bold uppercase tracking-widest group-hover:bg-teal-600 transition-colors">
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
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in slide-in-from-top-2">
                <AlertCircle className="size-5" />
                {error}
              </div>
            )}

            <button
              onClick={() => setManualMode(true)}
              className="w-full text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-teal-600 transition-colors"
            >
              Enter skills manually instead →
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-8 bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[2.5rem] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Job Title</label>
                <input
                  value={manualRole}
                  onChange={(e) => setManualRole(e.target.value)}
                  placeholder="e.g. Lead Electrical Fitter"
                  className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-6 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Key Requirements (One per line)</label>
                <textarea
                  value={manualSkills}
                  onChange={(e) => setManualSkills(e.target.value)}
                  placeholder={"IEC Standard Cable Termination\nContinuity Testing Protocols\nSchematic Interpretation"}
                  rows={5}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all resize-none"
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
                className="w-full bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white font-bold h-14 rounded-2xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : null}
                Generate Assessment Brief
              </button>
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="w-full text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
              >
                Return to upload
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
