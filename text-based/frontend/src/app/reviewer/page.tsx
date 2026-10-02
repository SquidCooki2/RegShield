'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientQueueSideNav, ClientQueueItem } from '@/components/ClientQueueSideNav';
import { Shield, ArrowRight, UserCheck } from 'lucide-react';

export default function ReviewerIndexPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientQueueItem[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/compliance/clients');
        if (res.ok) {
          const data = await res.json();
          setClients(data);
          // If items exist, route to first client
          if (data.length > 0) {
            router.push(`/reviewer/${data[0].client.id}`);
          }
        }
      } catch (e) {
        console.error('Error loading clients:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, [router]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-65px)]">
      <ClientQueueSideNav
        clients={clients}
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 mb-4">
          <UserCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Back-Office Compliance Queue</h2>
        <p className="text-sm text-slate-400 max-w-md mt-2">
          Select an onboarding case from the left navigation bar to review the AI synthesized Compliance Dossier and 4-Bucket audit grid.
        </p>
      </div>
    </div>
  );
}
