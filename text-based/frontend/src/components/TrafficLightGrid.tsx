'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export interface BucketScore {
  bucket: 'AML_IDENTITY' | 'REG_BI_SUITABILITY' | 'REQUIRED_DISCLOSURES' | 'VULNERABLE_ADULT';
  title: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  summary: string;
  findings: string[];
}

interface Props {
  bucketScores: BucketScore[];
}

export function TrafficLightGrid({ bucketScores }: Props) {
  const getStatusVisuals = (status: 'GREEN' | 'YELLOW' | 'RED') => {
    switch (status) {
      case 'GREEN':
        return {
          pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500 shadow-emerald-500/50',
          badgeText: 'PASS / VERIFIED',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        };
      case 'YELLOW':
        return {
          pill: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500 shadow-amber-500/50',
          badgeText: 'MANUAL REVIEW',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      case 'RED':
        return {
          pill: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500 shadow-rose-500/50',
          badgeText: 'ACTION REQUIRED',
          icon: <XCircle className="w-4 h-4 text-rose-400" />,
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span>4-Bucket Regulatory Audit Grid</span>
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Pass</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Review</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Failed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {bucketScores.map((b, idx) => {
          const visuals = getStatusVisuals(b.status);
          return (
            <div
              key={idx}
              className="bg-slate-800/70 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-white">{b.title}</span>
                  <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide ${visuals.pill}`}>
                    <span className={`w-2 h-2 rounded-full shadow-sm ${visuals.dot}`} />
                    {visuals.badgeText}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed font-medium">
                  {b.summary}
                </p>
              </div>

              {b.findings && b.findings.length > 0 && (
                <div className="pt-2 border-t border-slate-700/60 space-y-1">
                  {b.findings.map((f, fIdx) => (
                    <div key={fIdx} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                      <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
