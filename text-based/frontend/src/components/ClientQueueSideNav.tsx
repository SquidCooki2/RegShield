'use client';

import React from 'react';
import Link from 'next/link';

export interface ClientQueueItem {
  client: {
    id: string;
    fullName: string;
    accountType: string;
    advisorName: string;
    advisorFirm?: string;
    estimatedAum: number;
    createdAt: string;
  };
  review: {
    id: string;
    overallStatus: 'GREEN' | 'YELLOW' | 'RED';
    onboardingStatus: string;
    registrationMismatch: boolean;
  };
}

interface Props {
  clients: ClientQueueItem[];
  currentClientId?: string;
  filter: string;
  setFilter: (f: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export function ClientQueueSideNav({
  clients,
  currentClientId,
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
}: Props) {
  const filteredClients = clients.filter((item) => {
    const matchesFilter =
      filter === 'ALL'
        ? true
        : filter === 'ACTION_REQUIRED'
        ? item.review.onboardingStatus === 'Action Required' || item.review.overallStatus === 'YELLOW' || item.review.overallStatus === 'RED'
        : filter === 'PENDING_REVIEW'
        ? item.review.onboardingStatus === 'Pending Review'
        : filter === 'CLEARED'
        ? item.review.onboardingStatus === 'Cleared to Fund'
        : true;

    const matchesSearch =
      item.client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client.advisorName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string, overall: string) => {
    if (status === 'Cleared to Fund') {
      return (
        <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
          Cleared
        </span>
      );
    }
    if (overall === 'RED' || status === 'Rejected') {
      return (
        <span className="text-[10px] font-mono font-medium text-rose-400 bg-rose-950/60 border border-rose-800/80 px-1.5 py-0.5 rounded">
          Rejected
        </span>
      );
    }
    if (status === 'Action Required' || overall === 'YELLOW') {
      return (
        <span className="text-[10px] font-mono font-medium text-amber-300 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded">
          Action Req.
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono font-medium text-slate-300 bg-slate-800/80 border border-slate-700 px-1.5 py-0.5 rounded">
        Pending
      </span>
    );
  };

  return (
    <aside className="w-full lg:w-72 bg-[#0b0f17] border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 tracking-tight">Queue</span>
          <span className="text-[11px] font-mono text-slate-500">{clients.length} records</span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Filter queue..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500"
        />

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded border border-slate-800 text-[11px]">
          {(['ALL', 'ACTION_REQUIRED', 'PENDING_REVIEW', 'CLEARED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                filter === f ? 'bg-slate-800 text-white font-medium' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'ACTION_REQUIRED' ? 'Action' : f === 'PENDING_REVIEW' ? 'Pending' : 'Cleared'}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {filteredClients.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-600">No records found.</div>
        ) : (
          filteredClients.map((item) => {
            const isSelected = item.client.id === currentClientId;
            return (
              <Link
                key={item.client.id}
                href={`/reviewer/${item.client.id}`}
                className={`block p-3.5 transition-colors text-left hover:bg-slate-900/70 ${
                  isSelected ? 'bg-slate-900 border-l-2 border-sky-400' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-xs text-white truncate">{item.client.fullName}</span>
                  {getStatusBadge(item.review.onboardingStatus, item.review.overallStatus)}
                </div>

                <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{item.client.accountType} &bull; ${(item.client.estimatedAum / 1000).toFixed(0)}k</span>
                  <span className="truncate max-w-[100px]">{item.client.advisorName}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
