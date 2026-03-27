'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { 
  Activity, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Globe, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiLog {
  id: string;
  timestamp: string;
  endpoint: string;
  status_code: number;
  ip_address: string;
  api_key_id: string | null;
  response_time_ms: number;
}

export default function ApiLogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/api-logs');
      if (!res.ok) throw new Error('Erro ao carregar logs');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.ip_address.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'success' && log.status_code < 400) ||
                         (statusFilter === 'error' && log.status_code >= 400);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Logs da API</h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-1">Monitore as requisições feitas à API privada do sistema.</p>
          </header>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar por endpoint ou IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="text-slate-400" size={18} />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                >
                  <option value="all">Todos os Status</option>
                  <option value="success">Sucesso (2xx/3xx)</option>
                  <option value="error">Erro (4xx/5xx)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-zinc-800/50">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Timestamp</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Endpoint</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Origem (IP)</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="animate-spin text-brand-500 mx-auto mb-2" size={32} />
                        <span className="text-slate-500">Carregando logs...</span>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        Nenhum log encontrado.
                      </td>
                    </tr>
                  ) : filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                          <Clock size={14} />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded text-xs font-mono text-slate-700 dark:text-zinc-300">
                          {log.endpoint}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                          log.status_code < 400 
                            ? "bg-emerald-50 text-emerald-600" 
                            : "bg-red-50 text-red-600"
                        )}>
                          {log.status_code < 400 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {log.status_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Globe size={14} />
                          {log.ip_address}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {log.response_time_ms}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
