'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, User, Search } from 'lucide-react';

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
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          Cleared to Fund
        </span>
      );
    }
    if (overall === 'RED' || status === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }
    if (status === 'Action Required' || overall === 'YELLOW') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          Action Required
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" />
        Pending Review
      </span>
    );
  };

  return (
    <aside className="w-full lg:w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Compliance Queue
          </h2>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {clients.length} cases
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search client or advisor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl text-[11px] font-medium border border-slate-700/60">
          <button
            onClick={() => setFilter('ALL')}
            className={`flex-1 py-1 rounded-lg transition-colors ${
              filter === 'ALL' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('ACTION_REQUIRED')}
            className={`flex-1 py-1 rounded-lg transition-colors ${
              filter === 'ACTION_REQUIRED' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Actions
          </button>
          <button
            onClick={() => setFilter('PENDING_REVIEW')}
            className={`flex-1 py-1 rounded-lg transition-colors ${
              filter === 'PENDING_REVIEW' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('CLEARED')}
            className={`flex-1 py-1 rounded-lg transition-colors ${
              filter === 'CLEARED' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cleared
          </button>
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredClients.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No onboarding cases match your filter.
          </div>
        ) : (
          filteredClients.map((item) => {
            const isSelected = item.client.id === currentClientId;
            return (
              <Link
                key={item.client.id}
                href={`/reviewer/${item.client.id}`}
                className={`block p-4 transition-colors hover:bg-slate-800/70 text-left ${
                  isSelected ? 'bg-slate-800/90 border-l-4 border-cyan-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm text-white truncate">{item.client.fullName}</span>
                  {getStatusBadge(item.review.onboardingStatus, item.review.overallStatus)}
                </div>

                <div className="mt-1.5 text-xs text-slate-400 flex items-center justify-between">
                  <span>{item.client.accountType} &bull; ${(item.client.estimatedAum / 1000).toFixed(0)}k</span>
                  <span className="text-slate-500 truncate max-w-[110px]">{item.client.advisorName}</span>
                </div>

                {item.review.registrationMismatch && (
                  <div className="mt-2 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">Registration Mismatch</span>
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
