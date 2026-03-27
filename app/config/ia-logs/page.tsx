'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  Loader2,
  Calendar,
  Cpu,
  Database
} from 'lucide-react';
import { getAiSearchLogs, AiSearchLog } from '@/services/aiSearchLogsService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AiLogsPage() {
  const [logs, setLogs] = useState<AiSearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AiSearchLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getAiSearchLogs();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.query.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <History className="text-brand-500" />
              Logs da Busca IA
            </h1>
            <p className="text-slate-500 dark:text-zinc-400">
              Histórico de interpretações e buscas realizadas pela inteligência artificial.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nos logs..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Query</th>
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <Loader2 className="animate-spin text-brand-500 mx-auto" size={32} />
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                          Nenhum log encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr 
                          key={log.id} 
                          onClick={() => setSelectedLog(log)}
                          className={cn(
                            "group cursor-pointer transition-colors",
                            selectedLog?.id === log.id ? "bg-brand-50/50 dark:bg-brand-900/10" : "hover:bg-slate-50 dark:hover:bg-zinc-800/30"
                          )}
                        >
                          <td className="px-6 py-4">
                            {log.status === 'success' ? (
                              <CheckCircle2 className="text-emerald-500" size={18} />
                            ) : (
                              <XCircle className="text-red-500" size={18} />
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{log.query}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{log.provider} • {log.model}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-slate-600 dark:text-zinc-400">{format(new Date(log.created_at!), "dd/MM/yy HH:mm")}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ChevronRight className="inline-block text-slate-300 group-hover:text-brand-500 transition-colors" size={20} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedLog ? (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden sticky top-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/30">
                  <h2 className="font-bold text-lg mb-1">Detalhes da Requisição</h2>
                  <p className="text-xs text-slate-500">ID: {selectedLog.id}</p>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Query Original</label>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm italic text-slate-700 dark:text-zinc-300 border-l-4 border-brand-500">
                      &quot;{selectedLog.query}&quot;
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <Clock size={12} />
                        Tempo
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedLog.response_time}ms</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <Database size={12} />
                        Resultados
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedLog.results_count}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Filter size={12} />
                      Filtros Interpretados
                    </label>
                    <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto">
                      {JSON.stringify(selectedLog.filters, null, 2)}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Cpu size={12} />
                      Motor de IA
                    </label>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
                      <span className="text-sm font-medium capitalize">{selectedLog.provider}</span>
                      <span className="text-xs text-slate-400">{selectedLog.model}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 dark:bg-zinc-900/50 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center text-slate-400 sticky top-8">
                <History className="mx-auto mb-4 opacity-20" size={48} />
                <p className="text-sm">Selecione um log para ver os detalhes da interpretação da IA.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
