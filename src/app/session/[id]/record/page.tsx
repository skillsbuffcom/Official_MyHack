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

type HandLandmark = { x: number; y: number; z: number };

function looksLikeBackhandPose(landmarks: HandLandmark[]) {
  if (landmarks.length < 21) return false;

  const dist = (a: HandLandmark, b: HandLandmark) => Math.hypot(a.x - b.x, a.y - b.y);
  const fingersExtended = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ].filter(([tip, pip]) => dist(landmarks[0], landmarks[tip]) > dist(landmarks[0], landmarks[pip]) * 1.08).length;

  const xs = landmarks.map(p => p.x);
  const ys = landmarks.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);

  return fingersExtended >= 3 && width > 0.08 && height > 0.12;
}

function hasTwoBackhands(landmarkSets: HandLandmark[][]) {
  return landmarkSets.length === 2 && landmarkSets.every(looksLikeBackhandPose);
}
export default function RecordSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [seconds, setSeconds] = useState(0);
  const [isFlagged, setIsFlagged] = useState<boolean | null>(null);
  const [handPresent, setHandPresent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [scanBreakdown, setScanBreakdown] = useState<{ q: string; label: string; answer: string; flags: boolean }[] | null>(null);

  const [masterImage, setMasterImage] = useState<string | null>(null);
  const [masterColorImage, setMasterColorImage] = useState<string | null>(null);
  const [masterProfile, setMasterProfile] = useState<string | null>(null);
  const [anchorLabels, setAnchorLabels] = useState<{ nail: string | null; marker: string | null }>({ nail: null, marker: null });
  const [currentSnapshot, setCurrentSnapshot] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const idStr = id as string;
      const img = localStorage.getItem(`hand_master_${idStr}`) ?? localStorage.getItem("hand_master_latest");
      const colorImg = localStorage.getItem(`hand_master_color_${idStr}`) ?? localStorage.getItem("hand_master_color_latest");
      const profile = localStorage.getItem(`hand_profile_${idStr}`) ?? localStorage.getItem("hand_profile_latest");
      if (img) setMasterImage(img);
      if (colorImg) setMasterColorImage(colorImg);
      if (profile) {
        setMasterProfile(profile);
        try {
          const parsed = JSON.parse(profile);
          const nail = parsed?.nail_length ? `${parsed.nail_length.replace(/_/g, " ")} nails` : null;
          const marker = parsed?.physical_marker?.present
            ? `${parsed.physical_marker.type} — ${parsed.physical_marker.location}`
            : null;
          const markers = (Array.isArray(parsed?.physical_markers) ? parsed.physical_markers : [])
            .filter((m: { confidence?: unknown }) => Number(m.confidence ?? 1) >= 0.72)
            .slice(0, 2);
          const primaryMarker = markers[0] ?? (parsed?.physical_marker?.present ? parsed.physical_marker : null);
          setAnchorLabels({ nail, marker: primaryMarker ? `${primaryMarker.type} - ${primaryMarker.location}` : marker });
        } catch { /* ignore */ }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();
  const handsRef = useRef<unknown>(null);
  const handPresentRef = useRef(false);
  const isFlaggedRef = useRef<boolean | null>(null);
  const reEntryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDeepScanningRef = useRef(false);
  const isCheckingHandPresenceRef = useRef(false);
  const noHandSinceRef = useRef<number | null>(null);
  const HAND_LOST_MS = 600; 
  const HARD_LOST_MS = 12000; // 12s — plenty of time for AI to confirm clasped hands
  const VERIFY_HOLD_SECONDS = 4;
  const VERIFY_HOLD_MS = 4100;
  const VERIFY_COOLDOWN_MS = 12000;
  const [waitingForGesture, setWaitingForGesture] = useState(false);
  const [gestureCountdown, setGestureCountdown] = useState<number | null>(null);
  const waitingForGestureRef = useRef(false);
  const gestureHoldRef = useRef<number | null>(null);
  const gestureFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureCountdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gestureCountdownValueRef = useRef(0);
  const scanLifecycleRef = useRef(0);
  const scanAbortControllerRef = useRef<AbortController | null>(null);
  const latestLandmarksRef = useRef<HandLandmark[][]>([]);
  const lastBioScanAtRef = useRef(0);
  const reverifyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Action log
  const secondsRef = useRef(0);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [isAnalyzingAction, setIsAnalyzingAction] = useState(false);
  const isAnalyzingActionRef = useRef(false);
  const actionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef(0);
  const actionLogCounterRef = useRef(0);
  const actionLogScrollRef = useRef<HTMLDivElement>(null);

  // UI state
  const [showMatchFlash, setShowMatchFlash] = useState(false);
  const prevFlaggedRef = useRef<boolean | null>(null);

  const addLog = useCallback((msg: string) => {
    console.log(`[AI]: ${msg}`);
  }, []);

  const resetGestureCountdown = useCallback(() => {
    if (gestureFallbackRef.current) { clearTimeout(gestureFallbackRef.current); gestureFallbackRef.current = null; }
    if (gestureCountdownTimerRef.current) { clearInterval(gestureCountdownTimerRef.current); gestureCountdownTimerRef.current = null; }
    gestureHoldRef.current = null;
    waitingForGestureRef.current = false;
    setWaitingForGesture(false);
    setGestureCountdown(null);
  }, []);

  const showBiometricToast = useCallback((variant: "success" | "error") => {
    const shared = {
      position: "top-left" as const,
      duration: 5200,
      style: { marginTop: "176px", marginLeft: "16px", maxWidth: "280px" },
    };
    if (variant === "error") {
      toast.error("Identity mismatch", { ...shared, description: "Bio-Auth failed. Hands were not recognized." });
      return;
    }
    toast.success("Identity confirmed", { ...shared, description: "Bio-Auth passed. Hand identity locked." });
  }, []);

  const capturePresenceFrame = useCallback(() => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const sourceW = video.videoWidth || 1280;
    const sourceH = video.videoHeight || 720;
    const maxW = 960;
    const scale = Math.min(1, maxW / sourceW);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceW * scale);
    canvas.height = Math.round(sourceH * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  }, []);

  const flagHandsLeftFrame = useCallback(() => {
    handPresentRef.current = false;
    setHandPresent(false);
    noHandSinceRef.current = null;
    resetGestureCountdown();
    isFlaggedRef.current = true;
    setIsFlagged(true);
    console.log("[AI]: HANDS LEFT FRAME - FLAGGED.");
    fetch(`/api/session/${id}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "RECORDING_GAP" }),
    }).catch(() => {});
  }, [id, resetGestureCountdown]);

  const verifyLockedHandPresence = useCallback(async () => {
    if (isCheckingHandPresenceRef.current) return;
    const image = capturePresenceFrame();
    if (!image) return;

    isCheckingHandPresenceRef.current = true;
    try {
      const res = await fetch("/api/verify/hand-presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json() as { handsVisible?: boolean; confidence?: number; description?: string };
      console.log("[AI]: Hand presence check:", data);

      if (isFlaggedRef.current === false && data.handsVisible === false && Number(data.confidence ?? 0) >= 0.80) {
        flagHandsLeftFrame();
      } else if (isFlaggedRef.current === false) {
        noHandSinceRef.current = null;
        resetGestureCountdown();
        console.log("[AI]: Hands still visually present while locked - keeping identity locked.");
      }
    } catch {
      if (isFlaggedRef.current === false) {
        noHandSinceRef.current = null;
        resetGestureCountdown();
        console.log("[AI]: Hand presence check failed - keeping identity locked.");
      }
    } finally {
      isCheckingHandPresenceRef.current = false;
    }
  }, [capturePresenceFrame, flagHandsLeftFrame, resetGestureCountdown]);

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
      resetGestureCountdown();
      if (actionIntervalRef.current) { clearInterval(actionIntervalRef.current); actionIntervalRef.current = null; }
      if (reverifyIntervalRef.current) { clearInterval(reverifyIntervalRef.current); reverifyIntervalRef.current = null; }
      if (scanAbortControllerRef.current) { scanAbortControllerRef.current.abort(); scanAbortControllerRef.current = null; }
    };
    window.addEventListener("beforeunload", stopEverything);
    return () => { window.removeEventListener("beforeunload", stopEverything); stopEverything(); };
  }, [resetGestureCountdown]);

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
      if (scanLifecycleRef.current !== scanVersion) throw new Error("SCAN_ABORTED");
    };
    const controller = new AbortController();
    scanAbortControllerRef.current = controller;
    isDeepScanningRef.current = true;
    setIsDeepScanning(true);
    addLog("BIOMETRIC IDENTITY SCAN...");

    const pause = (ms: number) => new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        try { ensureScanActive(); resolve(); } catch (error) { reject(error); }
      }, ms);
      controller.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Scan aborted", "AbortError"));
      }, { once: true });
    });

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
            const l = Math.abs(4 * g[y * S + x] - g[(y - 1) * S + x] - g[(y + 1) * S + x] - g[y * S + x - 1] - g[y * S + x + 1]);
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
      const sourceW = videoRef.current.videoWidth || 1280;
      const sourceH = videoRef.current.videoHeight || 720;
      const maxW = 1280;
      const scale = Math.min(1, maxW / sourceW);
      cv.width = Math.round(sourceW * scale);
      cv.height = Math.round(sourceH * scale);
      const cx = cv.getContext("2d");
      if (!cx) throw new Error("No context");
      cx.drawImage(videoRef.current, 0, 0, cv.width, cv.height);
      return cv.toDataURL("image/jpeg", 0.84);
    };

    const cropHands = async (dataUrl: string): Promise<string[]> => {
      const landmarkSets = latestLandmarksRef.current.slice(0, 2);
      if (landmarkSets.length === 0) return [];

      return new Promise((resolve) => {
        const img = document.createElement("img") as HTMLImageElement;
        img.onload = () => {
          const crops = landmarkSets.map((landmarks) => {
            const xs = landmarks.map(p => p.x);
            const ys = landmarks.map(p => p.y);
            const minX = Math.max(0, Math.min(...xs) - 0.14);
            const minY = Math.max(0, Math.min(...ys) - 0.18);
            const maxX = Math.min(1, Math.max(...xs) + 0.14);
            const maxY = Math.min(1, Math.max(...ys) + 0.18);
            const sourceX = minX * img.naturalWidth;
            const sourceY = minY * img.naturalHeight;
            const sourceW = Math.max(1, (maxX - minX) * img.naturalWidth);
            const sourceH = Math.max(1, (maxY - minY) * img.naturalHeight);
            const crop = document.createElement("canvas");
            const size = 640;
            crop.width = size;
            crop.height = size;
            const ctx = crop.getContext("2d");
            if (!ctx) return null;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, size, size);
            const scale = Math.min(size / sourceW, size / sourceH);
            const drawW = sourceW * scale;
            const drawH = sourceH * scale;
            ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);
            return crop.toDataURL("image/jpeg", 0.9);
          }).filter((crop): crop is string => Boolean(crop));
          resolve(crops);
        };
        img.onerror = () => resolve([]);
        img.src = dataUrl;
      });
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
      console.log(`[BLUR] score: ${bestScore.toFixed(1)}`);
      return best;
    };

    try {
      const currentData = await captureBest();
      ensureScanActive();
      setCurrentSnapshot(currentData);
      const currentHandCrops = await cropHands(currentData);

      const res = await fetch("/api/verify/deep-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          currentImage: currentData,
          currentColorImage: currentData,
          ...(currentHandCrops.length > 0 ? { currentHandCrops } : {}),
          masterImage,
          ...(masterColorImage ? { masterColorImage } : {}),
          masterProfile,
        }),
      });
      ensureScanActive();
      const data = await res.json() as Record<string, unknown>;
      ensureScanActive();
      console.log("DEEP-AUTH:", data.result, "| FLAGS:", data.flags);

      if (data.observed) {
        const o = data.observed as Record<string, unknown>;
        const f: string[] = (data.flags as string[]) ?? [];
        const isMatch = data.result === "MATCH";
        const mResults: any[] = (o.markerResults as any[]) ?? [];
        const markerDecisions: any[] = (o.markerDecisions as any[]) ?? [];
        const rawMarkerRows = markerDecisions.length > 0 ? markerDecisions : mResults.map(m => ({
          status: m.confirmed ? "confirmed" : m.area_visible ? "missing" : "uncertain",
          type: m.type,
          location: m.location,
        }));
        const markerRows = isMatch
          ? rawMarkerRows.filter(m => m.status === "confirmed")
          : rawMarkerRows;
        
        const rows = [
          { q: "HAND",    label: "Both hands visible?",                      answer: (o.hand as string) ?? "?",    flags: o.hand !== "BOTH" },
          { q: "NAIL",    label: `Nails (reg: ${anchorLabels.nail ?? "?"})`, answer: (o.nail as string) ?? "?",    flags: f.some(s => s.startsWith("nail")) },
          { q: "STRUCT",  label: "Hand structure",                           answer: (o.structure as string) ?? "?", flags: f.some(s => s.startsWith("hand_structure")) },
          ...(markerRows.length > 0 ? [{ 
            q: "MARKERS", 
            label: `${markerRows.length} marker${markerRows.length === 1 ? "" : "s"}`, 
            answer: markerRows.map(m => `${m.status === "confirmed" ? "ok" : m.status}: ${m.type ?? "mark"} ${m.location ?? ""}`.trim()).join(" | "), 
            flags: f.some(s => s.startsWith("marker")) 
          }] : []),
        ];
        setScanBreakdown(isMatch ? rows.filter(row => !row.flags) : rows);
      }

      if (data.result === "MISMATCH") {
        isFlaggedRef.current = true; setIsFlagged(true);
        addLog("!!! IDENTITY MISMATCH — HANDS NOT RECOGNIZED.");
        showBiometricToast("error");
        await fetch(`/api/session/${id}/flag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "visual_mismatch" }),
        });
      } else if (data.result === "MATCH") {
        if (handPresentRef.current) {
          isFlaggedRef.current = false; setIsFlagged(false);
          addLog("IDENTITY CONFIRMED. Hands locked.");
          showBiometricToast("success");
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
  }, [masterImage, masterColorImage, masterProfile, addLog, anchorLabels.nail, showBiometricToast, id]);

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

  const uploadChunk = useCallback((blob: Blob) => {
    const chunkIndex = chunkIndexRef.current++;
    const formData = new FormData();
    formData.append("chunk", blob);
    formData.append("chunkIndex", chunkIndex.toString());
    fetch(`/api/session/${id}/upload-chunk`, { method: "POST", body: formData }).catch(() => {});
  }, [id]);

  const initHands = useCallback(() => {
    if (typeof window === "undefined" || !(window as unknown as Record<string, unknown>).Hands || handsRef.current) return;
    const HandsClass = (window as unknown as Record<string, unknown>).Hands as new (opts: unknown) => {
      setOptions(o: unknown): void;
      onResults(cb: (results: { multiHandLandmarks?: HandLandmark[][] }) => void): void;
      send(data: unknown): Promise<void>;
    };
    const hands = new HandsClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });

    hands.onResults((results) => {
      const landmarkSets = Array.isArray(results.multiHandLandmarks) ? results.multiHandLandmarks : [];
      const handCount = landmarkSets.length;
      const hasBothHands = handCount === 2;
      const hasBothBackhands = hasTwoBackhands(landmarkSets);

      if (handCount > 0) {
        noHandSinceRef.current = null;
        latestLandmarksRef.current = landmarkSets;

        if (!handPresentRef.current) {
          handPresentRef.current = true;
          setHandPresent(true);
        }

        const needsIdentityScan = isFlaggedRef.current !== false;
        const scanCooldownElapsed = Date.now() - lastBioScanAtRef.current > VERIFY_COOLDOWN_MS;
        if (needsIdentityScan && hasBothBackhands && scanCooldownElapsed && !waitingForGestureRef.current && !isDeepScanningRef.current && gestureHoldRef.current === null) {
          waitingForGestureRef.current = true;
          setWaitingForGesture(true);
        }

        if (waitingForGestureRef.current && gestureHoldRef.current === null) {
          if (hasBothBackhands) {
            gestureHoldRef.current = Date.now();
            gestureCountdownValueRef.current = VERIFY_HOLD_SECONDS;
            setGestureCountdown(VERIFY_HOLD_SECONDS);

            gestureCountdownTimerRef.current = setInterval(() => {
              gestureCountdownValueRef.current -= 1;
              setGestureCountdown(Math.max(0, gestureCountdownValueRef.current));
            }, 1000);

            gestureFallbackRef.current = setTimeout(() => {
              if (!waitingForGestureRef.current) return;
              if (gestureCountdownTimerRef.current) { clearInterval(gestureCountdownTimerRef.current); gestureCountdownTimerRef.current = null; }
              gestureHoldRef.current = null;
              waitingForGestureRef.current = false;
              setWaitingForGesture(false);
              setGestureCountdown(null);
              lastBioScanAtRef.current = Date.now();
              auditRef.current();
            }, VERIFY_HOLD_MS);
          }
        } else if (waitingForGestureRef.current && gestureHoldRef.current !== null && !hasBothBackhands) {
          // If we were counting down but lost one hand, reset
          resetGestureCountdown();
          console.log("[AI]: Hand lost during countdown — resetting.");
        }
      } else {
        if (noHandSinceRef.current === null) noHandSinceRef.current = Date.now();
        const missingDuration = Date.now() - noHandSinceRef.current;
        if (missingDuration < HAND_LOST_MS) return;
        if (!handPresentRef.current) return;

        if (isFlaggedRef.current === false) {
          // If gone for > 3s, don't wait for AI anymore
          if (missingDuration > HARD_LOST_MS) {
            flagHandsLeftFrame();
          } else {
            void verifyLockedHandPresence();
          }
          return;
        }

        flagHandsLeftFrame();
      }
    });

    handsRef.current = hands;
    setIsMediaPipeLoaded(true);
  }, [flagHandsLeftFrame, verifyLockedHandPresence]);

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const processVideo = async () => {
          if (videoRef.current && handsRef.current && isMediaPipeLoaded && videoRef.current.readyState >= 2) {
            try { await (handsRef.current as { send: (o: { image: HTMLVideoElement }) => Promise<void> }).send({ image: videoRef.current }); } catch { /* ignore */ }
          }
          requestAnimationFrame(processVideo);
        };
        requestAnimationFrame(processVideo);

        const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => { if (e.data.size > 0) void uploadChunk(e.data); };
        recorder.start(10000);
        await fetch(`/api/session/${id}/recording-start`, { method: "POST" });
        const triggerActionCapture = async () => {
          if (mediaRecorderRef.current?.state === "recording") {
            await captureActionRef.current();
            // Wait 2 seconds before next capture after one finishes
            actionIntervalRef.current = setTimeout(triggerActionCapture, 2000);
          }
        };
        triggerActionCapture();
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
  const statusSub = isFlagged === false
    ? "Identity confirmed"
    : waitingForGesture
      ? `Scanning in ${gestureCountdown ?? VERIFY_HOLD_SECONDS}…`
    : isCheckingHandPresenceRef.current
      ? "AI Confirming Presence..."
      : handPresent
        ? "Show BOTH backhands to verify"
        : isFlagged
          ? "Hands left frame — show BOTH to verify"
          : "Show BOTH hands to begin verification";

  return (
    <div className="fixed inset-0 bg-black text-white font-sans overflow-hidden">
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" strategy="afterInteractive" onLoad={initHands} />

      <video ref={videoRef} autoPlay muted playsInline style={{ transform: "scaleX(-1)" }} className={`absolute inset-0 w-full h-full object-cover transition-[filter] duration-300 ${isFlagged === true ? "grayscale brightness-50" : ""} ${isDeepScanning ? "blur-[2px]" : ""}`} />

      {showMatchFlash && <div className="absolute inset-0 z-50 pointer-events-none border-4 border-[#2dd4bf] rounded-none animate-pulse" />}
      {isFlagged === true && <div className="absolute inset-0 z-20 pointer-events-none border-2 border-red-500/60 animate-pulse" />}

      {/* Countdown overlay */}
      {waitingForGesture && gestureCountdown !== null && gestureCountdown > 0 && (
        <div className="absolute inset-0 z-30 flex items-end justify-center pb-32 pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <span className="text-8xl font-bold text-white drop-shadow-[0_0_24px_rgba(45,212,191,0.8)]" style={{ textShadow: "0 0 32px #2dd4bf" }}>{gestureCountdown}</span>
            <span className="text-xs font-semibold text-[#2dd4bf] uppercase tracking-[0.2em]">Scanning in…</span>
          </div>
        </div>
      )}

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
      <div className="absolute left-6 top-32 z-10 flex flex-col gap-4 w-72">
        <Card className="bg-black/60 backdrop-blur-xl border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className={`size-12 rounded-2xl flex items-center justify-center border-2 ${isFlagged === false ? "border-[#2dd4bf] bg-[#2dd4bf]/10 text-white" : isFlagged === true ? "border-red-500 bg-red-500/10 text-red-500" : "border-white/20 bg-white/5 text-white/40"}`}>
            {isFlagged === false ? <ShieldCheck /> : isFlagged === true ? <ShieldAlert /> : <Eye />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{statusLabel}</p>
            <p className="text-sm font-medium leading-none mt-1 text-white">{statusSub}</p>
          </div>
        </Card>

        <Card className="bg-black/60 backdrop-blur-xl border-white/10 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            {isDeepScanning ? (
              <>
                <Loader2 className="size-4 animate-spin text-[#2dd4bf]" />
                <p className="text-xs font-semibold uppercase tracking-widest text-[#2dd4bf]">Scanning Biometrics</p>
              </>
            ) : (
              <>
                <Eye className="size-4 text-white/30" />
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Bio-Auth Log</p>
              </>
            )}
          </div>
          {scanBreakdown ? (
            <div className="space-y-2">
              {scanBreakdown.map(s => (
                <div key={s.q} className="flex items-start justify-between gap-2 text-[10px]">
                  <span className="text-white/40 font-bold uppercase shrink-0">{s.label}</span>
                  <span className={`font-mono text-right ${s.flags ? "text-red-400" : "text-[#2dd4bf]"}`}>{s.answer}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Awaiting first scan…</p>
          )}
          {(anchorLabels.nail || anchorLabels.marker) && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Anchors</p>
              {anchorLabels.nail && <p className="text-[10px] text-white/50">Nail: {anchorLabels.nail}</p>}
              {anchorLabels.marker && <p className="text-[10px] text-white/50">Marker: {anchorLabels.marker}</p>}
            </div>
          )}
        </Card>

        {/* Reference image + live scan side by side */}
        {(masterImage || currentSnapshot) && (
          <Card className="bg-black/60 backdrop-blur-xl border-white/10 p-2 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-2 gap-1.5">
              {masterImage && (
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 px-1">Reference</p>
                  <div className="aspect-video relative rounded-lg overflow-hidden border border-white/5">
                    <img src={masterImage} alt="Reference" className="w-full h-full object-cover grayscale opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-1 left-1 flex items-center gap-1">
                      <ShieldCheck className="size-2.5 text-[#2dd4bf]" />
                      <span className="text-[8px] font-bold text-white/60 uppercase">Locked</span>
                    </div>
                  </div>
                </div>
              )}
              {currentSnapshot && (
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 px-1">Last Scan</p>
                  <div className="aspect-video relative rounded-lg overflow-hidden border border-white/5">
                    <img src={currentSnapshot} alt="Last scan" className="w-full h-full object-cover grayscale opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-1 left-1">
                      <span className="text-[8px] font-bold text-white/60 uppercase">Live</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
