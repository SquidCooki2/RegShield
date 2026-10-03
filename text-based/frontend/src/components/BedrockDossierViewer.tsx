'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  markdown: string;
  clientName: string;
  accountType: string;
  isMismatch: boolean;
}

export function BedrockDossierViewer({ markdown, clientName, accountType, isMismatch }: Props) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#0b0f17] border border-slate-800 rounded-lg flex flex-col h-full overflow-hidden shadow-sm">
      {/* Document Controls Bar */}
      <div className="bg-[#0d121c] border-b border-slate-800/90 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">Document Viewer</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-[11px] font-mono text-slate-500">Supervisory Memorandum</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-800 transition-colors"
          >
            Print / PDF
          </button>
        </div>
      </div>

      {/* Official Memorandum Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#070a10]">
        <div className="max-w-3xl mx-auto bg-[#0d121c] text-slate-200 rounded border border-slate-800/90 p-8 sm:p-10 font-sans shadow-lg">
          
          {/* Institutional Memorandum Header */}
          <div className="border-b-2 border-slate-700 pb-5 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                  LPL Financial Compliance &amp; Regulatory Supervision
                </div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1">
                  COMPLIANCE SUPERVISORY AUDIT MEMORANDUM
                </h1>
              </div>

              <div className="text-right">
                <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                  isMismatch
                    ? 'bg-amber-950/70 text-amber-300 border-amber-800/90'
                    : 'bg-emerald-950/70 text-emerald-400 border-emerald-800/90'
                }`}>
                  {isMismatch ? 'ACTION REQUIRED' : 'COMPLIANT / CLEAR'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
              <div>
                <span className="text-slate-500 block text-[10px]">RECORD REF</span>
                <span className="text-slate-200">AUD-2026-{clientName.slice(0, 3).toUpperCase()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">AUDIT DATE</span>
                <span className="text-slate-200">{new Date().toISOString().split('T')[0]}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TENANCY TYPE</span>
                <span className="text-slate-200">{accountType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SECURITY LEVEL</span>
                <span className="text-slate-200">PRIVILEGED</span>
              </div>
            </div>
          </div>

          {/* Official Formatted Markdown with GFM Table Support */}
          <div className="markdown-document space-y-4 text-xs leading-relaxed text-slate-300">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h2 className="text-sm font-bold text-white tracking-tight uppercase border-b border-slate-800 pb-1.5 mt-6 mb-3">
                    {children}
                  </h2>
                ),
                h2: ({ children }) => (
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide border-b border-slate-800/60 pb-1 mt-5 mb-2.5">
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h4 className="text-xs font-semibold text-slate-200 mt-4 mb-1.5">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-xs text-slate-300 leading-relaxed my-2">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-outside pl-4 space-y-1 my-2 text-slate-300">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside pl-4 space-y-1 my-2 text-slate-300">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">
                    {children}
                  </li>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4 border border-slate-800 rounded bg-[#0b0f17]">
                    <table className="w-full text-left text-[11px] border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-slate-800/60 bg-[#0d121c]">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-slate-900/50 transition-colors">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-3.5 py-2.5 text-left font-semibold text-slate-200 border-r border-slate-800/60 last:border-r-0">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3.5 py-2.5 text-slate-300 border-r border-slate-800/40 last:border-r-0 align-top">
                    {children}
                  </td>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-100">
                    {children}
                  </strong>
                ),
                hr: () => (
                  <hr className="border-slate-800 my-4" />
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-sky-500 pl-3 italic text-slate-400 my-2">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>

          {/* Official Audit Sign-Off Footer */}
          <div className="mt-10 pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <div>
              <span>REGULATORY COMPLIANCE SYSTEM &bull; RECORD ID: {clientName.replace(/\s+/g, '-').toUpperCase()}</span>
            </div>
            <div>
              <span>CONFIDENTIAL &bull; FOR SUPERVISORY USE ONLY</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
