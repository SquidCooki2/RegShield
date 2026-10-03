'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 flex-1 flex flex-col items-center justify-center text-center">
      {/* Super Simple Clean Title & Actions */}
      <div className="space-y-6">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
          RegShield
        </h1>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/advisor"
            className="w-full sm:w-auto px-5 py-2.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium text-xs tracking-tight transition-colors"
          >
            Advisor Intake
          </Link>
          <Link
            href="/reviewer"
            className="w-full sm:w-auto px-5 py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-medium text-xs tracking-tight transition-colors"
          >
            Reviewer Queue
          </Link>
        </div>
      </div>
    </div>
  );
}
