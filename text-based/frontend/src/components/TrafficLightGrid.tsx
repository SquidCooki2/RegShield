'use client';

import React from 'react';

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
          badge: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/70',
          dot: 'bg-emerald-400',
          label: 'Pass',
        };
      case 'YELLOW':
        return {
          badge: 'text-amber-300 bg-amber-950/50 border-amber-800/70',
          dot: 'bg-amber-400',
          label: 'Review Required',
        };
      case 'RED':
        return {
          badge: 'text-rose-400 bg-rose-950/50 border-rose-800/70',
          dot: 'bg-rose-400',
          label: 'Action Required',
        };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-200 tracking-tight">Regulatory Check Matrix</span>
        <span className="text-[11px] font-mono text-slate-500">4 Audit Buckets</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {bucketScores.map((b, idx) => {
          const visuals = getStatusVisuals(b.status);
          return (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-[#0e131f] border border-slate-800/90 flex flex-col justify-between space-y-2.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs text-white">{b.title}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${visuals.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${visuals.dot}`} />
                    {visuals.label}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {b.summary}
                </p>
              </div>

              {b.findings && b.findings.length > 0 && (
                <div className="pt-2 border-t border-slate-800/70 space-y-1">
                  {b.findings.map((f, fIdx) => (
                    <div key={fIdx} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                      <span className="text-slate-600 mt-0.5">&bull;</span>
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
