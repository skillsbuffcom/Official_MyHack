"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Zap, Award, Upload, ChevronRight, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-mark";
import { AIIllustration as AITest } from "@/components/AITest";
import { HashIllustration as HashTest } from "@/components/HashTest";
import { EmployerReadIllustration as EmployerTest } from "@/components/EmployerTest";
import { BiometricIllustration } from "@/components/feature-illustrations";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDirectDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerName: "Demo Candidate",
          icNumber: "DEMO-12345",
          taskClaim: "Basic Terminal Block Wiring Demonstration",
          trade: "ELECTRICAL_WIRING",
          jobPostingId: "demo-bypass",
          roleTargeted: "Electrical Engineer basic",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/session/${data.sessionId}/verify?step=hands`);
      } else {
        setLoading(false);
        alert("Demo start failed.");
      }
    } catch {
      setLoading(false);
      alert("Network error.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-teal-500/20">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center
        border-b border-border
        bg-background/80 backdrop-blur-2xl">
        <div className="max-w-6xl w-full mx-auto px-6 flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/intake"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full
                bg-foreground text-background
                hover:bg-foreground/90 transition-colors duration-200"
            >
              Get verified <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 md:pt-32 md:pb-24">

        {/* Badge */}
        <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 mb-8 rounded-full
          border border-primary/25 bg-primary/6
          text-primary text-xs font-bold uppercase tracking-widest">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          Zero-Trust Identity Lock
        </div>

        {/* H1 */}
        <h1 className="relative max-w-4xl text-[clamp(48px,8vw,88px)] leading-none font-black tracking-[-0.04em] mb-6">
          Turn any role description into{" "}
          <span className="text-primary">
            verified proof.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl text-muted-foreground mb-6 leading-relaxed max-w-xl">
          Upload a role description. VeriPro generates a tailored project brief,
          observes your hands-on session with continuous biometric identity lock,
          and issues a tamper-evident certificate your employer can read in 30 seconds.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link
            href="/intake"
            className="group relative inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-[16px] font-semibold
              text-background dark:text-background transition-all duration-300
              bg-foreground
              hover:bg-foreground/90
              active:scale-[0.98] shadow-xl shadow-foreground/10 w-full sm:w-auto"
          >
            <Upload className="size-4 relative z-10" />
            <span className="relative z-10">Get Your Verified Proof</span>
          </Link>

          <button
            onClick={handleDirectDemo}
            disabled={loading}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-[16px] font-semibold
              bg-primary text-primary-foreground transition-all duration-200
              hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            <span>Direct Demo (Skip Intake)</span>
          </button>

          <a
            href="#how"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold
              border border-foreground/10 hover:bg-foreground/5
              transition-all duration-200 w-full sm:w-auto justify-center"
          >
            How it works <ChevronRight className="size-4" />
          </a>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="w-px h-12 bg-foreground/20 animate-pulse" />
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="border-y border-border py-8 bg-muted/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-x-16 gap-y-8">
          {[
            { value: "3-Layer", label: "Biometric Identity Lock" },
            { value: "SHA-256", label: "Tamper-Evident Hash" },
            { value: "30 Sec", label: "Employer Verification" },
            { value: "AI-Graded", label: "Deterministic Benchmark" },
          ].map(({ value, label }, i) => (
            <div key={value} className="flex items-center gap-16">
              <div className="flex flex-col items-center md:items-start">
                <p className="text-2xl font-black tracking-tighter text-foreground mb-1">{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">{label}</p>
              </div>
              {i < 3 && <div className="hidden lg:block w-px h-8 bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section id="how" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">How it works</p>
            <h2 className="text-4xl font-black tracking-[-0.03em]">Four steps to verified.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Upload,  step: "01", title: "Upload Role Description", desc: "Drop any role description — PNG, JPG, or PDF. VeriPro extracts required skills automatically." },
              { icon: Zap,     step: "02", title: "AI Builds Brief",   desc: "Gemini maps skills into a tailored practical project brief in seconds." },
              { icon: Shield,  step: "03", title: "Biometric Session", desc: "Work at your bench under continuous face, hand, and activity identity lock." },
              { icon: Award,   step: "04", title: "Get Certificate",   desc: "Receive a SHA-256 signed certificate with composite grade and hire signal." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative group">
                <div className="relative p-8 rounded-4xl h-full
                  border border-border
                  bg-card
                  hover:border-primary/40
                  hover:shadow-2xl hover:shadow-primary/5
                  transition-all duration-300">
                  <div className="text-[10px] font-black text-primary/60 mb-4 tracking-[0.2em]">STEP {step}</div>
                  <Icon className="size-8 text-primary mb-6" />
                  <h3 className="text-xl font-black mb-3 text-foreground tracking-tight">{title}</h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed font-medium">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-28 px-6 bg-muted/20">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">Built different</p>
            <h2 className="text-4xl font-black tracking-[-0.03em]">Every layer. Verified.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { Illustration: BiometricIllustration,    title: "3-Layer Biometric Lock",    tag: "Identity",     desc: "Face recognition, hand-presence detection, and continuous activity monitoring. The person who starts is the person who finishes." },
              { Illustration: AITest,                   title: "AI-Powered Assessment",      tag: "Gemini AI",    desc: "Gemini extracts required skills from any role description and builds a deterministic practical brief tailored to the exact role — in seconds." },
              { Illustration: HashTest,                 title: "SHA-256 Cryptographic Seal", tag: "Cryptography", desc: "Every certificate is hashed and signed at issuance. Cannot be altered, duplicated, or fabricated. Mathematical proof of authenticity." },
              { Illustration: EmployerTest,             title: "30-Second Employer Read",    tag: "Hiring",       desc: "Composite grade, hire signal, safety score, and skills breakdown. Any employer can make a confident decision in half a minute." },
            ] as const).map(({ Illustration, title, tag, desc }) => (
              <div key={title} className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors duration-300">
                <div className="h-48 relative bg-muted/20">
                  <Illustration />
                </div>
                <div className="px-6 pb-6 pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-black text-[15px] tracking-tight text-foreground leading-tight">{title}</h3>
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border border-primary/30 text-primary transition-colors duration-200">
                      {tag}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Value props ── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16 space-y-3">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
              Who It&apos;s For
            </div>
            <h2 className="text-4xl font-black tracking-[-0.03em]">Built for both sides of the table.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">

            <div className="p-8 rounded-xl border border-border">
              <h3 className="font-bold text-lg mb-4 text-primary">For Candidates</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary">✓</span> Portable proof of practical competence</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Tailored to the exact job you want</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Shareable portfolio link on your resume</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> AI coaching after every session</li>
              </ul>
            </div>
            <div className="p-8 rounded-xl border border-border">
              <h3 className="font-bold text-lg mb-4 text-primary">For Employers & Admins</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary">✓</span> Read grade + safety score in 30 seconds</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Safety is never hidden behind technical score</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> SHA-256 tamper evidence — cannot be faked</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Consistent assessments across entire cohorts</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <BrandMark />
          <div className="flex items-center gap-6">
            <Link href="/intake" className="hover:text-foreground transition-colors">Get Verified</Link>
          </div>
          <p>VeriPro · 24-hour Hackathon Sprint · Cradle Fund Demo</p>
        </div>
      </footer>

    </div>
  );
}
