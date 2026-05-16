"use client";
import { Fragment, useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ExternalLink, 
  Award, 
  Calendar, 
  Copy, 
  ChevronRight,
  User,
  Activity,
  Loader2,
  CheckCircle2,
  ChevronLeft
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// Grade badge styles
const gradeStyles: Record<string, string> = {
  A: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  B: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  C: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  D: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  F: "bg-red-500/10 text-red-600 border-red-500/20",
};

const hireStyles: Record<string, string> = {
  "Strong Hire": "text-emerald-600 bg-emerald-50 border-emerald-100",
  "Hire": "text-teal-600 bg-teal-50 border-teal-100",
  "Needs Development": "text-amber-600 bg-amber-50 border-amber-100",
  "Not Recommended": "text-red-600 bg-red-50 border-red-100",
};

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile/${workerId}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Fetch profile failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [workerId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Profile link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-4">
        <Loader2 className="size-12 animate-spin text-teal-500 mb-4" />
        <p className="text-gray-500 font-bold animate-pulse">Retrieving forensic records...</p>
      </div>
    );
  }

  if (!data || !data.certificates || data.certificates.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-4">
        <BrandMark className="mb-12" />
        <div className="max-w-md w-full bg-white/40 backdrop-blur-md border border-gray-100 p-12 rounded-[3rem] text-center shadow-xl">
            <User className="size-16 mx-auto mb-6 text-gray-200" />
            <h1 className="text-2xl font-bold mb-3 text-gray-950">Profile Not Found</h1>
            <p className="text-gray-500 mb-8 font-medium leading-relaxed">This worker ID does not have any verified certificates yet.</p>
            <Link href="/">
              <Button variant="outline" className="h-12 rounded-xl px-8 border-gray-200 hover:bg-gray-50">Back to Network Home</Button>
            </Link>
        </div>
      </div>
    );
  }

  const { certificates, displayName, memberSince, count } = data;
  const formattedDate = memberSince 
    ? new Date(memberSince).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
    : "Recently joined";

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-gray-900 font-sans selection:bg-teal-500/30 overflow-x-hidden relative flex flex-col">
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

      <style jsx global>{`
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

      <header className="relative z-50 border-b border-gray-200/50 bg-white/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/">
            <BrandMark />
          </Link>
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Network Home
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto px-6 py-16 w-full">
        {/* Profile Header */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-12 bg-white/40 backdrop-blur-md border border-white/60 p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 size-64 bg-teal-500/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="size-28 md:size-32 rounded-[3rem] bg-gradient-to-br from-teal-500 to-purple-600 p-0.5 shadow-xl shadow-teal-500/20">
                <div className="size-full bg-white rounded-[2.9rem] flex items-center justify-center">
                  <User className="size-14 text-gray-950" />
                </div>
              </div>
              <div className="space-y-3 text-center md:text-left">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-950 leading-tight">{displayName}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm font-bold uppercase tracking-widest text-gray-400">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100">
                    <ShieldCheck className="size-4" />
                    <span>{count} Verified Sessions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    <span>Active since {formattedDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="relative z-10 h-14 rounded-2xl px-8 border-gray-200 bg-white hover:bg-gray-50 font-bold shadow-sm"
            onClick={handleCopy} 
          >
            {copied ? <CheckCircle2 className="size-5 mr-3 text-emerald-500" /> : <Copy className="size-5 mr-3" />}
            {copied ? "Profile Copied" : "Copy Profile URL"}
          </Button>
        </div>

        {/* Certificate Grid */}
        <div className="space-y-12">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-400">Verified Credentials</h2>
            <div className="h-px flex-1 mx-12 bg-gray-200" />
          </div>

          <div className="grid gap-10">
            {certificates.map((cert: any) => (
              <Link key={cert.id} href={`/certificate/${cert.id}`}>
                <div className="group relative overflow-hidden bg-white/40 backdrop-blur-md border border-white/60 hover:border-teal-500/30 p-10 rounded-[3rem] transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                  <div className="flex flex-col md:flex-row justify-between gap-12">
                    <div className="space-y-8 flex-1">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                           <div className="px-4 py-1.5 rounded-full bg-gray-950 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                             {cert.trade.replace(/_/g, " ")}
                           </div>
                           <div className="size-1.5 bg-gray-200 rounded-full" />
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                             {new Date(cert.issuedAt?.seconds * 1000 || cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                           </span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-950 group-hover:text-teal-600 transition-colors leading-tight">
                          {cert.projectTitle}
                        </h2>
                        <p className="text-gray-500 mt-3 text-lg font-medium">Target Role: {cert.roleTargeted || "Technical Specialist"}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className={`px-6 py-2.5 rounded-2xl border text-sm font-black uppercase tracking-widest shadow-sm ${gradeStyles[cert.grade] || gradeStyles.C}`}>
                          Grade {cert.grade}
                        </div>
                        {cert.hireSignal && (
                          <div className={`px-6 py-2.5 rounded-2xl border text-sm font-black uppercase tracking-widest shadow-sm ${hireStyles[cert.hireSignal] || ""}`}>
                            {cert.hireSignal}
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-600 shadow-sm">
                          <Activity className="size-4 text-orange-500" />
                          Safety {cert.safetyScore}%
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0">
                      <div className="size-16 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-teal-500 group-hover:border-teal-500 transition-all duration-500 shadow-sm group-hover:shadow-teal-500/20">
                        <ChevronRight className="size-8 text-gray-300 group-hover:text-white transition-all duration-500 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-gray-100 py-16 bg-white/40">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-widest">
            <ShieldCheck className="size-5 text-teal-500" />
            <span>VeriPro Biometric Identity Network</span>
          </div>
          <p className="text-gray-300 font-bold text-[9px] uppercase tracking-[0.4em]">
            Trust through forensic validation • v4.2.0
          </p>
        </div>
      </footer>
    </div>
  );
}
