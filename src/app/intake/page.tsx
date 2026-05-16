"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileImage, Loader2, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-300">← Back to home</a>
        </div>

        <h1 className="text-3xl font-bold mb-2">Upload a Job Posting</h1>
        <p className="text-gray-400 mb-8">
          Drag in a screenshot of any hands-on technical job posting. VeriPro will extract the required skills and generate a tailored assessment brief.
        </p>

        {/* Duration Selector */}
        <div className="mb-8 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
          <label className="block text-sm font-medium text-gray-300 mb-3">Project Duration & Complexity</label>
          <div className="grid grid-cols-3 gap-3">
            {[5, 10, 15].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                  duration === d
                    ? "bg-teal-500/20 border-teal-500 text-teal-400"
                    : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                }`}
              >
                {d} mins
                <span className="block text-[10px] opacity-60 font-normal">
                  {d === 5 ? "Easy" : d === 10 ? "Medium" : "Hard"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {!manualMode ? (
          <>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-teal-400 bg-teal-900/20"
                  : "border-white/20 hover:border-white/40 bg-white/[0.02]"
              }`}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
                  <p className="text-gray-400">Extracting skills with Gemini Vision…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-teal-900/40 flex items-center justify-center">
                    {dragging ? (
                      <Upload className="w-8 h-8 text-teal-400" />
                    ) : (
                      <FileImage className="w-8 h-8 text-teal-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">Drop your job posting here</p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG, or PDF up to 10 MB</p>
                  </div>
                  <p className="text-xs text-gray-600">or click to browse</p>
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
              <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              onClick={() => setManualMode(true)}
              className="mt-6 w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Can&apos;t upload an image? Enter skills manually →
            </button>
          </>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <input
                value={manualRole}
                onChange={(e) => setManualRole(e.target.value)}
                placeholder="e.g. Electrical Technician – Automation"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Required Skills (one per line)</label>
              <textarea
                value={manualSkills}
                onChange={(e) => setManualSkills(e.target.value)}
                placeholder={"cable termination to IEC spec\noscilloscope use\ncontinuity testing"}
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal-500 resize-none font-mono"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-gray-950 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Generate Assessment Brief
            </button>
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-300"
            >
              ← Back to image upload
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
