'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ClientQueueSideNav, ClientQueueItem } from '@/components/ClientQueueSideNav';
import { TrafficLightGrid, BucketScore } from '@/components/TrafficLightGrid';
import { BedrockDossierViewer } from '@/components/BedrockDossierViewer';
import { ActionCenter } from '@/components/ActionCenter';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Building,
  DollarSign,
  PieChart,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

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
      // Fetch queue list
      const listRes = await fetch('/api/compliance/clients');
      if (listRes.ok) {
        const listData = await listRes.json();
        setAllClients(listData);
      }

      // Fetch active client details
      if (clientId) {
        const detailRes = await fetch(`/api/compliance/clients/${clientId}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setCurrentClientData(detailData);
        }
      }
    } catch (err) {
      console.error('Error fetching compliance review:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDecisionUpdated = (newStatus: string) => {
    loadData();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-sm font-semibold">Loading AI Compliance Analysis...</span>
        </div>
      </div>
    );
  }

  if (!currentClientData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <p className="text-slate-300">Client onboarding record not found.</p>
        <button
          onClick={() => router.push('/reviewer')}
          className="mt-4 px-4 py-2 bg-slate-800 rounded-xl text-white text-xs"
        >
          Return to Queue
        </button>
      </div>
    );
  }

  const { client, review } = currentClientData;
  const isCleared = review.onboardingStatus === 'Cleared to Fund';

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-65px)] bg-slate-950">
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
        {/* Top Summary Banner */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">{client.fullName}</h1>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  {client.accountType}
                </span>

                {isCleared ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-pulse">
                    <CheckCircle2 className="w-4 h-4" />
                    CLEARED TO FUND
                  </span>
                ) : review.overallStatus === 'YELLOW' || review.onboardingStatus === 'Action Required' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    ACTION REQUIRED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
                    <Sparkles className="w-4 h-4" />
                    PENDING PRINCIPAL REVIEW
                  </span>
                )}
              </div>

              {/* Client metadata pill chips */}
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Advisor: <strong className="text-slate-200">{client.advisorName}</strong> ({client.advisorFirm || 'Apex Wealth'})
                </span>
                <span className="text-slate-600">&bull;</span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Estimated AUM: <strong className="text-slate-200">${(client.estimatedAum || 0).toLocaleString()}</strong>
                </span>
                <span className="text-slate-600">&bull;</span>
                <span className="flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-indigo-400" />
                  Strategy: <strong className="text-slate-200">{client.targetPortfolio}</strong>
                </span>
              </div>
            </div>

            {/* Quick Uploaded Document Count */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700/80 text-xs">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300">
                <strong>{client.documents?.length || 2}</strong> Raw Documents Ingested
              </span>
            </div>
          </div>
        </div>

        {/* Cleared to Fund Full Banner if Approved */}
        {isCleared && (
          <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-b border-emerald-500/40 px-6 py-3.5 flex items-center justify-between text-emerald-300 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Compliance approval granted by Back-Office Principal. Custodial account generated and cleared for ACAT settlement.</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400/80">AUTH_STAMP: {new Date().toLocaleDateString()}</span>
          </div>
        )}

        {/* Split Screen Stage */}
        <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Stage: Embedded Bedrock AI PDF / Dossier Viewer (7 Cols) */}
          <div className="xl:col-span-7 h-[750px] sticky top-6">
            <BedrockDossierViewer
              markdown={review.dossierMarkdown}
              clientName={client.fullName}
              accountType={client.accountType}
              isMismatch={review.registrationMismatch}
            />
          </div>

          {/* Right Stage: Traffic Light Grid & Action Center (5 Cols) */}
          <div className="xl:col-span-5 space-y-6">
            {/* 4-Bucket Regulatory Grid */}
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

            {/* Ingested Source Documents Info Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ingested Raw Documents (Amazon S3)</span>
              </h4>
              <div className="space-y-2">
                {client.documents?.map((doc: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate text-slate-200 font-medium">{doc.originalName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {(doc.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
