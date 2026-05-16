import Link from "next/link";
import { Shield, Zap, Award, Upload, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">VeriPro</span>
        <div className="flex gap-4 text-sm text-gray-400">
          <Link href="/intake" className="hover:text-white transition-colors">
            Get Verified
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/40 border border-teal-700/50 text-teal-400 text-xs font-medium mb-6">
          <Shield className="w-3 h-3" />
          Biometrically verified · Safety-graded · SHA-256 tamper-evident
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
          Turn any job posting into a{" "}
          <span className="text-teal-400">verified practical assessment</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 leading-relaxed">
          Upload a job posting. VeriPro generates a tailored project brief,
          observes your hands-on session with continuous biometric identity lock,
          and issues a tamper-evident certificate your employer can read in 30 seconds.
        </p>
        <Link
          href="/intake"
          className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold text-teal-50 transition-all duration-300
            bg-teal-400/20 backdrop-blur-xl border border-teal-400/30
            shadow-[0_8px_32px_rgba(45,212,191,0.15),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.1)]
            hover:bg-teal-400/30 hover:border-teal-400/50 hover:shadow-[0_12px_40px_rgba(45,212,191,0.25),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.15)]
            active:scale-[0.98] active:shadow-[0_4px_16px_rgba(45,212,191,0.15)]"
        >
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-teal-300/20 to-transparent pointer-events-none" />
          <Upload className="w-5 h-5 relative z-10 drop-shadow-sm" />
          <span className="relative z-10 drop-shadow-sm">Upload a Job Posting</span>
        </Link>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {[
            { icon: Upload, step: "1", title: "Upload posting", desc: "Drag in any job posting screenshot — PNG, JPG, or PDF" },
            { icon: Zap, step: "2", title: "AI generates brief", desc: "Gemini extracts required skills and builds a tailored project" },
            { icon: Shield, step: "3", title: "Complete session", desc: "Work at your bench — continuous biometric identity lock throughout" },
            { icon: Award, step: "4", title: "Get certificate", desc: "SHA-256 hashed certificate with composite grade and hire signal" },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="glow-border relative p-6">
              <div className="text-xs font-bold text-teal-400 mb-3">STEP {step}</div>
              <Icon className="w-6 h-6 text-teal-400 mb-3" />
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              {step !== "4" && (
                <ChevronRight className="hidden md:block absolute -right-9 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-700" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Value prop */}
      <section className="px-6 py-16 max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        <div className="p-8 rounded-xl border border-teal-800/40 bg-teal-900/10">
          <h3 className="font-bold text-lg mb-4 text-teal-300">For Candidates</h3>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-2"><span className="text-teal-400">✓</span> Portable proof of practical competence</li>
            <li className="flex gap-2"><span className="text-teal-400">✓</span> Tailored to the exact job you want</li>
            <li className="flex gap-2"><span className="text-teal-400">✓</span> Shareable portfolio link on your resume</li>
            <li className="flex gap-2"><span className="text-teal-400">✓</span> AI coaching after every session</li>
          </ul>
        </div>
        <div className="p-8 rounded-xl border border-purple-800/40 bg-purple-900/10">
          <h3 className="font-bold text-lg mb-4 text-purple-300">For Employers & Admins</h3>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-2"><span className="text-purple-400">✓</span> Read grade + safety score in 30 seconds</li>
            <li className="flex gap-2"><span className="text-purple-400">✓</span> Safety is never hidden behind technical score</li>
            <li className="flex gap-2"><span className="text-purple-400">✓</span> SHA-256 tamper evidence — cannot be faked</li>
            <li className="flex gap-2"><span className="text-purple-400">✓</span> Consistent assessments across entire cohorts</li>
          </ul>
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 py-16 border-t border-white/5 text-center">
        <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-teal-500" />3-layer biometric identity lock</div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-teal-500" />Safety-inclusive composite grading</div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-teal-500" />SHA-256 tamper-evident certificates</div>
        </div>
        <p className="mt-8 text-xs text-gray-600">VeriPro · 24-hour Hackathon Sprint · Cradle Fund Demo</p>
      </section>
    </div>
  );
}
