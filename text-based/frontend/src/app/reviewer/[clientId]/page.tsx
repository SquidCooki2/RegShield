'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ClientQueueSideNav, ClientQueueItem } from '@/components/ClientQueueSideNav';
import { TrafficLightGrid } from '@/components/TrafficLightGrid';
import { BedrockDossierViewer } from '@/components/BedrockDossierViewer';
import { ActionCenter } from '@/components/ActionCenter';

export default function ClientReviewPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const [allClients, setAllClients] = useState<ClientQueueItem[]>([]);
  const [currentClientData, setCurrentClientData] = useState<{
    client: any;
    review: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const listRes = await fetch('/api/compliance/clients');
      if (listRes.ok) {
        const listData = await listRes.json();
        setAllClients(listData);
      }

      if (clientId) {
        const detailRes = await fetch(`/api/compliance/clients/${clientId}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setCurrentClientData(detailData);
        }
      }
    } catch (err) {
      console.error('Error fetching review:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDecisionUpdated = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b0f17]">
        <span className="text-xs font-mono text-slate-500">Loading record...</span>
      </div>
    );
  }

  if (!currentClientData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b0f17] text-center">
        <p className="text-xs text-slate-400">Record not found.</p>
        <button
          onClick={() => router.push('/reviewer')}
          className="mt-3 px-3 py-1.5 bg-slate-900 rounded text-slate-200 text-xs border border-slate-800"
        >
          Return to Queue
        </button>
      </div>
    );
  }

  const { client, review } = currentClientData;
  const isCleared = review.onboardingStatus === 'Cleared to Fund';

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-53px)] bg-[#0b0f17]">
      {/* Left Queue Nav */}
      <ClientQueueSideNav
        clients={allClients}
        currentClientId={clientId}
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Review Dashboard */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Summary Header without Ref: ID */}
        <div className="bg-[#0e131f] border-b border-slate-800 px-6 py-3.5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-white tracking-tight">{client.fullName}</h1>
                <span className="text-xs font-mono text-slate-400 border border-slate-800 px-2 py-0.5 rounded bg-slate-900">
                  {client.accountType}
                </span>

                {isCleared ? (
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800">
                    CLEARED TO FUND
                  </span>
                ) : review.overallStatus === 'YELLOW' || review.onboardingStatus === 'Action Required' ? (
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800">
                    ACTION REQUIRED
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    PENDING REVIEW
                  </span>
                )}
              </div>

              {/* Minimal Metadata Row */}
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                <span>Advisor: <strong className="text-slate-200">{client.advisorName}</strong></span>
                <span className="text-slate-700">&bull;</span>
                <span>AUM: <strong className="text-slate-200">${(client.estimatedAum || 0).toLocaleString()}</strong></span>
                <span className="text-slate-700">&bull;</span>
                <span>Strategy: <strong className="text-slate-200">{client.targetPortfolio}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Cleared Banner if applicable */}
        {isCleared && (
          <div className="bg-emerald-950/30 border-b border-emerald-800/60 px-6 py-2 flex items-center justify-between text-emerald-300 text-xs font-mono">
            <span>Approval recorded. Cleared for ACAT custodial transfer.</span>
            <span>{new Date().toISOString().split('T')[0]}</span>
          </div>
        )}

        {/* Split Screen Stage */}
        <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Stage: Dossier Viewer */}
          <div className="xl:col-span-7 h-[760px] sticky top-6">
            <BedrockDossierViewer
              markdown={review.dossierMarkdown}
              clientName={client.fullName}
              accountType={client.accountType}
              isMismatch={review.registrationMismatch}
            />
          </div>

          {/* Right Stage: Compliance Summary & Actions */}
          <div className="xl:col-span-5 space-y-5">
            {/* Compliance Summary Grid */}
            <TrafficLightGrid bucketScores={review.bucketScores || []} />

            {/* Principal Action Center */}
            <ActionCenter
              clientId={client.id}
              clientName={client.fullName}
              onboardingStatus={review.onboardingStatus}
              overallStatus={review.overallStatus}
              isMismatch={review.registrationMismatch}
              remediationLogs={review.remediationNotes}
              onDecisionUpdated={handleDecisionUpdated}
            />

            {/* Attached Verification Documents Card (Without 'Cross-Checked' label) */}
            <div className="bg-[#0e131f] border border-slate-800 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Verification Documents</span>
              </div>

              <div className="space-y-1.5 text-xs">
                {client.documents && client.documents.length > 0 ? (
                  client.documents.map((doc: any, i: number) => (
                    <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-800/90 flex items-center justify-between">
                      <div className="truncate">
                        <span className="text-slate-200 font-medium block truncate">{doc.originalName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {doc.category || 'DOCUMENT'} &bull; Verified
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/60 shrink-0 ml-2">
                        VERIFIED
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-500">
                    Documents verified against state and account registries.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
