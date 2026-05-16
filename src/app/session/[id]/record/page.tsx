"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { ShieldCheck, ShieldAlert, Eye, Loader2, Activity, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Script from "next/script";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ActionLogEntry = {
  id: number;
  timestamp: string;
  action: string;
  confidence: number;
  description: string;
  handsPresent: boolean;
  completion?: "COMPLETE" | "ONGOING" | "PARTIAL" | null;
  workQuality?: {
    rating: "GOOD" | "ACCEPTABLE" | "POOR" | null;
    reason: string | null;
  };
  anomaly?: string | null;
  safetyAssessment?: {
    level: string;
    observation: string | null;
    improvement_tip: string | null;
  };
};

interface Hands {
  setOptions(options: unknown): void;
  onResults(callback: (results: { multiHandLandmarks?: { x: number; y: number; z: number }[][] }) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

export default function RecordSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [seconds, setSeconds] = useState(0);
  // null = awaiting first hand entry, false = verified, true = flagged
  const [isFlagged, setIsFlagged] = useState<boolean | null>(null);
  const [handPresent, setHandPresent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [scanBreakdown, setScanBreakdown] = useState<{ q: string; label: string; answer: string; flags: boolean }[] | null>(null);

  const [masterImage, setMasterImage] = useState<string | null>(null);
  const [masterProfile, setMasterProfile] = useState<string | null>(null);

  const [anchorLabels, setAnchorLabels] = useState<{ nail: string | null; marker: string | null }>({ nail: null, marker: null });

  useEffect(() => {
    const timer = setTimeout(() => {
      const img = localStorage.getItem(`hand_master_${id}`) ?? localStorage.getItem("hand_master_latest");
      const profile = localStorage.getItem(`hand_profile_${id}`) ?? localStorage.getItem("hand_profile_latest");
      if (img) { setMasterImage(img); }
      if (profile) {
        setMasterProfile(profile);
        try {
          const parsed = JSON.parse(profile);
          const nail = parsed?.nail_length ? `${parsed.nail_length.replace(/_/g, " ")} nails` : null;
          const marker = parsed?.physical_marker?.present
            ? `${parsed.physical_marker.type} — ${parsed.physical_marker.location}`
            : null;
          setAnchorLabels({ nail, marker });
          if (nail) console.log(`[SYS]: Nail anchor → ${nail}`);
          if (marker) console.log(`[SYS]: Marker anchor → ${parsed.physical_marker.type} at ${parsed.physical_marker.location}`);
          if (!nail && !marker) console.log(`[SYS]: No anchors — re-register to enable anchor checks.`);
        } catch { /* ignore */ }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);


  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();
  const handsRef = useRef<Hands | null>(null);
  const handPresentRef = useRef(false);
  const isFlaggedRef = useRef<boolean | null>(null);
  const reEntryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDeepScanningRef = useRef(false);
  const noHandSinceRef = useRef<number | null>(null);
  const HAND_LOST_MS = 1500;
  const [waitingForGesture, setWaitingForGesture] = useState(false);
  const waitingForGestureRef = useRef(false);
  const gestureHoldRef = useRef<number | null>(null);
  const gestureFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureCountdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gestureCountdownValueRef = useRef(0);
  const scanLifecycleRef = useRef(0);
  const scanAbortControllerRef = useRef<AbortController | null>(null);
  const latestLandmarksRef = useRef<{ x: number; y: number; z: number }[] | null>(null);
  const sessionRatiosRef = useRef<{ palmWidth: number; indexLen: number; ringLen: number; pinkyLen: number } | null>(null);

  // Action log (Robotics-ER live analysis)
  const secondsRef = useRef(0);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [isAnalyzingAction, setIsAnalyzingAction] = useState(false);
  const isAnalyzingActionRef = useRef(false);
  const actionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionLogCounterRef = useRef(0);
  const actionLogScrollRef = useRef<HTMLDivElement>(null);

  // UI-only state
  const [showMatchFlash, setShowMatchFlash] = useState(false);
  const prevFlaggedRef = useRef<boolean | null>(null);

  const addLog = useCallback((msg: string) => {
    console.log(`[AI]: ${msg}`);
  }, []);

  const showBiometricToast = useCallback((variant: "success" | "error") => {
    const shared = {
      position: "top-left" as const,
      duration: 5200,
      style: { marginTop: "176px", marginLeft: "16px", maxWidth: "280px" },
    };

    if (variant === "error") {
      toast.error("Identity mismatch", {
        ...shared,
        description: "Bio-Auth failed. Hands were not recognized.",
      });
      return;
    }

    toast.success("Identity confirmed", {
      ...shared,
      description: "Bio-Auth passed. Hand identity locked.",
    });
  }, []);

  useEffect(() => {
    const stopEverything = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => { track.stop(); track.enabled = false; });
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      if (handsRef.current) { try { (handsRef.current as { close: () => void }).close(); } catch { /* ignore */ } }
      if (reEntryTimerRef.current) { clearTimeout(reEntryTimerRef.current); reEntryTimerRef.current = null; }
      if (gestureFallbackRef.current) { clearTimeout(gestureFallbackRef.current); gestureFallbackRef.current = null; }
      if (gestureCountdownTimerRef.current) { clearInterval(gestureCountdownTimerRef.current); gestureCountdownTimerRef.current = null; }
      if (actionIntervalRef.current) { clearInterval(actionIntervalRef.current); actionIntervalRef.current = null; }
      if (scanAbortControllerRef.current) {
        scanAbortControllerRef.current.abort();
        scanAbortControllerRef.current = null;
      }
    };
    window.addEventListener("beforeunload", stopEverything);
    return () => { window.removeEventListener("beforeunload", stopEverything); stopEverything(); };
  }, []);

  const performDeepAudit = useCallback(async () => {
    if (!masterImage) {
      addLog("No registered profile — re-register first.");
      toast.error("No biometric profile found.");
      return;
    }
    if (!videoRef.current || isDeepScanningRef.current) return;
    const scanVersion = scanLifecycleRef.current + 1;
    scanLifecycleRef.current = scanVersion;
    const ensureScanActive = () => {
      if (scanLifecycleRef.current !== scanVersion) {
        throw new Error("SCAN_ABORTED");
      }
    };
    const controller = new AbortController();
    scanAbortControllerRef.current = controller;
    isDeepScanningRef.current = true;
    setIsDeepScanning(true);
    addLog("BIOMETRIC IDENTITY SCAN...");

    const pause = (ms: number) => new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          ensureScanActive();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, ms);
      controller.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Scan aborted", "AbortError"));
      }, { once: true });
    });

    // Laplacian variance — higher = sharper
    const blurScore = (dataUrl: string): Promise<number> =>
      new Promise((resolve) => {
        const img = document.createElement("img") as HTMLImageElement;
        img.onload = () => {
          const S = 200;
          const cv = document.createElement("canvas");
          cv.width = S; cv.height = S;
          const cx = cv.getContext("2d");
          if (!cx) { resolve(0); return; }
          cx.drawImage(img, 0, 0, S, S);
          const { data } = cx.getImageData(0, 0, S, S);
          const g = new Float32Array(S * S);
          for (let i = 0; i < S * S; i++)
            g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
          let sum = 0, sq = 0, n = 0;
          for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
            const l = Math.abs(4*g[y*S+x] - g[(y-1)*S+x] - g[(y+1)*S+x] - g[y*S+x-1] - g[y*S+x+1]);
            sum += l; sq += l * l; n++;
          }
          const m = sum / n;
          resolve(sq / n - m * m);
        };
        img.onerror = () => resolve(0);
        img.src = dataUrl;
      });

