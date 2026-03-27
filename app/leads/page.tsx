'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, PatientRecord } from '@/lib/supabase';
import { Sidebar } from '@/components/sidebar';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Download, 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight,
  User,
  Phone,
  Calendar,
  Clock,
  MessageSquare,
  Plus,
  Edit,
  UserPlus,
  CheckCircle2,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  PeriodType, 
  filterByPeriod, 
  parseTimestampUltimaMsg, 
  isBusinessHour 
} from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { PatientFormModal } from '@/components/patient-form-modal';
import { PatientRegistrationModal } from '@/components/PatientRegistrationModal';
import { convertLeadToPatient } from '@/services/patientService';
import { useAuth } from '@/hooks/use-auth';

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('id');
  
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodType>('Tudo');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { user } = useAuth();
  const role = user?.role || 'viewer';
  const canViewClinicalNotes = role === 'admin';
  const isReadOnly = role === 'viewer';

  const handlePeriodChange = (p: PeriodType) => {
    setPeriod(p);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<PatientRecord | null>(null);
  const itemsPerPage = 50;

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/['"\s\n\r]/g, '').trim();
      const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/['"\s\n\r]/g, '').trim();
      
      if (!url || !key) {
        setError('Supabase não configurado. Por favor, adicione as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas configurações.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('CRM_Geral')
        .select('*')
        .order('Inicio do atendimento', { ascending: false });
      
      if (error) {
        console.error('Erro detalhado do Supabase (Pacientes):', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        let msg = `Erro do Supabase: ${error.message || 'Sem mensagem'}`;
        if (error.code === 'PGRST116') msg = 'Tabela "CRM_Geral" não encontrada no seu banco de dados.';
        if (error.code === '42P01') msg = 'A tabela "CRM_Geral" não existe. Verifique o nome no Supabase.';
        if (error.code === '42501') msg = 'Erro de Permissão (42501). Verifique se o RLS está desativado ou se há uma política de leitura para a tabela "CRM_Geral".';
        setError(msg);
      } else {
        setError(null);
        // Garante que cada registro tenha um ID único para o React e para a conversão
        const mappedData = (data || []).map(r => ({
          ...r,
          id: r.id || r['IDLead ChatWoot'] || r['Identificador do usuario']
        }));
        setRecords(mappedData);
        
        // Se houver um ID na URL, seleciona o paciente correspondente
        if (patientIdFromUrl && mappedData.length > 0) {
          const patient = mappedData.find(r => String(r.id) === patientIdFromUrl);
          if (patient) {
            setSelectedPatient(patient);
          }
        }
      }
    } catch (err: any) {
      console.error('Unexpected error fetching data:', err);
      let msg = err.message || 'Erro inesperado ao buscar dados';
      if (msg.includes('Failed to fetch')) {
        msg = 'Erro de conexão (Failed to fetch). Isso geralmente significa que a URL do Supabase está incorreta ou o projeto está pausado.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [patientIdFromUrl]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchData();
    };
    load();
    return () => { isMounted = false; };
  }, [fetchData]); // Re-carrega se o ID na URL mudar ou fetchData mudar

  const filteredRecords = useMemo(() => {
    let result = filterByPeriod(records, period);
    if (searchTerm) {
      result = result.filter(r => 
        r.Nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.Whatsapp.includes(searchTerm)
      );
    }
    return result;
  }, [records, period, searchTerm]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportCSV = () => {
    const headers = ['Nome', 'Whatsapp', 'Tipo Consulta', 'Inicio Atendimento', 'Data Consulta', 'Resumo'];
    const rows = filteredRecords.map(r => [
      r.Nome,
      r.Whatsapp,
      r.tipo_consulta,
      r['Inicio do atendimento'],
      r['Data da consulta'],
      r['Resumo da conversa'].replace(/,/g, ';')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pacientes_triagem_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    exportCSV();
  };

  const handleConvertToPatient = async () => {
    if (!selectedPatient || !selectedPatient.Whatsapp) {
      console.warn('Tentativa de conversão sem paciente selecionado ou sem Whatsapp:', selectedPatient);
      return;
    }
    
    console.log('Iniciando handleConvertToPatient para:', selectedPatient.Nome, 'Whatsapp:', selectedPatient.Whatsapp);
    
    try {
      setConverting(true);
      setError(null);
      setSuccessMessage(null);
      
      const newPatient = await convertLeadToPatient(selectedPatient.Whatsapp);
      
      console.log('Conversão bem-sucedida. Novo paciente:', newPatient);
      setRecords(prev => prev.map(r => 
        r.Whatsapp === selectedPatient.Whatsapp 
          ? { ...r, status_conversao: 'Convertido', patient_id: newPatient.id } 
          : r
      ));
      setSelectedPatient(prev => prev ? { ...prev, status_conversao: 'Convertido', patient_id: newPatient.id } : null);
      
      if ((newPatient as any).alreadyExisted) {
        setSuccessMessage('Lead vinculado ao paciente já existente com sucesso!');
      } else {
        setSuccessMessage('Lead convertido em paciente com sucesso!');
      }
      
      // Limpa a mensagem de sucesso após 5 segundos
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Erro ao converter lead:', err);
      setError(`Erro ao converter: ${err.message || 'Tente novamente.'}`);
    } finally {
      setConverting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Leads</h1>
            <p className="text-slate-500 dark:text-zinc-400 flex items-center flex-wrap gap-2">
              Gerencie e exporte a lista completa de leads e triagens.
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded-full text-[10px] font-bold">
                {records.length} registros
              </span>
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                Erro: {error}
              </div>
            )}
            {successMessage && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <CheckCircle size={16} />
                {successMessage}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button 
              onClick={fetchData}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 font-bold rounded-xl transition-all shadow-sm hover:bg-slate-50"
            >
              Atualizar
            </button>
            {!isReadOnly && (
              <>
                <button 
                  onClick={() => setIsRegistrationModalOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20"
                >
                  <Plus size={20} />
                  Cadastrar Paciente
                </button>
                <button 
                  onClick={() => {
                    setPatientToEdit(null);
                    setIsFormOpen(true);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 font-bold rounded-xl transition-all shadow-sm hover:bg-slate-50"
                >
                  Nova Triagem
                </button>
              </>
            )}
            <button 
              onClick={exportCSV}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 font-bold rounded-xl transition-all shadow-sm"
            >
              <Download size={20} />
              Exportar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 card-shadow mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou WhatsApp..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {(['Hoje', 'Ontem', 'Últimos 7 dias', 'Este mês', 'Este ano', 'Tudo'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all",
                  period === p 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900" 
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Table / Card View */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 card-shadow overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Nome</th>
                  <th className="px-6 py-4 font-semibold">WhatsApp</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Data Contato</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {paginatedRecords.map((patient, idx) => {
                  const isOutside = !isBusinessHour(parseTimestampUltimaMsg(patient['Timestamp ultima msg']));
                  return (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedPatient(patient)}
                      className={cn(
                        "hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer",
                        selectedPatient?.id === patient.id && "bg-brand-50/50 dark:bg-brand-900/10"
                      )}
                    >
                      <td className="px-6 py-4 font-medium">{patient.Nome}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-zinc-400 font-mono text-sm">{patient.Whatsapp}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide",
                          patient.tipo_consulta === 'Online' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        )}>
                          {patient.tipo_consulta}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-zinc-400">
                        {patient['Inicio do atendimento']}
                      </td>
                      <td className="px-6 py-4">
                        {isOutside ? (
                          <span className="px-2 py-1 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wide">
                            Fora do horário
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                            Comercial
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
            {paginatedRecords.map((patient, idx) => {
              const isOutside = !isBusinessHour(parseTimestampUltimaMsg(patient['Timestamp ultima msg']));
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors flex flex-col gap-3",
                    selectedPatient?.id === patient.id && "bg-brand-50/50 dark:bg-brand-900/10"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{patient.Nome}</h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 font-mono">{patient.Whatsapp}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide",
                      patient.tipo_consulta === 'Online' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    )}>
                      {patient.tipo_consulta}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Contato em</span>
                      <span className="text-xs text-slate-600 dark:text-zinc-400">{patient['Inicio do atendimento']}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedPatient(patient)}
                      className="px-4 py-2 bg-brand-500 text-white text-xs font-bold rounded-xl hover:bg-brand-600 transition-colors"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                    {isOutside ? (
                      <span className="text-[9px] font-bold uppercase text-orange-500 flex items-center gap-1">
                        <Clock size={10} /> Fora do horário comercial
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase text-emerald-500 flex items-center gap-1">
                        <Clock size={10} /> Horário comercial
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> de <span className="font-medium">{filteredRecords.length}</span> resultados
              </p>
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium px-4">Página {currentPage} de {totalPages}</span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Side Panel */}
      {selectedPatient && (
        <>
          <div
            onClick={() => setSelectedPatient(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
          />
          <div
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 z-[110] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold">Detalhes do Paciente</h2>
                <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <User size={40} />
                  </div>
                  <h3 className="text-2xl font-bold">{selectedPatient.Nome}</h3>
                  <p className="text-slate-500 font-mono flex items-center gap-2">
                    <Phone size={14} /> {selectedPatient.Whatsapp}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <InfoRow icon={Calendar} label="Início do Atendimento" value={selectedPatient['Inicio do atendimento']} />
                  <InfoRow icon={Clock} label="Tipo de Consulta" value={selectedPatient.tipo_consulta} />
                  <InfoRow icon={Calendar} label="Consulta Agendada" value={selectedPatient['Data da consulta'] || "Pendente"} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MessageSquare size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-widest">Resumo da Triagem</h4>
                  </div>
                  <div className="bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-2xl text-slate-700 dark:text-zinc-300 leading-relaxed italic border border-slate-100 dark:border-zinc-800">
                    &quot;{selectedPatient['Resumo da conversa']}&quot;
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                {selectedPatient.status_conversao === 'Convertido' || selectedPatient.patient_id ? (
                  <div className="space-y-3">
                    <div className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-emerald-100 dark:border-emerald-800">
                      <CheckCircle2 size={18} />
                      Paciente Convertido
                    </div>
                    {canViewClinicalNotes && (
                      <button 
                        onClick={() => router.push(`/terapias?patient_id=${selectedPatient.patient_id}`)}
                        className="w-full py-3 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold rounded-xl hover:bg-brand-100 transition-all flex items-center justify-center gap-2 border border-brand-100 dark:border-brand-800"
                      >
                        <Calendar size={18} />
                        Criar Plano de Terapia
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {error && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                        <AlertCircle size={14} />
                        {error}
                      </div>
                    )}
                    {!isReadOnly && (
                      <button 
                        onClick={handleConvertToPatient}
                        disabled={converting}
                        className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                      >
                        {converting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                        Converter em Paciente
                      </button>
                    )}
                  </div>
                )}
                
                {!isReadOnly && (
                  <button 
                    onClick={() => {
                      setPatientToEdit(selectedPatient);
                      setIsFormOpen(true);
                    }}
                    className="w-full py-3 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit size={18} />
                    Editar Dados da Triagem
                  </button>
                )}
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="w-full py-3 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Fechar Painel
                </button>
              </div>
            </div>
          </>
        )}

      <PatientFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={fetchData}
        patient={patientToEdit}
      />

      <PatientRegistrationModal 
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        onSuccess={() => {
          // Opcional: recarregar algo se necessário, 
          // mas crm_psico_patients não é a tabela principal desta página (que é CRM_Geral)
        }}
      />
    </div>
  );
}

export default function PatientsPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LeadsContent />
    </React.Suspense>
  );
}

function InfoRow({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl">
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-400 shadow-sm">
        {Icon && <Icon size={18} />}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
