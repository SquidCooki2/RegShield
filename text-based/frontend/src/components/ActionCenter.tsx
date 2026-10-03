'use client';

import React, { useState } from 'react';

interface Props {
  clientId: string;
  clientName: string;
  onboardingStatus: string;
  overallStatus: 'GREEN' | 'YELLOW' | 'RED';
  isMismatch: boolean;
  remediationLogs?: string[];
  onDecisionUpdated: (newStatus: string) => void;
}

export function ActionCenter({
  clientId,
  clientName,
  onboardingStatus,
  overallStatus,
  isMismatch,
  remediationLogs = [],
  onDecisionUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showRemediationModal, setShowRemediationModal] = useState(false);
  const [remediationMsg, setRemediationMsg] = useState(
    isMismatch
      ? `Registration variance identified for ${clientName}: Account registration marked Joint, but co-owner information was omitted. Please provide co-owner legal name and authorization.`
      : `Clarification requested for ${clientName}: Please provide updated verification details to complete onboarding.`
  );
  const [channel, setChannel] = useState<'SMS' | 'EMAIL' | 'PORTAL_NOTIFICATION'>('SMS');

  const handleDecision = async (action: 'Cleared to Fund' | 'Action Required' | 'Rejected') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/clients/${clientId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewerName: 'Compliance Reviewer',
          reviewerNotes: `Decision: ${action}`,
        }),
      });

      if (!res.ok) throw new Error('Failed to update decision');
      onDecisionUpdated(action);
    } catch (err) {
      console.error(err);
      onDecisionUpdated(action);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRemediation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/clients/${clientId}/remediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: remediationMsg,
          channel,
        }),
      });
      if (!res.ok) throw new Error('Failed to send remediation');
      setShowRemediationModal(false);
      onDecisionUpdated('Action Required');
    } catch (err) {
      console.error(err);
      setShowRemediationModal(false);
      onDecisionUpdated('Action Required');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-[#0e131f] border border-slate-800 space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-200 tracking-tight">Actions</span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-medium">
        <button
          onClick={() => handleDecision('Cleared to Fund')}
          disabled={loading || onboardingStatus === 'Cleared to Fund'}
          className={`py-2 px-3 rounded transition-colors text-center ${
            onboardingStatus === 'Cleared to Fund'
              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 cursor-default'
              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold'
          }`}
        >
          {onboardingStatus === 'Cleared to Fund' ? 'Cleared' : 'Approve & Clear'}
        </button>

        <button
          onClick={() => setShowRemediationModal(true)}
          disabled={loading}
          className="py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 transition-colors text-center"
        >
          Request Clarification
        </button>

        <button
          onClick={() => handleDecision('Rejected')}
          disabled={loading || onboardingStatus === 'Rejected'}
          className="py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 transition-colors text-center"
        >
          Reject
        </button>
      </div>

      {/* Audit Log */}
      {remediationLogs && remediationLogs.length > 0 && (
        <div className="pt-2 border-t border-slate-800 space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase">Communication Log</span>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {remediationLogs.map((log, idx) => (
              <div key={idx} className="text-[11px] font-mono p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clarification Modal */}
      {showRemediationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e131f] border border-slate-800 rounded-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Send Clarification Request</h3>
                <p className="text-xs text-slate-500 mt-0.5">Dispatches notification to advisor for {clientName}.</p>
              </div>
              <button
                onClick={() => setShowRemediationModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendRemediation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Channel</label>
                <div className="flex items-center gap-2">
                  {(['SMS', 'EMAIL', 'PORTAL_NOTIFICATION'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      className={`px-2.5 py-1 rounded text-xs border ${
                        channel === ch
                          ? 'bg-slate-800 text-sky-400 border-sky-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {ch === 'PORTAL_NOTIFICATION' ? 'Portal' : ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Message</label>
                <textarea
                  rows={3}
                  required
                  value={remediationMsg}
                  onChange={(e) => setRemediationMsg(e.target.value)}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRemediationModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-900 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
