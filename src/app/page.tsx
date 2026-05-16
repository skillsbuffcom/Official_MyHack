"use client";
import { useState } from "react";
import Link from "next/link";
import { Zap, Activity, Award, ChevronRight, Loader2, Sparkles, Globe, Fingerprint, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBypass = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          icNumber: "DEMO-12345", 
          workerName: "Demo Candidate",
          trade: "ELECTRICAL_INSTALLATION",
          taskClaim: "Final Circuit Termination & Testing"
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        router.push(`/session/${data.sessionId}/verify?step=hands`);
      }
    } catch (err) {
      console.error("Bypass failed", err);
    } finally {
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

      {/* Mesh Gradient Background - Living Fluid Version */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-purple-200/30 rounded-full blur-[140px] animate-[drift_20s_infinite_linear]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[60%] h-[60%] bg-teal-100/30 rounded-full blur-[120px] animate-[drift_25s_infinite_linear_reverse]" />
        <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-orange-100/10 rounded-full blur-[100px] animate-[pulse-soft_15s_infinite_ease-in-out]" />
      </div>

      <style jsx>{`
        @keyframes grid-scroll {
          from { background-position: 0 0; }
          to { background-position: 400px 400px; }
        }
        @keyframes text-flow {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes drift {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(5%, 10%) rotate(120deg) scale(1.1); }
          66% { transform: translate(-5%, 5%) rotate(240deg) scale(0.9); }
          100% { transform: translate(0, 0) rotate(360deg) scale(1); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.3; transform: scale(1) translate(0, 0); }
          50% { opacity: 0.6; transform: scale(1.1) translate(5%, -5%); }
        }
      `}</style>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-gray-200/50 bg-white/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <BrandMark />
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600 uppercase tracking-widest">
            <Link href="#features" className="hover:text-teal-600 transition-colors">Forensics</Link>
            <Link href="#network" className="hover:text-teal-600 transition-colors">Identity Network</Link>
            <Link href="/profile/DEMO-12345" className="text-purple-600 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Demo Portfolio
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000">
            <span className="flex size-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Zero-Trust Identity Protocol</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-gray-950 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Verify Skill with <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-purple-600 via-orange-400 to-teal-500 bg-[length:200%_auto] animate-[text-flow_15s_linear_infinite]">
              Forensic Integrity
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            The world's first biometric identity network for technical trade validation. 
            Real-world performance, verified by AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link
              href="/intake"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all shadow-xl shadow-teal-500/20 active:scale-95 hover:shadow-teal-500/40"
            >
              <Zap className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
              Start Verified Session
            </Link>
            
            <button
              onClick={handleBypass}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 font-bold px-10 py-5 rounded-2xl text-lg transition-all shadow-sm active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-purple-500" />}
              Quick Demo Bypass
            </button>
          </div>
        </div>
      </main>

      {/* Feature Section */}
      <section id="features" className="relative z-10 py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Card 1: Biometrics */}
            <div className="group p-10 rounded-[3rem] bg-white/40 backdrop-blur-md border border-white/60 hover:border-teal-500/30 hover:bg-white/60 hover:-translate-y-2 transition-all duration-500 shadow-xl shadow-gray-200/5">
              <div className="size-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform group-hover:bg-teal-500/20">
                <Fingerprint className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-950 mb-4">Biometric Lock</h3>
              <p className="text-gray-600 leading-relaxed">
                Immutable hand forensics verify identity using biological markers—nails, texture, and marks—ensuring 100% person-to-performance integrity.
              </p>
            </div>

            {/* Card 2: Robotics-ER */}
            <div className="group p-10 rounded-[3rem] bg-white/40 backdrop-blur-md border border-white/60 hover:border-purple-500/30 hover:bg-white/60 hover:-translate-y-2 transition-all duration-500 shadow-xl shadow-gray-200/5">
              <div className="size-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform group-hover:bg-purple-500/20">
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-950 mb-4">Neural Audit</h3>
              <p className="text-gray-600 leading-relaxed">
                Our Robotics-ER engine cross-references every hand gesture against job-specific technical benchmarks with sub-second accuracy.
              </p>
            </div>

            {/* Card 3: Portfolio */}
            <div className="group p-10 rounded-[3rem] bg-white/40 backdrop-blur-md border border-white/60 hover:border-orange-500/30 hover:bg-white/60 hover:-translate-y-2 transition-all duration-500 shadow-xl shadow-gray-200/5">
              <div className="size-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform group-hover:bg-orange-500/20">
                <Globe className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-950 mb-4">Public Credential</h3>
              <p className="text-gray-600 leading-relaxed">
                Every session generates a tamper-evident digital certificate, instantly linkable to a candidate's global verified portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-5xl mx-auto rounded-[4rem] bg-gradient-to-br from-gray-950 to-gray-900 p-12 md:p-20 text-center space-y-8 overflow-hidden relative shadow-2xl">
           {/* Decorative Accents */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 blur-[80px]" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 blur-[80px]" />
           
           <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
             Ready to secure your <br/> professional reputation?
           </h2>
           <p className="text-gray-400 text-lg max-w-xl mx-auto">
             Join the network of verified elite technical professionals. No guesswork, just performance.
           </p>
           <div className="pt-6">
              <Link
                href="/intake"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white font-bold px-12 py-5 rounded-2xl text-lg transition-all shadow-xl shadow-teal-500/20 active:scale-95"
              >
                Get Started
                <ChevronRight className="w-5 h-5" />
              </Link>
           </div>
        </div>
      </section>

      <footer className="relative z-10 py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
             <BrandMark />
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-l border-gray-200 pl-4">v4.2.0 Elite</span>
          </div>
          <div className="flex gap-12 text-xs font-bold uppercase tracking-widest text-gray-400">
             <span className="text-teal-600">Privacy</span>
             <span>Integrity</span>
             <span>Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