    const captureStill = async (): Promise<string> => {
      ensureScanActive();
      if (!videoRef.current) throw new Error("No video");
      const cv = document.createElement("canvas");
      cv.width = videoRef.current.videoWidth;
      cv.height = videoRef.current.videoHeight;
      const cx = cv.getContext("2d");
      if (!cx) throw new Error("No context");
      cx.drawImage(videoRef.current, 0, 0, cv.width, cv.height);
      // Green-channel filter
      const id = cx.getImageData(0, 0, cv.width, cv.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1]; d[i + 2] = d[i + 1]; }
      cx.putImageData(id, 0, 0);
      return cv.toDataURL("image/jpeg", 0.97);
    };

    const captureBest = async (): Promise<string> => {
      const THRESHOLD = 50;
      let best = "", bestScore = -1;
      for (let a = 0; a < 2; a++) {
        ensureScanActive();
        const frame = await captureStill();
        const score = await blurScore(frame);
        if (score > bestScore) { bestScore = score; best = frame; }
        if (score >= THRESHOLD) break;
        if (a < 1) await pause(150);
      }
      return best;
    };

    const computeRatios = (lm: { x: number; y: number; z: number }[]) => {
      const dist = (a: number, b: number) => {
        const dx = lm[a].x - lm[b].x;
        const dy = lm[a].y - lm[b].y;
        return Math.sqrt(dx * dx + dy * dy);
      };
      const midLen = dist(9, 12); 
      if (midLen < 0.01) return null;
      return {
        palmWidth: dist(5, 17) / midLen,
        indexLen:  dist(5, 8)  / midLen,
        ringLen:   dist(13, 16) / midLen,
        pinkyLen:  dist(17, 20) / midLen,
      };
    };

    if (sessionRatiosRef.current && latestLandmarksRef.current) {
      const current = computeRatios(latestLandmarksRef.current);
      if (current) {
        const base = sessionRatiosRef.current;
        const THRESHOLD = 0.15;
        const diffs = {
          palmWidth: Math.abs(current.palmWidth - base.palmWidth) / base.palmWidth,
          indexLen:  Math.abs(current.indexLen  - base.indexLen)  / base.indexLen,
          ringLen:   Math.abs(current.ringLen   - base.ringLen)   / base.ringLen,
          pinkyLen:  Math.abs(current.pinkyLen  - base.pinkyLen)  / base.pinkyLen,
        };
        const entries = Object.entries(diffs) as [string, number][];
        const [worstKey, worstVal] = entries.sort((a, b) => b[1] - a[1])[0];
        if (worstVal > THRESHOLD) {
          isFlaggedRef.current = true; setIsFlagged(true);
          isDeepScanningRef.current = false; setIsDeepScanning(false);
          addLog(`HAND GEOMETRY MISMATCH — ${worstKey} off by ${(worstVal * 100).toFixed(0)}%.`);
          showBiometricToast("error");
          return;
        }
      }
    }

    try {
      const currentData = await captureBest();
      ensureScanActive();
      const res = await fetch("/api/verify/deep-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ currentImage: currentData, masterImage, masterProfile }),
      });
      ensureScanActive();
      const data = await res.json() as { 
        observed?: { hand?: string; nail?: string; regmark?: string; marks?: string }; 
        flags?: string[]; 
        result?: string 
      };
      ensureScanActive();

      if (data.observed) {
        const o = data.observed;
        const f = data.flags ?? [];
        setScanBreakdown([
          { q: "HAND", label: "Hand visible?", answer: o.hand ?? "?", flags: o.hand === "NO" },
          { q: "NAIL", label: `Nails (reg: ${anchorLabels.nail ?? "?"})`, answer: o.nail ?? "?", flags: f.some((s: string) => s.startsWith("nail_mismatch")) },
          ...(o.regmark != null ? [{ q: "REGMARK", label: "Registered mark found?", answer: o.regmark as string, flags: o.regmark === "NO" }] : []),
          { q: "MARKS", label: "Unexpected marks?", answer: (o.marks?.toLowerCase() !== "none" ? o.marks : "none") ?? "none", flags: f.some((s: string) => s.startsWith("unexpected_marks")) },
        ]);
      }

      if (data.result === "MISMATCH") {
        isFlaggedRef.current = true; setIsFlagged(true);
        addLog("!!! IDENTITY MISMATCH — HANDS NOT RECOGNIZED.");
        showBiometricToast("error");

        // Flag the session in DB
        await fetch(`/api/session/${id}/flag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "visual_mismatch", flags: data.flags }),
        });
      } else if (data.result === "MATCH") {
        if (handPresentRef.current) {
          isFlaggedRef.current = false; setIsFlagged(false);
          addLog("IDENTITY CONFIRMED. Hands locked.");
          showBiometricToast("success");
          if (!sessionRatiosRef.current && latestLandmarksRef.current) {
            const ratios = computeRatios(latestLandmarksRef.current);
            if (ratios) { sessionRatiosRef.current = ratios; }
          }
        } else {
          addLog("Scan complete — hands left frame during scan.");
        }
      }
    } catch (error) {
      if (!(error instanceof Error && (error.message === "SCAN_ABORTED" || error.name === "AbortError"))) {
        addLog("Scan error — will retry.");
      }
    } finally {
      if (scanAbortControllerRef.current === controller) scanAbortControllerRef.current = null;
      if (scanLifecycleRef.current === scanVersion) {
        isDeepScanningRef.current = false;
        setIsDeepScanning(false);
      }
    }
  }, [masterImage, masterProfile, addLog, anchorLabels.nail, showBiometricToast, id]);

  const auditRef = useRef(performDeepAudit);
  useEffect(() => { auditRef.current = performDeepAudit; }, [performDeepAudit]);

  const captureActionFrame = useCallback(async () => {
    if (!videoRef.current || isAnalyzingActionRef.current) return;
    isAnalyzingActionRef.current = true;
    setIsAnalyzingAction(true);

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) { isAnalyzingActionRef.current = false; setIsAnalyzingAction(false); return; }
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    const elapsed = secondsRef.current;
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    const timestamp = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    try {
      const res = await fetch("/api/verify/analyze-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imageData.split(",")[1], timestamp }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.action) {
          const entry: ActionLogEntry = {
            id: actionLogCounterRef.current++,
            timestamp,
            ...data,
            handsPresent: data.hands_present ?? false,
            workQuality: data.work_quality,
            safetyAssessment: data.safety_assessment,
          };
          setActionLog(prev => [...prev, entry]);
          
          // Save to Firestore via current API structure
          await fetch(`/api/session/${id}/save-log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          });
        }
      }
    } catch { /* ignore */ } finally {
      isAnalyzingActionRef.current = false;
      setIsAnalyzingAction(false);
    }
  }, [id]);

  const captureActionRef = useRef(captureActionFrame);
  useEffect(() => { captureActionRef.current = captureActionFrame; }, [captureActionFrame]);

  useEffect(() => {
    if (actionLogScrollRef.current) {
      actionLogScrollRef.current.scrollTop = actionLogScrollRef.current.scrollHeight;
    }
  }, [actionLog]);

  useEffect(() => {
    if (prevFlaggedRef.current !== false && isFlagged === false) {
      setShowMatchFlash(true);
      setTimeout(() => setShowMatchFlash(false), 1200);
    }
    prevFlaggedRef.current = isFlagged;
  }, [isFlagged]);

  const uploadChunk = useCallback(() => {
    // Disabled for hackathon demo to avoid Firebase Storage configuration blockers.
    // AI analysis remains functional via Base64 frame capture.
  }, []);

  const initHands = useCallback(() => {
    if (typeof window === "undefined" || !(window as unknown as { Hands?: new (o: unknown) => Hands }).Hands || handsRef.current) return;
    const HandsClass = (window as unknown as { Hands?: new (o: unknown) => Hands }).Hands;
    if (!HandsClass) return;
    const hands = new HandsClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });

    hands.onResults((results: { multiHandLandmarks?: { x: number; y: number; z: number }[][] }) => {
      const handCount = results.multiHandLandmarks?.length ?? 0;
      const hasHand = handCount >= 1;

      if (hasHand) {
        noHandSinceRef.current = null;
        if (results.multiHandLandmarks?.[0]) latestLandmarksRef.current = results.multiHandLandmarks[0];

        if (!handPresentRef.current) {
          handPresentRef.current = true;
          setHandPresent(true);
          waitingForGestureRef.current = true;
          setWaitingForGesture(true);
          gestureHoldRef.current = null;
          console.log("[AI]: Hand detected — scanning in 4s...");
        }

        if (isFlaggedRef.current === true && !waitingForGestureRef.current && !isDeepScanningRef.current && gestureHoldRef.current === null) {
          waitingForGestureRef.current = true;
          setWaitingForGesture(true);
        }

        if (waitingForGestureRef.current && gestureHoldRef.current === null) {
          gestureHoldRef.current = Date.now();
          gestureCountdownValueRef.current = 4;

          gestureCountdownTimerRef.current = setInterval(() => {
            gestureCountdownValueRef.current -= 1;
            if (gestureCountdownValueRef.current <= 0) {
              if (gestureCountdownTimerRef.current) clearInterval(gestureCountdownTimerRef.current);
            }
          }, 1000);

          gestureFallbackRef.current = setTimeout(() => {
            if (!waitingForGestureRef.current) return;
            if (gestureCountdownTimerRef.current) { clearInterval(gestureCountdownTimerRef.current); gestureCountdownTimerRef.current = null; }
            gestureHoldRef.current = null;
            waitingForGestureRef.current = false;
            setWaitingForGesture(false);
            auditRef.current();
          }, 4100);
        }
      } else {
        if (noHandSinceRef.current === null) noHandSinceRef.current = Date.now();
        if (Date.now() - noHandSinceRef.current < HAND_LOST_MS) return;
        if (!handPresentRef.current) return;

        handPresentRef.current = false;
        setHandPresent(false);
        noHandSinceRef.current = null;
        if (gestureHoldRef.current !== null) {
          gestureHoldRef.current = null;
          if (gestureFallbackRef.current) { clearTimeout(gestureFallbackRef.current); gestureFallbackRef.current = null; }
          if (gestureCountdownTimerRef.current) { clearInterval(gestureCountdownTimerRef.current); gestureCountdownTimerRef.current = null; }
        }
        waitingForGestureRef.current = false;
        setWaitingForGesture(false);
        isFlaggedRef.current = true; setIsFlagged(true);
        console.log("[AI]: HANDS LEFT FRAME — FLAGGED.");
        
        fetch(`/api/session/${id}/flag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "RECORDING_GAP" }),
        }).catch(() => {});
      }
    });

    handsRef.current = hands;
    setIsMediaPipeLoaded(true);
  }, [id]);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if ((window as unknown as { Hands?: unknown }).Hands) { initHands(); clearInterval(checkInterval); }
    }, 500);
    return () => clearInterval(checkInterval);
  }, [initHands]);

  useEffect(() => {
    if (!isMediaPipeLoaded) return;
    async function startSession() {
      try {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const processVideo = async () => {
          if (videoRef.current && handsRef.current && isMediaPipeLoaded) {
            try { await (handsRef.current as { send: (o: { image: HTMLVideoElement }) => Promise<void> }).send({ image: videoRef.current }); } catch { /* ignore */ }
          }
          requestAnimationFrame(processVideo);
        };
        requestAnimationFrame(processVideo);

        const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = () => { 
          // if (e.data.size > 0) void uploadChunk(e.data); 
        };
        recorder.start(10000);
        await fetch(`/api/session/${id}/recording-start`, { method: "POST" });
        actionIntervalRef.current = setInterval(() => { captureActionRef.current(); }, 10000);
      } catch {
        toast.error("Camera failed."); 
      }
    }
    startSession();
  }, [id, isMediaPipeLoaded, uploadChunk]);

  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => { count++; secondsRef.current = count; setSeconds(count); }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStop = async () => {
    setIsUploading(true);
    if (actionIntervalRef.current) clearInterval(actionIntervalRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    await fetch(`/api/session/${id}/recording-end`, { method: "POST" });
    router.push(`/session/${id}/processing`);
  };

  const formatTime = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const statusLabel = isFlagged === null ? "Monitoring" : isFlagged ? "Flagged" : "Locked";
  const statusSub = isFlagged === null ? (waitingForGesture ? "Hold still — scanning soon" : handPresent ? "Verifying…" : "Show hands to begin") : isFlagged ? (handPresent ? "Identity mismatch" : "Hands left frame") : "Identity confirmed";

  return (
    <div className="fixed inset-0 bg-black text-white font-sans overflow-hidden">
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" strategy="afterInteractive" onLoad={initHands} />
      
      <video ref={videoRef} autoPlay muted playsInline className={`absolute inset-0 w-full h-full object-cover transition-[filter] duration-300 ${isFlagged === true ? "grayscale brightness-50" : ""} ${isDeepScanning ? "blur-[2px]" : ""}`} />
      
      {showMatchFlash && <div className="absolute inset-0 z-50 pointer-events-none border-4 border-[#2dd4bf] rounded-none animate-pulse" />}
      {isFlagged === true && <div className="absolute inset-0 z-20 pointer-events-none border-2 border-red-500/60 animate-pulse" />}
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-10 flex items-center justify-between px-6">
        <BrandMark className="scale-90 origin-left" />
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">Session Time</span>
            <span className="font-mono text-2xl font-medium tracking-tight">{formatTime(seconds)}</span>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <Button variant="destructive" size="lg" className="rounded-2xl px-6 h-12" onClick={handleStop} disabled={isUploading}>
            {isUploading ? <Loader2 className="animate-spin" /> : "Finish Session"}
          </Button>
        </div>
      </div>

      {/* Biometric Status */}
      <div className="absolute left-6 top-32 z-10 flex flex-col gap-4 w-64">
        <Card className="bg-black/60 backdrop-blur-xl border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className={`size-12 rounded-2xl flex items-center justify-center border-2 ${isFlagged === false ? "border-[#2dd4bf] bg-[#2dd4bf]/10 text-[#2dd4bf]" : isFlagged === true ? "border-red-500 bg-red-500/10 text-red-500" : "border-white/20 bg-white/5 text-white/40"}`}>
             {isFlagged === false ? <ShieldCheck /> : isFlagged === true ? <ShieldAlert /> : <Eye />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{statusLabel}</p>
            <p className="text-sm font-medium leading-none mt-1">{statusSub}</p>
          </div>
        </Card>

        {isDeepScanning && (
          <Card className="bg-black/60 backdrop-blur-xl border-[#2dd4bf]/20 p-4 rounded-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center gap-3">
              <Loader2 className="size-4 animate-spin text-[#2dd4bf]" />
              <p className="text-xs font-semibold uppercase tracking-widest text-[#2dd4bf]">Scanning Biometrics</p>
            </div>
            {scanBreakdown && (
              <div className="mt-4 space-y-2">
                {scanBreakdown.map(s => (
                  <div key={s.q} className="flex justify-between items-center text-[10px]">
                    <span className="text-white/40 font-bold uppercase">{s.label}</span>
                    <span className={`font-mono ${s.flags ? "text-red-400" : "text-[#2dd4bf]"}`}>{s.answer}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Action Log Sidebar */}
      <div className="absolute right-6 top-32 bottom-24 w-80 z-10 flex flex-col gap-4">
        <Card className="flex-1 bg-black/40 backdrop-blur-md border-white/10 flex flex-col overflow-hidden rounded-3xl">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Live Robotics-ER Log</span>
            </div>
            {isAnalyzingAction && <Loader2 className="size-3 animate-spin text-white/40" />}
          </div>
          <div ref={actionLogScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {actionLog.map(log => (
              <div key={log.id} className="group flex gap-4 animate-in slide-in-from-right-4">
                <span className="font-mono text-[10px] text-white/20 pt-1">{log.timestamp}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white/80">{log.action.replace(/_/g, " ")}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40">{Math.round(log.confidence * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{log.description}</p>
                </div>
              </div>
            ))}
            {actionLog.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-8">
              <Activity className="size-8 mb-4" />
              <p className="text-xs uppercase tracking-widest font-bold">Awaiting first action...</p>
            </div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
