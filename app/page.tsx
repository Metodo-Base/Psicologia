'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, PatientRecord } from '@/lib/supabase';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { 
  Users, 
  CalendarCheck, 
  Calendar,
  TrendingUp, 
  Clock, 
  Filter,
  ChevronDown,
  Search,
  ExternalLink,
  MessageSquare,
  X,
  Edit,
  Columns,
  Database,
  Activity
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  PeriodType, 
  filterByPeriod, 
  parseInicioAtendimento, 
  parseTimestampUltimaMsg, 
  isBusinessHour,
  parseDataConsulta,
  safeFormat
} from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { PatientFormModal } from '@/components/patient-form-modal';

export default function Home() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodType>('Tudo');
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [funnelModal, setFunnelModal] = useState<{ isOpen: boolean; title: string; records: PatientRecord[] }>({
    isOpen: false,
    title: '',
    records: []
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/['"\s\n\r]/g, '').trim();
      const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/['"\s\n\r]/g, '').trim();
      
      if (!url || !key) {
        const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
        setError(isVercel 
          ? 'Supabase não configurado no Vercel. Você precisa adicionar NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no painel do Vercel (Settings > Environment Variables) e fazer um novo deploy.'
          : 'Supabase não configurado. Adicione as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas configurações do AI Studio.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('CRM_Geral')
        .select('*')
        .order('Inicio do atendimento', { ascending: false });
      
      if (error) {
        console.error('Erro detalhado do Supabase:', {
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
        setRecords(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching data:', err);
      let msg = err.message || 'Erro inesperado ao buscar dados';
      if (msg.includes('Failed to fetch')) {
        msg = 'Erro de conexão (Failed to fetch). Isso geralmente significa que a URL do Supabase está incorreta ou o projeto está pausado. Verifique também se o seu navegador ou rede está bloqueando a conexão.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFilteredRecords(filterByPeriod(records, period));
  }, [records, period]);

  // KPIs
  const totalContacts = filteredRecords.length;
  const qualifiedContacts = filteredRecords.filter(r => !!r.tipo_consulta).length;
  const unqualifiedContacts = totalContacts - qualifiedContacts;
  const scheduledSessions = filteredRecords.filter(r => !!r['Data da consulta']).length;
  const conversionRate = totalContacts > 0 ? (scheduledSessions / totalContacts) * 100 : 0;

  // Chart Data: Volume over time
  const volumeData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const date = parseInicioAtendimento(r['Inicio do atendimento']);
      const key = safeFormat(date, 'dd/MM');
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => {
        const [da, ma] = a.date.split('/').map(Number);
        const [db, mb] = b.date.split('/').map(Number);
        return ma !== mb ? ma - mb : da - db;
      });
  }, [filteredRecords]);

  // Chart Data: Modality
  const modalityData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      if (r.tipo_consulta) {
        counts[r.tipo_consulta] = (counts[r.tipo_consulta] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  // Chart Data: Time of contact
  const timeData = React.useMemo(() => {
    let commercial = 0;
    let outside = 0;
    filteredRecords.forEach(r => {
      const date = parseTimestampUltimaMsg(r['Timestamp ultima msg']);
      if (isBusinessHour(date)) commercial++;
      else outside++;
    });
    const total = commercial + outside;
    return [
      { 
        name: 'Horário Comercial', 
        value: commercial, 
        percentage: total > 0 ? (commercial / total) * 100 : 0,
        color: '#0ea5e9' 
      },
      { 
        name: 'Fora do Horário', 
        value: outside, 
        percentage: total > 0 ? (outside / total) * 100 : 0,
        color: '#f97316' 
      }
    ];
  }, [filteredRecords]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando triagem...</p>
        </div>
      </div>
    );
  }

  if (!mounted) {
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Visão geral da triagem no WhatsApp</h1>
            <p className="text-slate-500 dark:text-zinc-400">
              Acompanhe o desempenho do seu consultório em tempo real.
              <span className="ml-2 px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded-full text-[10px] font-bold">
                {records.length} registros no total
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchData()}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm cursor-pointer"
              >
                <TrendingUp size={16} className="text-brand-500" />
                Varredura
              </button>
            </div>
          </div>
          
          {error && (
            <div className="space-y-2">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                Erro ao carregar dados: {error}
              </div>
              <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl text-[10px] font-mono text-slate-500 dark:text-zinc-400 overflow-x-auto">
                <p className="font-bold mb-1 uppercase tracking-wider">Debug Info:</p>
                <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...` : 'NÃO DEFINIDA'}</p>
                <p>KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...` : 'NÃO DEFINIDA'}</p>
                <p className="mt-1 text-orange-500">Dica: Se as chaves acima estiverem corretas, verifique se a tabela &quot;CRM_Geral&quot; existe e se o RLS está desativado.</p>
                <button 
                  onClick={async () => {
                    const { testSupabaseConnection } = await import('@/lib/supabase');
                    const result = await testSupabaseConnection();
                    alert(`Resultado do teste: ${result.message}`);
                  }}
                  className="mt-2 px-2 py-1 bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors cursor-pointer"
                >
                  Testar Conexão Direta
                </button>
              </div>
            </div>
          )}
          
          <div className="relative">
            <button
              onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
              className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:border-brand-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 border-r border-slate-100 dark:border-zinc-800 pr-3 mr-1">
                <Calendar size={16} className="text-brand-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Período</span>
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 min-w-[100px] text-left">
                {period}
              </span>
              <ChevronDown 
                size={16} 
                className={cn(
                  "text-slate-400 transition-transform duration-200",
                  isPeriodMenuOpen && "rotate-180"
                )} 
              />
            </button>

            {isPeriodMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsPeriodMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="p-2 grid grid-cols-1 gap-1">
                    {(['Hoje', 'Ontem', 'Últimos 7 dias', 'Este mês', 'Mês passado', 'Este ano', 'Tudo'] as PeriodType[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPeriod(p);
                          setIsPeriodMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer",
                          period === p 
                            ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400" 
                            : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        {p}
                        {period === p && <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Empty State */}
        {records.length === 0 && !loading && !error && (
          <div className="mb-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-8 text-white shadow-xl shadow-brand-500/20 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold mb-2">Bem-vindo ao seu PsicoCRM!</h2>
                <p className="text-brand-50/80 max-w-md">
                  Parece que você ainda não tem pacientes cadastrados na sua base de dados real. 
                  Os dados aparecerão aqui assim que forem sincronizados ou adicionados manualmente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard 
            title="Atendimentos iniciados" 
            value={totalContacts} 
            subtitle="Total de conversas no WhatsApp" 
            icon={Users}
            color="brand"
          />
          <KPICard 
            title="Sessões Agendadas" 
            value={scheduledSessions} 
            subtitle="Conversas que viraram consulta" 
            icon={CalendarCheck}
            color="emerald"
          />
          <KPICard 
            title="Taxa de conversão" 
            value={`${conversionRate.toFixed(1)}%`} 
            subtitle="Percentual de agendamentos" 
            icon={TrendingUp}
            color="accent"
          />
        </div>

        {/* Funil de Atendimento */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-brand-500" size={20} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Funil de Atendimento</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <FunnelStep 
              title="Contatos Iniciados" 
              count={totalContacts} 
              description="Leads que entraram em contato via WhatsApp."
              color="bg-slate-100 dark:bg-zinc-800"
              textColor="text-slate-600 dark:text-zinc-400"
              percentage={100}
              onClick={() => setFunnelModal({
                isOpen: true,
                title: 'Contatos Iniciados',
                records: filteredRecords
              })}
            />
            <FunnelStep 
              title="Não Qualificados" 
              count={unqualifiedContacts} 
              description="Contatos que ainda não definiram modalidade ou não avançaram."
              color="bg-amber-50 dark:bg-amber-900/20"
              textColor="text-amber-600 dark:text-amber-400"
              percentage={totalContacts > 0 ? (unqualifiedContacts / totalContacts) * 100 : 0}
              onClick={() => setFunnelModal({
                isOpen: true,
                title: 'Contatos Não Qualificados',
                records: filteredRecords.filter(r => !r.tipo_consulta)
              })}
            />
            <FunnelStep 
              title="Qualificados" 
              count={qualifiedContacts} 
              description="Pacientes que já definiram a modalidade (Online/Presencial)."
              color="bg-blue-50 dark:bg-blue-900/20"
              textColor="text-blue-600 dark:text-blue-400"
              percentage={totalContacts > 0 ? (qualifiedContacts / totalContacts) * 100 : 0}
              onClick={() => setFunnelModal({
                isOpen: true,
                title: 'Pacientes Qualificados',
                records: filteredRecords.filter(r => !!r.tipo_consulta)
              })}
            />
            <FunnelStep 
              title="Consultas Fechadas" 
              count={scheduledSessions} 
              description="Agendamentos confirmados no calendário."
              color="bg-emerald-50 dark:bg-emerald-900/20"
              textColor="text-emerald-600 dark:text-emerald-400"
              percentage={totalContacts > 0 ? (scheduledSessions / totalContacts) * 100 : 0}
              onClick={() => setFunnelModal({
                isOpen: true,
                title: 'Consultas Fechadas',
                records: filteredRecords.filter(r => !!r['Data da consulta'])
              })}
            />
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 card-shadow">
            <div className="mb-6">
              <h3 className="font-bold text-lg">Volume de contatos ao longo do tempo</h3>
              <p className="text-sm text-slate-500">Quantas pessoas buscam terapia por dia</p>
            </div>
            <div className="h-64 w-full min-h-[256px]">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#0ea5e9" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-zinc-800/50 rounded-xl animate-pulse">
                  <p className="text-xs text-slate-400">Carregando gráfico...</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 card-shadow">
              <div className="mb-6">
                <h3 className="font-bold text-lg">Modalidade</h3>
                <p className="text-sm text-slate-500">Preferência de formato</p>
              </div>
              <div className="h-48 w-full min-h-[192px]">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modalityData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {modalityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0ea5e9' : '#8b5cf6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-zinc-800/50 rounded-xl animate-pulse"></div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 card-shadow">
              <div className="mb-6">
                <h3 className="font-bold text-lg">Horário de busca</h3>
                <p className="text-sm text-slate-500">Janela de contato</p>
              </div>
              <div className="h-48 w-full min-h-[192px]">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={timeData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {timeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-zinc-800/50 rounded-xl animate-pulse"></div>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {timeData.map(t => (
                  <div key={t.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></div>
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      {t.name} <span className="text-slate-900 dark:text-white ml-1">{t.percentage.toFixed(1)}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Patient Table / Card View */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 card-shadow overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold text-lg">Pacientes Recentes</h3>
            <Link href="/pacientes" className="text-brand-500 text-sm font-medium hover:underline flex items-center gap-1">
              Ver todos <ExternalLink size={14} />
            </Link>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Nome</th>
                  <th className="px-6 py-4 font-semibold">WhatsApp</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredRecords.slice(0, 10).map((patient, idx) => {
                  const isOutside = !isBusinessHour(parseTimestampUltimaMsg(patient['Timestamp ultima msg']));
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
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
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedPatient(patient)}
                          className="p-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-lg transition-colors"
                        >
                          <MessageSquare size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
          {filteredRecords.slice(0, 10).map((patient, idx) => {
            const isOutside = !isBusinessHour(parseTimestampUltimaMsg(patient['Timestamp ultima msg']));
            return (
              <div key={idx} className="p-4 space-y-3 bg-white dark:bg-zinc-900">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{patient.Nome}</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-mono">{patient.Whatsapp}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedPatient(patient)}
                      className="p-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-xl"
                    >
                      <ExternalLink size={18} />
                    </button>
                    <button 
                      onClick={() => setSelectedPatient(patient)}
                      className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-xl"
                    >
                      <MessageSquare size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                    patient.tipo_consulta === 'Online' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  )}>
                    {patient.tipo_consulta || 'N/A'}
                  </span>
                  {isOutside ? (
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wide">
                      Fora do horário
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                      Comercial
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filteredRecords.length === 0 && (
            <div className="p-8 text-center text-slate-400 italic bg-white dark:bg-zinc-900">
              Nenhum paciente encontrado.
            </div>
          )}
        </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div 
            className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200"
          >
            <div className="p-8 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{selectedPatient.Nome}</h2>
                <p className="text-slate-500 font-mono">{selectedPatient.Whatsapp}</p>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <DetailItem label="Início do atendimento" value={selectedPatient['Inicio do atendimento']} />
                <DetailItem label="Tipo de Consulta" value={selectedPatient.tipo_consulta} />
                <DetailItem 
                  label="Status de Horário" 
                  value={isBusinessHour(parseTimestampUltimaMsg(selectedPatient['Timestamp ultima msg'])) ? "Horário Comercial" : "Fora do Horário"} 
                  badge={!isBusinessHour(parseTimestampUltimaMsg(selectedPatient['Timestamp ultima msg']))}
                />
                <DetailItem label="Agendamento" value={selectedPatient['Data da consulta'] || "Não agendado"} />
              </div>
              
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Resumo da Conversa</h4>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-2xl text-slate-700 dark:text-zinc-300 leading-relaxed italic">
                  &quot;{selectedPatient['Resumo da conversa']}&quot;
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-zinc-800/30 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsFormOpen(true);
                }}
                className="px-6 py-2 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors flex items-center gap-2"
              >
                <Edit size={18} />
                Editar
              </button>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="px-6 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <PatientFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={fetchData}
        patient={selectedPatient}
      />

      {/* Funnel List Modal */}
      {funnelModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div 
            className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
          >
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{funnelModal.title}</h2>
                <p className="text-sm text-slate-500">{funnelModal.records.length} registros encontrados no período</p>
              </div>
              <button 
                onClick={() => setFunnelModal({ ...funnelModal, isOpen: false })}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
                  <tr className="bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 text-[10px] uppercase tracking-wider">
                    <th className="px-6 py-3 font-bold">Nome</th>
                    <th className="px-6 py-3 font-bold">WhatsApp</th>
                    <th className="px-6 py-3 font-bold">Tipo</th>
                    <th className="px-6 py-3 font-bold">Data</th>
                    <th className="px-6 py-3 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {funnelModal.records.length > 0 ? (
                    funnelModal.records.map((patient, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium">{patient.Nome}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-zinc-400 font-mono">{patient.Whatsapp}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            patient.tipo_consulta === 'Online' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          )}>
                            {patient.tipo_consulta || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{patient['Inicio do atendimento']}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setSelectedPatient(patient);
                              setFunnelModal({ ...funnelModal, isOpen: false });
                            }}
                            className="text-brand-500 hover:text-brand-600 font-bold text-xs"
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                        Nenhum paciente encontrado nesta etapa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
              <button 
                onClick={() => setFunnelModal({ ...funnelModal, isOpen: false })}
                className="px-6 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 font-bold rounded-xl transition-colors text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, color }: any) {
  const colors: any = {
    brand: "bg-brand-500 text-white",
    emerald: "bg-emerald-500 text-white",
    accent: "bg-accent-500 text-white",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 card-shadow flex items-start gap-3 md:gap-4">
      <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0", colors[color])}>
        {Icon && <Icon size={20} className="md:w-6 md:h-6" />}
      </div>
      <div>
        <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-zinc-400">{title}</p>
        <h2 className="text-2xl md:text-3xl font-bold mt-0.5 md:mt-1">{value}</h2>
        <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 md:mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function FunnelStep({ title, count, description, color, textColor, percentage, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 card-shadow flex flex-col gap-2 md:gap-3 relative overflow-hidden bg-white dark:bg-zinc-900 cursor-pointer transition-all hover:border-brand-500/50 hover:-translate-y-1"
      )}
    >
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-slate-900 dark:text-white">{title}</h4>
        <span className={cn("text-2xl font-black opacity-20", textColor)}>{Math.round(percentage)}%</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{count}</span>
        <span className="text-xs text-slate-400 font-medium">pacientes</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
      <div className="mt-2 w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          style={{ width: `${percentage}%` }}
          className={cn("h-full rounded-full transition-all duration-500", percentage === 100 ? "bg-slate-400" : percentage > 50 ? "bg-brand-500" : "bg-emerald-500")}
        />
      </div>
    </div>
  );
}

function DetailItem({ label, value, badge }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex items-center gap-2">
        <p className="font-medium text-slate-900 dark:text-white">{value}</p>
        {badge && (
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        )}
      </div>
    </div>
  );
}
