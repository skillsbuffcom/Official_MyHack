"use client";
import { use, useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldAlert, Loader2, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const HAND_LOSS_TIMEOUT_MS = 1500;
const GESTURE_HOLD_MS = 4000;
const BLUR_THRESHOLD = 50;
const BLUR_ATTEMPTS = 2;
const BLUR_ATTEMPT_INTERVAL_MS = 150;
const CHUNK_INTERVAL_MS = 10000;
const ACTION_INTERVAL_MS = 10000;
const MAX_FLAGS = 3;

function laplacianVariance(imageData: ImageData): number {
  const { data, width, height } = imageData;
  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const grayCenter = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const idxN = ((y - 1) * width + x) * 4;
      const idxS = ((y + 1) * width + x) * 4;
      const idxW = (y * width + (x - 1)) * 4;
      const idxE = (y * width + (x + 1)) * 4;
      const neighbors =
        (0.299 * data[idxN] + 0.587 * data[idxN + 1] + 0.114 * data[idxN + 2] +
         0.299 * data[idxS] + 0.587 * data[idxS + 1] + 0.114 * data[idxS + 2] +
         0.299 * data[idxW] + 0.587 * data[idxW + 1] + 0.114 * data[idxW + 2] +
         0.299 * data[idxE] + 0.587 * data[idxE + 1] + 0.114 * data[idxE + 2]) / 4;
      sum += (grayCenter - neighbors) ** 2;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function applyGreenChannel(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1];
    d[i + 2] = d[i + 1];
  }
  ctx.putImageData(id, 0, 0);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const handLossTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef(0);
  const recordingStartRef = useRef<Date | null>(null);

  const [status, setStatus] = useState<"INIT" | "CAMERA" | "RECORDING" | "FINISHING">("INIT");
  const [biometricState, setBiometricState] = useState<"LOCKED" | "SCANNING" | "LOST" | "CHECKING">("LOST");
  const [flagCount, setFlagCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [handsPresent, setHandsPresent] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const masterBase64 = useRef<string>("");
  const profileData = useRef<Record<string, unknown>>({});

  useEffect(() => {
    masterBase64.current = localStorage.getItem(`hand_master_${id}`) ?? "";
    const raw = localStorage.getItem(`hand_profile_${id}`);
    profileData.current = raw ? JSON.parse(raw) : {};
  }, [id]);

  const captureFrame = useCallback(async (): Promise<{ base64: string; blurScore: number } | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let best = { base64: "", blurScore: -1 };

    for (let i = 0; i < BLUR_ATTEMPTS; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, BLUR_ATTEMPT_INTERVAL_MS));
      ctx.drawImage(video, 0, 0);
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const blurScore = laplacianVariance(id);
      if (blurScore > best.blurScore) {
        const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        best = { base64, blurScore };
      }
    }

    return best.base64 ? best : null;
  }, []);

  const runDeepAuth = useCallback(async () => {
    setBiometricState("CHECKING");
    try {
      const frame = await captureFrame();
      if (!frame) throw new Error("No frame");

      // Apply green channel to scan
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      applyGreenChannel(canvas, ctx);
      const greenBase64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];

      if (frame.blurScore < BLUR_THRESHOLD) {
        setBiometricState("LOST");
        return;
      }

      const res = await fetch("/api/verify/deep-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterBase64: masterBase64.current,
          scanBase64: greenBase64,
          masterMime: "image/jpeg",
          scanMime: "image/jpeg",
          hasMarker: !!(profileData.current as { physical_marker?: { present?: boolean } })?.physical_marker?.present,
        }),
      });

      const data = await res.json();

      if (data.result === "MATCH") {
        setBiometricState("LOCKED");
      } else {
        // Flag the session
        const newFlags = flagCount + 1;
        setFlagCount(newFlags);
        await fetch(`/api/session/${id}/flag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "visual_mismatch",
            flags: data.flags,
          }),
        });
        toast.error(`Biometric mismatch detected (${data.flags?.join(", ") ?? "unknown"})`);
        setBiometricState("LOST");

        if (newFlags > MAX_FLAGS) {
          toast.error("Too many biometric flags — session will be marked INCONSISTENT");
          finishSession();
        }
      }
    } catch {
      setBiometricState("LOST");
    }
  }, [captureFrame, flagCount, id]);

  const onHandLost = useCallback(() => {
    if (biometricState === "LOCKED") {
      setBiometricState("LOST");
      // Flag recording gap
      fetch(`/api/session/${id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "RECORDING_GAP" }),
      }).catch(() => {});
      toast.warning("Hand lost — biometric lock cleared");
    }
    if (gestureHoldTimerRef.current) {
      clearTimeout(gestureHoldTimerRef.current);
      gestureHoldTimerRef.current = null;
    }
  }, [biometricState, id]);

  const onHandDetected = useCallback(() => {
    if (biometricState === "LOST") {
      setBiometricState("SCANNING");
      gestureHoldTimerRef.current = setTimeout(() => {
        runDeepAuth();
      }, GESTURE_HOLD_MS);
    }
  }, [biometricState, runDeepAuth]);

  const captureAndSaveAction = useCallback(async () => {
    const frame = await captureFrame();
    if (!frame) return;

    if (!recordingStartRef.current) return;
    const elapsed = Math.floor(
      (Date.now() - recordingStartRef.current.getTime()) / 1000
    );
    const timestamp = formatTime(elapsed);

    try {
      const res = await fetch("/api/verify/analyze-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: frame.base64,
          mimeType: "image/jpeg",
          timestamp,
        }),
      });
      const actionData = await res.json();
      setLastAction(actionData.action ?? null);

      // Save to Firestore via API
      await fetch(`/api/session/${id}/save-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...actionData, timestamp }),
      });
    } catch {
      // Non-fatal
    }
  }, [captureFrame, id]);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setStatus("CAMERA");
  }, []);

  const startRecording = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;

    await fetch(`/api/session/${id}/recording-start`, { method: "POST" });

    recordingStartRef.current = new Date();
    setStatus("RECORDING");

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorderRef.current = recorder;

    let chunkIdx = 0;

    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const form = new FormData();
        form.append("chunk", e.data, "chunk.webm");
        form.append("chunkIndex", String(chunkIdx++));
        fetch(`/api/session/${id}/upload-chunk`, {
          method: "POST",
          body: form,
        }).catch(() => {});
      }
    };

    recorder.start();

    // Chunk every 10s
    chunkIntervalRef.current = setInterval(() => {
      if (recorder.state === "recording") {
        recorder.requestData();
      }
    }, CHUNK_INTERVAL_MS);

    // Action capture every 10s
    actionIntervalRef.current = setInterval(() => {
      captureAndSaveAction();
    }, ACTION_INTERVAL_MS);

    // Elapsed timer
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    // Simulate basic hand presence detection (polling video brightness as proxy)
    // In production this would use MediaPipe; for demo we simulate detection
    const presenceInterval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext("2d")!;
      canvas.width = 64;
      canvas.height = 48;
      ctx.drawImage(video, 0, 0, 64, 48);
      const imageData = ctx.getImageData(0, 0, 64, 48);
      let brightness = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        brightness += imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2];
      }
      brightness /= (imageData.data.length / 4) * 3;
      const detected = brightness > 30; // basic heuristic
      setHandsPresent(detected);
      if (detected) onHandDetected();
      else onHandLost();
    }, 500);

    return () => clearInterval(presenceInterval);
  }, [id, captureAndSaveAction, onHandDetected, onHandLost]);

  const finishSession = useCallback(async () => {
    setStatus("FINISHING");

    // Stop intervals
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    if (actionIntervalRef.current) clearInterval(actionIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    if (handLossTimerRef.current) clearTimeout(handLossTimerRef.current);
    if (gestureHoldTimerRef.current) clearTimeout(gestureHoldTimerRef.current);

    // Stop recorder
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    // Stop camera
    streamRef.current?.getTracks().forEach((t) => t.stop());

    await fetch(`/api/session/${id}/recording-end`, { method: "POST" });
    router.push(`/session/${id}/processing`);
  }, [id, router]);

  useEffect(() => {
    startCamera().catch(() => {
      setStatus("INIT");
    });
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const biometricColour =
    biometricState === "LOCKED"
      ? "text-teal-400 border-teal-700/50 bg-teal-900/20"
      : biometricState === "SCANNING" || biometricState === "CHECKING"
      ? "text-amber-400 border-amber-700/50 bg-amber-900/20"
      : "text-red-400 border-red-700/50 bg-red-900/20";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-bold text-lg">Recording Session</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-mono text-gray-400">{formatTime(elapsedSeconds)}</span>
            <span className={`px-3 py-1 rounded-full border text-xs font-medium ${biometricColour}`}>
              {biometricState === "LOCKED" && <><Shield className="inline w-3 h-3 mr-1" />LOCKED</>}
              {biometricState === "SCANNING" && "SCANNING…"}
              {biometricState === "CHECKING" && <><Loader2 className="inline w-3 h-3 mr-1 animate-spin" />CHECKING</>}
              {biometricState === "LOST" && <><ShieldAlert className="inline w-3 h-3 mr-1" />BIOMETRIC LOST</>}
            </span>
          </div>
        </div>

        {/* Video */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black mb-4 aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />

          {status === "FINISHING" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 flex-col gap-3">
              <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
              <p className="text-gray-300">Finishing session…</p>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mb-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === "RECORDING" ? "bg-red-500 animate-pulse" : "bg-gray-600"}`} />
            {status === "RECORDING" ? "Recording" : status === "FINISHING" ? "Finishing" : "Standby"}
          </div>
          <div>Flags: {flagCount}/{MAX_FLAGS}</div>
          {lastAction && <div className="text-xs truncate max-w-[200px]">Last: {lastAction}</div>}
        </div>

        {/* Controls */}
        {status === "CAMERA" && (
          <button
            onClick={startRecording}
            className="w-full bg-red-500 hover:bg-red-400 text-white font-semibold py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
          >
            <div className="w-3 h-3 bg-white rounded-full" />
            Start Recording
          </button>
        )}

        {status === "RECORDING" && (
          <button
            onClick={finishSession}
            className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-4 rounded-xl text-lg transition-colors"
          >
            Finish Session →
          </button>
        )}

        <div className="mt-4 text-xs text-gray-600 text-center">
          {status === "RECORDING" &&
            "Action analysis runs every 10s. Biometric lock refreshes on hand re-entry."}
        </div>
      </div>
    </div>
  );
}
