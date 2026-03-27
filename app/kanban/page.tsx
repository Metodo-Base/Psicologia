'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, PatientRecord } from '@/lib/supabase';
import { Sidebar } from '@/components/sidebar';
import { 
  Columns, 
  Search, 
  Plus, 
  MoreVertical, 
  MessageSquare, 
  Phone, 
  Calendar,
  Clock,
  Filter,
  ArrowRight,
  Database,
  Loader2,
  AlertCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { safeFormat } from '@/lib/date-utils';
import { PatientFormModal } from '@/components/patient-form-modal';
import { getAiConfig } from '@/services/aiConfigService';
import { categorizeLead } from '@/lib/ai-interpreter';

const KANBAN_STAGES = [
  { id: 'Contatos iniciados', title: 'Contatos iniciados', color: 'bg-blue-500' },
  { id: 'Não qualificados', title: 'Não qualificados', color: 'bg-slate-400' },
  { id: 'Qualificados', title: 'Qualificados', color: 'bg-amber-500' },
  { id: 'Consultas Fechadas', title: 'Consultas Fechadas', color: 'bg-emerald-500' },
];

export default function KanbanPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Kanban: Fetching all real data from CRM_Geral');
      
      const { data, error } = await supabase
        .from('CRM_Geral')
        .select('*');
      
      if (error) {
        console.error('Kanban: Supabase error:', error);
        throw error;
      }
      
      console.log('Kanban: Records fetched:', data?.length || 0);
      setRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching kanban data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(r => 
      r.Nome.toLowerCase().includes(query) || 
      r.Whatsapp.includes(query) ||
      r['Resumo da conversa']?.toLowerCase().includes(query)
    );
  }, [records, searchQuery]);

  const kanbanData = useMemo(() => {
    const data: Record<string, PatientRecord[]> = {};
    KANBAN_STAGES.forEach(stage => {
      data[stage.id] = filteredRecords.filter(r => r.status_conversao === stage.id);
    });
    
    // Catch-all for other statuses if they exist
    const otherRecords = filteredRecords.filter(r => !KANBAN_STAGES.find(s => s.id === r.status_conversao));
    if (otherRecords.length > 0) {
      if (!data['Contatos iniciados']) data['Contatos iniciados'] = [];
      data['Contatos iniciados'] = [...data['Contatos iniciados'], ...otherRecords];
    }

    return data;
  }, [filteredRecords]);

  const handleDragStart = (e: React.DragEvent, recordId: string | number) => {
    e.dataTransfer.setData('recordId', recordId.toString());
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const recordId = e.dataTransfer.getData('recordId');
    if (!recordId) return;

    // Optimistic update
    const updatedRecords = records.map(r => 
      r['Identificador do usuario'] === recordId ? { ...r, status_conversao: targetStage } : r
    );
    setRecords(updatedRecords);

    try {
      const { error } = await supabase
        .from('CRM_Geral')
        .update({ 
          status_conversao: targetStage, 
          'Timestamp ultima msg': new Date().toISOString(),
          tipo: targetStage === 'Contatos iniciados' ? 'lead' : 'paciente'
        })
        .eq('Identificador do usuario', recordId);
      
      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating record stage:', err);
      // Revert on error
      fetchData();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAddPatient = () => {
    setSelectedPatient(null);
    setIsModalOpen(true);
  };

  const handleEditPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const handleOptimizeFunnel = async () => {
    if (!confirm('Deseja otimizar todo o funil com IA? Isso analisará o resumo de todos os leads para atualizar seus status e modalidades.')) return;
    
    setOptimizing(true);
    setError(null);
    try {
      const config = await getAiConfig();
      if (!config) throw new Error('IA não configurada.');

      const leadsToOptimize = records.filter(r => !r['Data da consulta']);
      
      for (const lead of leadsToOptimize) {
        const summary = lead['Resumo da conversa'];
        if (!summary || summary.length < 5) continue;

        const result = await categorizeLead(summary, config);
        
        if (result.status_conversao || result.tipo_consulta) {
          await supabase
            .from('CRM_Geral')
            .update({
              status_conversao: result.status_conversao || lead.status_conversao,
              tipo_consulta: result.tipo_consulta || lead.tipo_consulta,
              tipo: result.tipo || lead.tipo,
              'Timestamp ultima msg': new Date().toISOString()
            })
            .eq('Identificador do usuario', lead['Identificador do usuario']);
        }
      }
      
      await fetchData();
    } catch (err: any) {
      console.error('Optimization error:', err);
      setError('Erro ao otimizar funil: ' + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="p-6 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Columns className="text-brand-500" size={24} />
              Fluxo de Atendimento (Kanban)
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">Gerencie seus contatos e conversões de forma visual.</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleOptimizeFunnel}
              disabled={optimizing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-brand-500 border border-brand-500 rounded-xl hover:bg-brand-50 transition-all text-sm font-bold disabled:opacity-50"
            >
              {optimizing ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Otimizar Funil (IA)
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar contato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-zinc-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500 w-64 transition-all"
              />
            </div>
            <button 
              onClick={handleAddPatient}
              className="p-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        {/* Error State */}
        {error && (
          <div className="p-4 mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-6 flex gap-6 no-scrollbar bg-slate-50 dark:bg-zinc-950">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-brand-500" size={40} />
            </div>
          ) : records.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800 max-w-2xl mx-auto my-auto h-fit">
              <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center text-brand-500 mb-6">
                <Database size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Nenhum contato encontrado</h2>
              <p className="text-slate-500 dark:text-zinc-400 mb-8 max-w-md">
                Não há contatos reais na sua base de dados no momento. 
                Os contatos aparecerão aqui assim que forem adicionados ao sistema.
              </p>
            </div>
          ) : (
            KANBAN_STAGES.map(stage => (
              <div 
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="flex flex-col w-80 shrink-0 h-full"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                    <h3 className="font-bold text-slate-700 dark:text-zinc-200">{stage.title}</h3>
                    <span className="text-xs font-bold bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                      {kanbanData[stage.id]?.length || 0}
                    </span>
                  </div>
                  <button className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-400 transition-all">
                    <MoreVertical size={16} />
                  </button>
                </div>

                {/* Column Content */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar pb-10">
                  {kanbanData[stage.id]?.map(record => (
                    <div 
                      key={record['Identificador do usuario']}
                      draggable
                      onDragStart={(e) => handleDragStart(e, record['Identificador do usuario']!)}
                      onClick={() => handleEditPatient(record)}
                      className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 hover:shadow-md hover:border-brand-500/30 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors truncate pr-2">
                          {record.Nome}
                        </h4>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md text-slate-400">
                            <MessageSquare size={14} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mb-4">
                        {record['Resumo da conversa'] || 'Sem resumo disponível.'}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {record.tipo_consulta && (
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                            record.tipo_consulta === 'Online' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                          )}>
                            {record.tipo_consulta}
                          </span>
                        )}
                        {record.origem && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                            {record.origem}
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock size={12} />
                          <span className="text-[10px] font-medium">
                            {record['Timestamp ultima msg'] ? safeFormat(new Date(record['Timestamp ultima msg']), 'dd/MM') : 'Recente'}
                          </span>
                        </div>
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-[10px] font-bold text-brand-600 dark:text-brand-400 border-2 border-white dark:border-zinc-900">
                            {record.Nome.charAt(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty Stage Placeholder */}
                  {(!kanbanData[stage.id] || kanbanData[stage.id].length === 0) && (
                    <div className="h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 text-xs italic">
                      Arraste aqui
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <PatientFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          patient={selectedPatient} 
          onSave={fetchData} 
        />
      </main>
    </div>
  );
}
