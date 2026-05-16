"use client";

import { Fragment, use, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Hand,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import Script from "next/script";

import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Step = "face" | "ic" | "workspace" | "hands" | "complete";

const steps: { key: Exclude<Step, "complete">; label: string; short: string }[] = [
  { key: "face",      label: "Identity capture",   short: "Face"      },
  { key: "ic",        label: "Document capture",    short: "Document"  },
  { key: "workspace", label: "Workspace capture",   short: "Workspace" },
  { key: "hands",     label: "Hand registration",   short: "Hands"     },
];

const stepCopy: Record<Exclude<Step, "complete">, { title: string; body: string }> = {
  face:      { title: "Identity capture",   body: "Position the worker's face clearly in frame. Keep the camera steady and ensure good lighting before capturing." },
  ic:        { title: "Document capture",   body: "Hold the identity card flat and close to the camera. Avoid glare on the laminated surface." },
  workspace: { title: "Workspace capture",  body: "Frame the full work area. This reference shot anchors all downstream evidence to the correct environment." },
  hands:     { title: "Hand registration",  body: "Place both hands palm-down inside the frame and hold steady. A snapshot will be taken automatically." },
};

export default function IdentityVerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const stepRef = useRef<Step>("face");
  const [step, setStepInner] = useState<Step>("face");

  const setStep = useCallback((s: Step) => {
    stepRef.current = s;
    setStepInner(s);
  }, []);

  useEffect(() => {
    const s = searchParams.get("step");
    if (s === "hands") setStep("hands");
    else if (s === "ic") setStep("ic");
    else if (s === "workspace") setStep("workspace");
  }, [searchParams, setStep]);

  const [isCapturing, setIsCapturing] = useState(false);
  const [handsReady, setHandsReady] = useState(false);
  const [prepCountdown, setPrepCountdown] = useState(5);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const capturedSnapshotRef = useRef<string | null>(null);
  const colorSnapshotRef = useRef<string | null>(null);
  const handCropRefs = useRef<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const latestHandLandmarksRef = useRef<{ x: number; y: number; z?: number }[][]>([]);
  const handsReadyRef = useRef(false);
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanCountdown, setScanCountdown] = useState(3);
  type FaceState = "searching" | "detected" | "countdown" | "scanning" | "captured";
  const [faceState, setFaceStateInner] = useState<FaceState>("searching");
  const faceStateRef = useRef<FaceState>("searching");
  const [faceCountdown, setFaceCountdown] = useState(3);
  const faceCountdownRef2 = useRef(3);
  const detectedSinceRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);

  const setFaceState = useCallback((s: FaceState) => {
    faceStateRef.current = s;
    setFaceStateInner(s);
  }, []);

  const [logs, setLogs] = useState<{ time: string; msg: string }[]>([]);

  const addLog = useCallback((msg: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-GB", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    });
    setLogs((prev) => [...prev.slice(-4), { time, msg }]);
  }, []);

  useEffect(() => {
    addLog("Verification pipeline active.");
    addLog("Awaiting first capture.");
  }, [addLog]);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const userPickedDeviceRef = useRef(false);
  const [userPickedDevice, setUserPickedDevice] = useState(false);

  useEffect(() => {
    capturedSnapshotRef.current = capturedSnapshot;
  }, [capturedSnapshot]);

  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((startHz: number, endHz: number, durationMs: number, volume = 0.08) => {
    if (isMuted) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(startHz, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(endHz, ctx.currentTime + durationMs / 1000);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
      gain.gain.setValueAtTime(volume, ctx.currentTime + durationMs / 1000 - 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {}
  }, [isMuted, getAudioCtx]);

  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    shutterAudioRef.current = new Audio("https://github.com/wesbos/JavaScript30/raw/master/19%20-%20Webcam%20Fun/snap.mp3");
    shutterAudioRef.current.load();
  }, []);

  const playShutter = useCallback(() => {
    if (isMuted || !shutterAudioRef.current) return;
    shutterAudioRef.current.currentTime = 0;
    shutterAudioRef.current.volume = 0.5;
    shutterAudioRef.current.play().catch(() => {});
  }, [isMuted]);

  const currentStepIndex = steps.findIndex(s => s.key === step);

  useEffect(() => {
    async function setupCamera() {
      try {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        
        const initialDevices = await navigator.mediaDevices.enumerateDevices();
        const initialVideo = initialDevices.filter(d => d.kind === "videoinput");
        setDevices(initialVideo);

        const picked = userPickedDeviceRef.current && initialVideo[currentDeviceIndex]?.deviceId;
        const primaryConstraints: MediaStreamConstraints = {
          video: step === "face" && !picked
            ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
            : picked
              ? { deviceId: { exact: initialVideo[currentDeviceIndex].deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
              : { facingMode: step === "face" ? "user" : "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
        } catch (primaryErr) {
          console.warn("Primary camera constraints failed, trying fallback...", primaryErr);
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const finalDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices(finalDevices.filter(d => d.kind === "videoinput"));
      } catch (err) {
        console.error("Camera access failed completely:", err);
        toast.error("Camera access denied. Please check site permissions.");
      }
    }
    setupCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [step, currentDeviceIndex]);

  const handleRestart = () => {
    setStep("face");
    setCapturedSnapshot(null);
    capturedSnapshotRef.current = null;
    handsReadyRef.current = false;
    setHandsReady(false);
    setPrepCountdown(5);
    addLog("Session restarted.");
    addLog("Awaiting first capture.");
  };

  const handleBack = () => {
    if (step === "ic") setStep("face");
    else if (step === "workspace") setStep("ic");
    else if (step === "hands") setStep("workspace");
    setCapturedSnapshot(null);
    capturedSnapshotRef.current = null;
    handsReadyRef.current = false;
    setHandsReady(false);
    setPrepCountdown(5);
    addLog("Returned to previous step.");
  };

  const doFaceCapture = useCallback(() => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);
    setFaceState("scanning");
    playTone(520, 880, 400);
    setTimeout(() => {
      setFaceState("captured");
      playShutter();
      setTimeout(() => {
        isCapturingRef.current = false;
        setIsCapturing(false);
        setFaceState("searching");
        setStep("ic");
        addLog("Face reference captured.");
      }, 900);
    }, 4000);
  }, [addLog, setFaceState, playShutter, playTone, setStep]);

  useEffect(() => {
    if (faceState !== "scanning") return;
    const t0 = setTimeout(() => setScanCountdown(3), 0);
    const t1 = setTimeout(() => setScanCountdown(2), 1200);
    const t2 = setTimeout(() => setScanCountdown(1), 2400);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [faceState]);

  const handleCapture = () => {
    setIsCapturing(true);
    playShutter();
    setTimeout(() => {
      setIsCapturing(false);
      if (step === "ic") { setStep("workspace"); addLog("Document captured."); }
      else if (step === "workspace") { setStep("hands"); addLog("Workspace recorded. Waiting for hand registration."); }
    }, 1000);
  };

  useEffect(() => {
    if (step !== "face") return;
    let active = true;
    let cdTimer: ReturnType<typeof setInterval> | null = null;

    const clearCountdown = () => {
      if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
      faceCountdownRef2.current = 3;
      setFaceCountdown(3);
    };

    const startCountdown = () => {
      if (cdTimer) return;
      setFaceState("countdown");
      faceCountdownRef2.current = 3;
      setFaceCountdown(3);
      cdTimer = setInterval(() => {
        if (!active) return;
        faceCountdownRef2.current -= 1;
        setFaceCountdown(faceCountdownRef2.current);
        if (faceCountdownRef2.current <= 0) {
          if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
          if (active) doFaceCapture();
        }
      }, 1000);
    };

    const detect = async () => {
      const st = faceStateRef.current;
      if (!active || st === "scanning" || st === "captured") return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        const FD = (window as any).FaceDetector;
        if (!FD) { if (st !== "searching") setFaceState("searching"); return; }
        const faces = await new FD({ fastMode: true, maxDetectedFaces: 1 }).detect(video);
        if (!active) return;
        const st2 = faceStateRef.current;
        if (st2 === "scanning" || st2 === "captured") return;

        if (faces.length > 0) {
          const bb = faces[0].boundingBox;
          const vw = video.videoWidth || 1280;
          const vh = video.videoHeight || 720;
          const cx = bb.x + bb.width / 2;
          const cy = bb.y + bb.height / 2;
          const inOval = cx > vw * 0.28 && cx < vw * 0.72 && cy > vh * 0.14 && cy < vh * 0.86;

          if (inOval) {
            if (st2 === "searching") {
              setFaceState("detected");
              detectedSinceRef.current = Date.now();
              playTone(440, 520, 180);
            } else if (st2 === "detected") {
              if (detectedSinceRef.current && Date.now() - detectedSinceRef.current > 700) {
                startCountdown();
              }
            }
          } else {
            detectedSinceRef.current = null;
            clearCountdown();
            if (st2 !== "searching") setFaceState("searching");
          }
        } else {
          detectedSinceRef.current = null;
          clearCountdown();
          if (st2 !== "searching") setFaceState("searching");
        }
      } catch {
        if (faceStateRef.current === "searching") return;
        setFaceState("searching");
      }
    };

    const interval = setInterval(detect, 250);
    return () => { active = false; if (interval) clearInterval(interval); clearCountdown(); };
  }, [step, doFaceCapture, setFaceState, playTone]);

  const doHandCapture = useCallback(async () => {
    if (!videoRef.current || capturedSnapshot) return;

    const blurScore = (dataUrl: string): Promise<number> =>
      new Promise((resolve) => {
        const img = document.createElement("img") as HTMLImageElement;
        img.onload = () => {
          const size = 200;
          const cv = document.createElement("canvas");
          cv.width = size; cv.height = size;
          const cx = cv.getContext("2d");
          if (!cx) { resolve(0); return; }
          cx.drawImage(img, 0, 0, size, size);
          const { data } = cx.getImageData(0, 0, size, size);
          const g = new Float32Array(size * size);
          for (let i = 0; i < size * size; i++)
            g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
          let sum = 0, sq = 0, n = 0;
          for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
            const l = Math.abs(4 * g[y * size + x] - g[(y - 1) * size + x] - g[(y + 1) * size + x] - g[y * size + x - 1] - g[y * size + x + 1]);
            sum += l; sq += l * l; n++;
          }
          const m = sum / n;
          resolve(sq / n - m * m);
        };
        img.onerror = () => resolve(0);
        img.src = dataUrl;
      });

    const captureFrame = (): string => {
      if (!videoRef.current) return "";
      const w = videoRef.current.videoWidth || 1280;
      const h = videoRef.current.videoHeight || 720;
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const cx = cv.getContext("2d");
      if (!cx) return "";
      cx.drawImage(videoRef.current, 0, 0, w, h);
      return cv.toDataURL("image/jpeg", 0.92);
    };

    const cropHands = async (dataUrl: string): Promise<string[]> => {
      const landmarkSets = latestHandLandmarksRef.current.slice(0, 2);
      if (landmarkSets.length === 0) return [];

      return new Promise((resolve) => {
        const img = document.createElement("img") as HTMLImageElement;
        img.onload = () => {
          const crops = landmarkSets.map((landmarks) => {
            const xs = landmarks.map(p => p.x);
            const ys = landmarks.map(p => p.y);
            const minX = Math.max(0, Math.min(...xs) - 0.12);
            const minY = Math.max(0, Math.min(...ys) - 0.16);
            const maxX = Math.min(1, Math.max(...xs) + 0.12);
            const maxY = Math.min(1, Math.max(...ys) + 0.16);
            const sourceX = minX * img.naturalWidth;
            const sourceY = minY * img.naturalHeight;
            const sourceW = Math.max(1, (maxX - minX) * img.naturalWidth);
            const sourceH = Math.max(1, (maxY - minY) * img.naturalHeight);
            const crop = document.createElement("canvas");
            const cSize = 640;
            crop.width = cSize;
            crop.height = cSize;
            const ctx = crop.getContext("2d");
            if (!ctx) return null;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, cSize, cSize);
            const scale = Math.min(cSize / sourceW, cSize / sourceH);
            const drawW = sourceW * scale;
            const drawH = sourceH * scale;
            ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, (cSize - drawW) / 2, (cSize - drawH) / 2, drawW, drawH);
            return crop.toDataURL("image/jpeg", 0.94);
          }).filter((crop): crop is string => Boolean(crop));

          resolve(crops);
        };
        img.onerror = () => resolve([]);
        img.src = dataUrl;
      });
    };

    addLog("Capturing sharpest reference...");
    let bestFrame = "";
    let bestScore = -1;
    
    for (let i = 0; i < 3; i++) {
      const frame = captureFrame();
      const score = await blurScore(frame);
      if (score > bestScore) {
        bestScore = score;
        bestFrame = frame;
      }
      if (score > 60) break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (bestFrame) {
      colorSnapshotRef.current = bestFrame;
      capturedSnapshotRef.current = bestFrame;
      setCapturedSnapshot(bestFrame);
      playShutter();
      handsReadyRef.current = false;
      setHandsReady(false);

      const crops = await cropHands(bestFrame);
      handCropRefs.current = crops;
      addLog("Reference captured. Index: " + Math.round(bestScore));
    }
  }, [capturedSnapshot, playShutter, addLog]);

  const initHands = useCallback(() => {
    if (typeof window === "undefined" || !(window as any).Hands || handsRef.current) return;
    
    const HandsClass = (window as any).Hands;
    const hands = new HandsClass({
      locateFile: (file: string) => "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" + file,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results: any) => {
      if (stepRef.current !== "hands" || capturedSnapshotRef.current) return;

      const landmarks = results.multiHandLandmarks || [];
      const handCount = landmarks.length;
      latestHandLandmarksRef.current = landmarks;
      
      if (handCount === 2) {
        if (!handsReadyRef.current) {
          handsReadyRef.current = true;
          setHandsReady(true);
          addLog("Dual hands detected. Hold steady...");
          playTone(660, 880, 200);
        }
      } else {
        if (handsReadyRef.current) {
          handsReadyRef.current = false;
          setHandsReady(false);
          setPrepCountdown(5);
          addLog("Hand lost. Reposition both hands.");
        }
      }
    });

    handsRef.current = hands;
    setIsMediaPipeLoaded(true);
  }, [addLog, playTone]);

  useEffect(() => {
    if (step === "hands" && !isMediaPipeLoaded) {
      const checkInterval = setInterval(() => {
        if ((window as any).Hands) {
          initHands();
          clearInterval(checkInterval);
        }
      }, 500);
      return () => clearInterval(checkInterval);
    }
  }, [step, isMediaPipeLoaded, initHands]);

  useEffect(() => {
    if (!isMediaPipeLoaded || step !== "hands" || capturedSnapshot) return;

    let active = true;
    const process = async () => {
      if (!active) return;
      if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
        try {
          await handsRef.current.send({ image: videoRef.current });
        } catch (e) {
          console.error("MediaPipe send error", e);
        }
      }
      requestAnimationFrame(process);
    };
    requestAnimationFrame(process);
    return () => { active = false; };
  }, [isMediaPipeLoaded, step, capturedSnapshot]);

  useEffect(() => {
    if (!handsReady || capturedSnapshot) return;
    let prep = 5;
    setPrepCountdown(5);
    let active = true;
    const timer = setInterval(() => {
      if (!active) return;
      prep -= 1;
      setPrepCountdown(prep);
      if (prep <= 0) {
        if (timer) clearInterval(timer);
        if (active) doHandCapture();
      }
    }, 1000);
    return () => { active = false; if (timer) clearInterval(timer); };
  }, [handsReady, capturedSnapshot, doHandCapture]);

  const handleConfirm = async () => {
    if (!capturedSnapshot) return;
    setIsAnalyzing(true);
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("hand_master_")) localStorage.removeItem(key);
      });
      localStorage.setItem("hand_master_" + id, capturedSnapshot);
      localStorage.setItem("hand_master_latest", capturedSnapshot);
      if (colorSnapshotRef.current) {
        localStorage.setItem("hand_master_color_" + id, colorSnapshotRef.current);
        localStorage.setItem("hand_master_color_latest", colorSnapshotRef.current);
      }
      if (handCropRefs.current.length > 0) {
        localStorage.setItem("hand_master_crops_" + id, JSON.stringify(handCropRefs.current));
        localStorage.setItem("hand_master_crops_latest", JSON.stringify(handCropRefs.current));
      }
    } catch {}

    addLog("Analyzing biometric profile...");
    try {
      const res = await fetch("/api/verify/analyze-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: capturedSnapshot,
          ...(colorSnapshotRef.current ? { colorImage: colorSnapshotRef.current } : {}),
          ...(handCropRefs.current.length > 0 ? { handCrops: handCropRefs.current } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const profile = data.profile ?? data;
        try {
          localStorage.setItem("hand_profile_" + id, JSON.stringify(profile));
          localStorage.setItem("hand_profile_latest", JSON.stringify(profile));
        } catch {}
        const markerCount = Array.isArray(profile.physical_markers) ? profile.physical_markers.length : (profile.physical_marker?.present ? 1 : 0);
        addLog("Nails: " + (profile.nail_length ?? "?") + " - Markers: " + markerCount);
        if (markerCount === 0) {
          addLog("WARNING: No distinct marker found. Verification relies on nail length only. Retry in better lighting for stronger security.");
          toast.warning("No biometric marker detected", { description: "No mole, scar, or mark was found on the registered hands. Verification accuracy will be reduced. Consider retrying with better lighting." });
        }
      }
    } catch {
      addLog("Profile analysis failed — image-only verification.");
    }

    addLog("Reference locked. Verification ready.");
    setIsAnalyzing(false);
    setStep("complete");
  };

  const handleRetry = () => {
    setCapturedSnapshot(null);
    capturedSnapshotRef.current = null;
    handsReadyRef.current = false;
    handCropRefs.current = [];
    setHandsReady(false);
    setPrepCountdown(5);
    addLog("Retry requested. Reposition both hands.");
  };

  const activeCopy = step === "complete" ? null : stepCopy[step];

  return (
    <div className="page-shell min-h-screen flex flex-col">
      <Script 
        src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" 
        strategy="afterInteractive"
        onLoad={initHands}
      />

      <header className="sticky top-0 z-10 border-b border-border-subtle bg-background/80 backdrop-blur">
        <div className="page-wrap flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {step === "face" ? (
              <Link href="/session/new">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground transition-all hover:bg-transparent! hover:text-primary hover:border-primary border border-transparent">
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-muted-foreground transition-all hover:bg-transparent! hover:text-primary hover:border-primary border border-transparent">
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            <div className="h-4 w-px bg-border-subtle" />
            <BrandMark />
          </div>
          <div className="flex items-center gap-2">
            {step !== "face" && step !== "complete" && (
              <Button variant="ghost" size="sm" onClick={handleRestart} className="gap-1.5 text-muted-foreground transition-all hover:bg-transparent! hover:text-primary hover:border-primary border border-transparent">
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Restart</span>
              </Button>
            )}
            {devices.length > 1 && step !== "complete" && (() => {
              const isPhone = (d: MediaDeviceInfo) =>
                /iphone|android|continuity|mobile|back camera|front camera|back|rear/i.test(d.label);
              const phoneCams    = devices.filter(isPhone);
              const nonPhoneCams = devices.filter(d => !isPhone(d));
              const currentDev   = devices[currentDeviceIndex];
              const phoneActive  = isPhone(currentDev ?? devices[0]);
              const frontIdx = devices.findIndex(d => /front/i.test(d.label));
              const backIdx  = devices.findIndex(d => /back|rear/i.test(d.label));
              const hasFrontBack = frontIdx !== -1 && backIdx !== -1;

              const pickCamera = (i: number) => {
                userPickedDeviceRef.current = true;
                setUserPickedDevice(true);
                setCurrentDeviceIndex(i);
              };

              const handleSwitch = () => {
                if (phoneActive && nonPhoneCams.length > 0) {
                  pickCamera(devices.indexOf(nonPhoneCams[0]));
                } else if (!phoneActive && phoneCams.length > 0) {
                  pickCamera(backIdx !== -1 ? backIdx : devices.indexOf(phoneCams[0]));
                } else {
                  pickCamera((currentDeviceIndex + 1) % devices.length);
                }
              };

              return (
                <div className="hidden sm:flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleSwitch}
                    className="gap-1.5 text-muted-foreground transition-all hover:bg-transparent! hover:text-primary hover:border-primary border border-transparent">
                    <Camera className="size-3.5" />
                    Switch camera
                  </Button>
                  {phoneActive && hasFrontBack && (
                    <div className="flex items-center gap-1 rounded-full border border-border-subtle p-0.5">
                      {[{ label: "Front", idx: frontIdx }, { label: "Back", idx: backIdx }].map(({ label, idx }) => (
                        <button key={label} onClick={() => pickCamera(idx)}
                          className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                            currentDeviceIndex === idx && userPickedDevice
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-primary"
                          }`}>{label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="h-4 w-px bg-border-subtle" />
            <Button variant="ghost" size="sm" onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground transition-all hover:bg-transparent! hover:text-primary hover:border-primary border border-transparent">
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </Button>
            <div className="h-4 w-px bg-border-subtle" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="border-b border-border-subtle bg-background">
        <div className="page-wrap py-3 md:py-5">
          <div className="flex items-start">
            {steps.map((s, i) => {
              const isDone = step === "complete" || currentStepIndex > i;
              const isActive = s.key === step;
              return (
                <Fragment key={s.key}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative flex items-center justify-center">
                      {isActive && (
                        <span className="absolute inline-flex size-7 rounded-full bg-primary/30 animate-ping" />
                      )}
                      <div className={`relative flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300 ${
                        isDone   ? "bg-primary text-primary-foreground" :
                        isActive ? "bg-primary text-primary-foreground" :
                                   "border border-border-subtle text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle2 className="size-3.5" /> : i + 1}
                      </div>
                    </div>
                    <span className={`text-[11px] font-medium hidden sm:block transition-colors ${
                      isActive ? "text-foreground" : isDone ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {s.short}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`mt-3.5 mx-3 h-px flex-1 transition-all duration-500 ${isDone ? "bg-primary/50" : "bg-border-subtle"}`} />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <main className="page-wrap flex-1 grid gap-6 py-4 md:py-8 lg:grid-cols-[1.8fr_1fr] lg:items-start">
        <section className="flex flex-col gap-4 fade-up lg:col-start-1">
          <div className="relative aspect-video overflow-hidden rounded-[28px] border border-border-subtle bg-black shadow-sm">
            <video
              ref={videoRef}
              autoPlay muted playsInline
              style={{ transform: "scaleX(-1)" }}
              className={`h-full w-full object-cover transition-all duration-500 ${
                step === "complete" ? "scale-[1.04] opacity-20 blur-sm" : capturedSnapshot ? "opacity-0" : "opacity-100"
              }`}
            />

            {step === "ic" && (
              <div className="absolute inset-0">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 16 9" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <mask id="doc-rect-mask">
                      <rect width="16" height="9" fill="white" />
                      <rect x="4.2" y="2.0" width="7.6" height="5.0" rx="0.3" fill="black" />
                    </mask>
                    <clipPath id="doc-rect-clip">
                      <rect x="4.2" y="2.0" width="7.6" height="5.0" rx="0.3" />
                    </clipPath>
                    <pattern id="doc-dots" x="0" y="0" width="0.22" height="0.22" patternUnits="userSpaceOnUse">
                      <circle cx="0.11" cy="0.11" r="0.02" fill="rgba(255,255,255,0.1)" />
                    </pattern>
                  </defs>
                  <rect width="16" height="9" fill="url(#doc-dots)" />
                  <rect width="16" height="9" fill="rgba(0,0,0,0.62)" mask="url(#doc-rect-mask)" />
                  <rect x="4.2" y="2.0" width="7.6" height="5.0" rx="0.3"
                    fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.04" />
                  <g stroke="#2dd4bf" strokeWidth="0.14" strokeLinecap="round" fill="none">
                    <path d="M4.2,2.55 V2.0 H4.75" />
                    <path d="M11.8,2.55 V2.0 H11.25" />
                    <path d="M4.2,6.45 V7.0 H4.75" />
                    <path d="M11.8,6.45 V7.0 H11.25" />
                  </g>
                  <g clipPath="url(#doc-rect-clip)">
                    <line x1="4.2" y1="2.0" x2="11.8" y2="2.0"
                      stroke="rgba(45,212,191,0.7)" strokeWidth="0.06"
                      className="face-scan-sweep" />
                  </g>
                </svg>
                <div className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none">
                  <div className="rounded-full bg-black/65 px-5 py-2 backdrop-blur-sm">
                    <p className="text-[11px] font-medium tracking-wide text-white">
                      Hold the IC card flat — avoid glare
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === "face" && (
              <div className="absolute inset-0">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 16 9" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <mask id="face-oval-mask">
                      <rect width="16" height="9" fill="white" />
                      <ellipse cx="8" cy="4.5" rx="2.15" ry="2.85" fill="black" />
                    </mask>
                    <clipPath id="face-oval-clip">
                      <ellipse cx="8" cy="4.5" rx="2.15" ry="2.85" />
                    </clipPath>
                    <pattern id="dot-grid" x="0" y="0" width="0.22" height="0.22" patternUnits="userSpaceOnUse">
                      <circle cx="0.11" cy="0.11" r="0.022" fill="rgba(255,255,255,0.12)" />
                    </pattern>
                  </defs>
                  <rect width="16" height="9" fill="url(#dot-grid)" />
                  <rect width="16" height="9" fill="rgba(0,0,0,0.58)" mask="url(#face-oval-mask)" />

                  {(faceState === "searching" || faceState === "detected") && (
                    <ellipse cx="8" cy="4.5" rx="2.15" ry="2.85" fill="none"
                      stroke={faceState === "detected" ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.32)"}
                      strokeWidth="0.05" strokeDasharray="0.18 0.09" />
                  )}

                  {faceState === "searching" && (
                    <>
                      <path d="M7.55,1.68 H8.45" stroke="#2dd4bf" strokeWidth="0.11" strokeLinecap="round" />
                      <path d="M7.55,7.32 H8.45" stroke="#2dd4bf" strokeWidth="0.11" strokeLinecap="round" />
                      <path d="M5.82,4.15 V4.85" stroke="#2dd4bf" strokeWidth="0.11" strokeLinecap="round" />
                      <path d="M10.18,4.15 V4.85" stroke="#2dd4bf" strokeWidth="0.11" strokeLinecap="round" />
                    </>
                  )}

                  {faceState === "countdown" && (
                    <text x="8" y="5.15" textAnchor="middle" fill="white"
                      fontSize="2.2" fontWeight="600" fontFamily="system-ui">
                      {faceCountdown}
                    </text>
                  )}

                  {faceState === "scanning" && (
                    <g clipPath="url(#face-oval-clip)">
                      <line x1="5.5" y1="1.65" x2="10.5" y2="1.65"
                        stroke="rgba(255,255,255,0.55)" strokeWidth="0.05"
                        className="face-scan-sweep" />
                      <text x="8" y="5.1" textAnchor="middle" fill="white"
                        fontSize="1.6" fontWeight="700" fontFamily="system-ui" opacity="0.9">
                        {scanCountdown}
                      </text>
                    </g>
                  )}

                  {(faceState === "scanning" || faceState === "captured") && (
                    <path
                      d="M 8 1.65 A 2.15 2.85 0 0 1 10.15 4.5 A 2.15 2.85 0 0 1 8 7.35 A 2.15 2.85 0 0 1 5.85 4.5 A 2.15 2.85 0 0 1 8 1.65"
                      fill="none"
                      stroke={faceState === "captured" ? "#22c55e" : "white"}
                      strokeWidth="0.07" strokeLinecap="round"
                      strokeDasharray="16 100"
                      strokeDashoffset={faceState === "captured" ? "0" : "16"}
                      className={faceState === "scanning" ? "face-scan-ring" : ""}
                    />
                  )}

                  {faceState === "captured" && (
                    <g>
                      <circle cx="8" cy="4.5" r="1.1" fill="rgba(34,197,94,0.12)" />
                      <circle cx="8" cy="4.5" r="0.78" fill="#22c55e" />
                      <path d="M7.68,4.52 L7.9,4.74 L8.38,4.2"
                        stroke="white" strokeWidth="0.1" fill="none"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}
                </svg>

                {faceState === "captured" && (
                  <div className="absolute inset-0 bg-white/15 pointer-events-none" />
                )}

                <div className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none">
                  <div className="rounded-full bg-black/65 px-5 py-2 backdrop-blur-sm">
                    <p className="text-[11px] font-medium tracking-wide text-white">
                      {faceState === "searching" && "Position your face within the oval"}
                      {faceState === "detected"  && "Face detected — hold still"}
                      {faceState === "countdown" && "Scanning in " + faceCountdown + "..."}
                      {faceState === "scanning"  && "Hold still — scanning..."}
                      {faceState === "captured"  && "[OK]  Identity captured"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {capturedSnapshot && step === "hands" && (
              <Image src={capturedSnapshot} alt="Captured frame" className="absolute inset-0 h-full w-full object-cover" fill unoptimized />
            )}

            {step === "hands" && !capturedSnapshot && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-[72%] w-[84%]">
                  <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 60" preserveAspectRatio="none">
                    <g stroke="#2dd4bf" strokeWidth="0.8" strokeLinecap="round" fill="none">
                      <path d="M0,8 L0,0 L10,0" />
                      <path d="M90,0 L100,0 L100,8" />
                      <path d="M0,52 L0,60 L10,60" />
                      <path d="M90,60 L100,60 L100,52" />
                      <line x1="50" y1="8" x2="50" y2="52" strokeDasharray="2 2" strokeOpacity="0.35" />
                    </g>
                    <g opacity="0.12" fill="white">
                      <ellipse cx="26" cy="30" rx="14" ry="18" />
                    </g>
                    <g opacity="0.12" fill="white">
                      <ellipse cx="74" cy="30" rx="14" ry="18" />
                    </g>
                  </svg>
                  <div className="absolute inset-0 flex">
                    <div className="flex-1 flex flex-col items-center justify-end pb-4 gap-1">
                      <Hand className="size-5 text-white/30 -scale-x-100" />
                      <span className="text-[10px] font-medium tracking-widest uppercase text-white/40">Left hand</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-end pb-4 gap-1">
                      <Hand className="size-5 text-white/30" />
                      <span className="text-[10px] font-medium tracking-widest uppercase text-white/40">Right hand</span>
                    </div>
                  </div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3.5 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[#2dd4bf] inline-block animate-pulse" />
                    {handsReady ? "Hold still — capturing in " + prepCountdown + "s" : "Place both hands palm-down"}
                  </div>
                </div>
              </div>
            )}

            {step === "complete" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 fade-up">
                <div className="flex size-16 items-center justify-center rounded-3xl bg-white/10 text-white backdrop-blur-sm ring-1 ring-white/20">
                  <CheckCircle2 className="size-8" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold tracking-[-0.04em] text-white">Verification secured</p>
                  <p className="mt-1.5 text-sm text-white/70">Identity reference locked for this session.</p>
                </div>
              </div>
            )}

            {step !== "complete" && (
              <div className="absolute bottom-4 left-4">
                <div className="rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                  Step {(currentStepIndex + 1)} of {steps.length} — {steps[currentStepIndex]?.label}
                </div>
              </div>
            )}
          </div>
        </section>

        <Card className="surface-1 fade-up flex flex-col lg:col-start-2 lg:row-span-2">
          <CardContent className="flex flex-col flex-1 space-y-6 py-5 px-4 md:py-8 md:px-7">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-2xl border-2 border-primary/30">
                  {step === "complete" ? <ShieldCheck className="size-5 text-primary" /> :
                   step === "hands"    ? <Activity className="size-5 text-primary" /> :
                                         <ShieldCheck className="size-5 text-primary" />}
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                  {step === "complete" ? "Complete" : "Step " + (currentStepIndex + 1) + " of " + steps.length}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {step === "complete" ? "Session Secure" : activeCopy?.title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step === "complete" ? "Biometric identity and environment reference have been successfully captured. You can now proceed to the recording session." : activeCopy?.body}
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-4">
              {step === "face" && faceState !== "scanning" && faceState !== "captured" && (
                <Button size="lg" className="w-full h-14 text-base font-semibold shadow-xl" onClick={doFaceCapture} disabled={isCapturing}>
                  {isCapturing ? <Loader2 className="size-4 animate-spin mr-2" /> : <Camera className="size-4 mr-2" />}
                  Manual Identity Capture
                </Button>
              )}

              {step === "hands" && !handsReady && !capturedSnapshot && (
                <div className="rounded-2xl bg-muted/30 p-8 border border-border-subtle flex flex-col items-center gap-4 text-center animate-pulse">
                  <Hand className="size-10 text-muted-foreground/40" />
                  <div>
                    <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">Awaiting Dual Hands</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Place both hands in frame to begin</p>
                  </div>
                  {!isMediaPipeLoaded && (
                    <div className="flex items-center gap-2 mt-2">
                       <Loader2 className="size-3 animate-spin text-primary" />
                       <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Initialising Forensic Scanner...</span>
                    </div>
                  )}
                </div>
              )}

              {step === "hands" && handsReady && !capturedSnapshot && (
                <div className="rounded-2xl bg-primary/5 p-6 border border-primary/20 flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    <Loader2 className="size-10 text-primary animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                      {prepCountdown}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">Keep steady</p>
                    <p className="text-xs text-muted-foreground mt-1">Automatic capture in progress...</p>
                  </div>
                  <Button variant="secondary" size="sm" className="w-full mt-2" onClick={doHandCapture}>
                    <Camera className="size-4 mr-2" />
                    Capture Now
                  </Button>
                </div>
              )}

              {capturedSnapshot && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="w-full" onClick={handleRetry}>
                      <RotateCcw className="size-4 mr-2" />
                      Retry
                    </Button>
                    <Button className="w-full" onClick={handleConfirm} disabled={isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
                      {isAnalyzing ? "Analyzing..." : "Confirm"}
                    </Button>
                  </div>
                </div>
              )}

              {(step === "ic" || step === "workspace") && (
                <Button size="lg" className="w-full h-14 text-base font-semibold shadow-xl" onClick={handleCapture} disabled={isCapturing}>
                  {isCapturing ? <Loader2 className="size-4 animate-spin mr-2" /> : <Camera className="size-4 mr-2" />}
                  Capture Reference
                </Button>
              )}

              {step === "complete" && (
                <Link href={"/session/" + id + "/record"} className="w-full">
                  <Button size="lg" className="w-full h-14 text-base font-semibold shadow-xl">
                    Start Recording
                    <Activity className="size-4 ml-2" />
                  </Button>
                </Link>
              )}

              {step !== "complete" && step !== "hands" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      addLog("Jumping to Hand Registration.");
                      setStep("hands");
                    }}
                    className="flex-1 border-amber-500/50 hover:bg-amber-500/10 text-amber-500 font-semibold text-[10px] h-8"
                  >
                    <Hand className="size-3 mr-2" />
                    Jump to Hands
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      addLog("Verification Bypassed (Demo).");
                      setStep("complete");
                    }}
                    className="flex-1 border-purple-500/50 hover:bg-purple-500/10 text-purple-500 font-semibold text-[10px] h-8"
                  >
                    <Zap className="size-3 mr-2" />
                    Bypass All
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border-subtle bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <Terminal className="size-3" />
                Live Pipeline Log
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="shrink-0 text-muted-foreground/40">{log.time}</span>
                    <span className={i === (logs.length - 1) ? "text-primary font-medium" : "text-muted-foreground"}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border-subtle py-6 bg-background">
        <div className="page-wrap flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Zero-Trust Biometric Core v4.2.0 Active
          </div>
          <div className="flex gap-6">
            <span>Neural Engine: Gemini 2.5 Flash</span>
            <span>Hand Markers: Enabled</span>
            <span>Frame Rate: 30 FPS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
