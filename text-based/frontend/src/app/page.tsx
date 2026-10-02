'use client';

import Link from 'next/link';
import { Shield, Sparkles, ArrowRight, CheckCircle2, Zap, FileCheck, Users, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
      {/* Hero Header */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 text-xs font-medium">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Powered by AWS Bedrock AI Synthesis &amp; Amazon S3
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Turn a 3-Hour Compliance Review into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">10-Second Instant Approval</span>
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
          RegShield bridges independent financial advisors and back-office compliance principals. 
          Upload messy competitor statements and IDs—AWS Bedrock synthesizes the data into an interactive 
          dossier scored across 4 regulatory buckets.
        </p>

        {/* Action Dual Persona Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/advisor"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span>Persona 1: Advisor Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/reviewer"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold hover:bg-slate-700 hover:text-white transition-all hover:scale-[1.02] active:scale-95"
          >
            <span>Persona 2: Back-Office Reviewer</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </Link>
        </div>
      </div>

      {/* 4 Regulatory Buckets Showcase */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-sm">Bucket A: Identity &amp; AML</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Instant CIP check, state ID / passport parsing, and OFAC/PEP watch-list sanction validation.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-3">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-sm">Bucket B: Reg BI &amp; Suitability</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Evaluates account type match (Individual vs Joint), cost advantages, and risk profile alignment.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-sm">Bucket C: Required Disclosures</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Automated Form CRS timestamp verification, ADV Part 2A delivery, and fee transparency audits.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-sm">Bucket D: Vulnerable Adult</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            FINRA Rule 2165 senior protections, trusted contact verification, and diminished capacity safeguards.
          </p>
        </div>
      </div>
    </div>
  );
}
