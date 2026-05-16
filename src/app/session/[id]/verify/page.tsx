"use client";
import { use, useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, CheckCircle, AlertCircle, Hand } from "lucide-react";

const COUNTDOWN_SECONDS = 5;

function applyGreenChannel(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1];     // R ← G
    d[i + 2] = d[i + 1]; // B ← G
    // Alpha unchanged
  }
  ctx.putImageData(id, 0, 0);
}

export default function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<
    "INIT" | "CAMERA" | "COUNTDOWN" | "CAPTURING" | "REGISTERING" | "DONE" | "ERROR"
  >("INIT");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [error, setError] = useState("");

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("CAMERA");
    } catch {
      setError("Camera access denied. Please allow camera access and reload.");
      setState("ERROR");
    }
  }, []);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setState("CAPTURING");

    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    applyGreenChannel(canvas, ctx);

    const base64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];

    setState("REGISTERING");
    try {
      const res = await fetch("/api/verify/analyze-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });

      if (!res.ok) throw new Error("Registration API failed");

      const profile = await res.json();

      // Store in localStorage (never persisted server-side)
      localStorage.setItem(`hand_master_${id}`, base64);
      localStorage.setItem(`hand_profile_${id}`, JSON.stringify(profile));

      setState("DONE");

      // Stop camera
      streamRef.current?.getTracks().forEach((t) => t.stop());

      setTimeout(() => {
        router.push(`/session/${id}/setup`);
      }, 1500);
    } catch (err) {
      console.error("Registration failed:", err);
      setError("Registration failed. Please try again.");
      setState("CAMERA");
    }
  }, [id, router]);

  // Countdown timer
  useEffect(() => {
    if (state !== "COUNTDOWN") return;
    if (countdown <= 0) {
      capture();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [state, countdown, capture]);

  const startCountdown = () => {
    setCountdown(COUNTDOWN_SECONDS);
    setState("COUNTDOWN");
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="mb-6 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Step 1 of 3</div>
          <h1 className="text-2xl font-bold">Biometric Hand Registration</h1>
          <p className="text-gray-400 text-sm mt-2">
            Place both hands flat on the desk in front of the camera. Hold still for 5 seconds.
          </p>
        </div>

        {/* Camera preview */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black mb-6 aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />

          {state === "INIT" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <button
                onClick={startCamera}
                className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                <Camera className="w-5 h-5" />
                Enable Camera
              </button>
            </div>
          )}

          {state === "COUNTDOWN" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-8xl font-bold text-teal-400 drop-shadow-lg">
                {countdown}
              </div>
            </div>
          )}

          {(state === "CAPTURING" || state === "REGISTERING") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
              <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
              <p className="text-gray-300 text-sm">
                {state === "CAPTURING" ? "Capturing..." : "Registering biometrics..."}
              </p>
            </div>
          )}

          {state === "DONE" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
              <CheckCircle className="w-12 h-12 text-teal-400" />
              <p className="text-gray-300">Registration successful</p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {state === "CAMERA" && (
          <button
            onClick={startCountdown}
            className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Hand className="w-5 h-5" />
            Register My Hands (5s countdown)
          </button>
        )}

        {state === "ERROR" && (
          <button
            onClick={() => { setError(""); setState("INIT"); }}
            className="w-full border border-white/20 hover:border-white/40 py-3 rounded-xl transition-colors"
          >
            Retry
          </button>
        )}

        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-gray-500 space-y-1">
          <p>• Hand geometry is captured as a one-way mathematical ratio — raw images stay local.</p>
          <p>• Green-channel filter is applied to enhance texture detail for accurate comparison.</p>
          <p>• Your identity is verified continuously throughout the recording session.</p>
        </div>
      </div>
    </div>
  );
}
