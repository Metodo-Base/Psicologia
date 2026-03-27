'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, PatientRecord } from '@/lib/supabase';
import { Sidebar } from '@/components/sidebar';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  MessageSquare,
  X,
  Info,
  Edit
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  isAfter,
  startOfToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDataConsulta, safeFormat, generateRecurringDates } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { PatientFormModal } from '@/components/patient-form-modal';
import { getTherapyPlans, TherapyPlan } from '@/services/therapyPlansService';

export default function AgendaPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [therapyPlans, setTherapyPlans] = useState<TherapyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(startOfToday());
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [hoveredAppointments, setHoveredAppointments] = useState<any[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-switch to list on small screens
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setViewMode('list');
      } else {
        setViewMode('grid');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch CRM records
      const { data: crmData, error: crmError } = await supabase
        .from('CRM_Geral')
        .select('*');
      
      if (crmError) {
        console.error('Erro ao buscar CRM_Geral:', crmError);
      } else {
        setRecords(crmData || []);
      }

      // Fetch Therapy Plans
      try {
        const plans = await getTherapyPlans();
        setTherapyPlans(plans.filter(p => p.status === 'active'));
      } catch (err) {
        console.error('Erro ao buscar planos de terapia:', err);
      }

    } catch (err: any) {
      console.error('Error fetching data (Agenda):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchData();
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const scheduledRecords = useMemo(() => {
    // 1. Regular appointments from CRM_Geral
    const crmAppointments = records
      .map(r => ({ 
        ...r, 
        parsedDate: parseDataConsulta(r['Data da consulta']),
        source: 'crm' 
      }))
      .filter(r => r.parsedDate !== null) as (any & { parsedDate: Date })[];

    // 2. Recurring appointments from Therapy Plans
    const therapyAppointments: any[] = [];
    therapyPlans.forEach(plan => {
      const recurringDates = generateRecurringDates(
        plan.start_date,
        plan.weekdays,
        plan.time,
        plan.frequency,
        60 // Look ahead 60 days to be safe for the calendar view
      );

      recurringDates.forEach(date => {
        therapyAppointments.push({
          id: `therapy-${plan.id}-${date.getTime()}`,
          Nome: plan.crm_psico_patients?.name || 'Paciente em Terapia',
          Whatsapp: '',
          tipo_consulta: 'Terapia Recorrente',
          'Resumo da conversa': plan.observations || 'Sessão de terapia recorrente agendada.',
          'Data da consulta': format(date, 'dd/MM - HH:mm'),
          parsedDate: date,
          source: 'therapy',
          planId: plan.id
        });
      });
    });

    return [...crmAppointments, ...therapyAppointments];
  }, [records, therapyPlans]);

  const strictlyFuture = useMemo(() => {
    return scheduledRecords.filter(r => isAfter(r.parsedDate, startOfToday()) || isSameDay(r.parsedDate, startOfToday()));
  }, [scheduledRecords]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const appointmentsForSelectedDate = strictlyFuture
    .filter(r => isSameDay(r.parsedDate, selectedDate || new Date()))
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8">
        {/* Calendar Section */}
        <div className="flex-1">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Agenda</h1>
              <p className="text-slate-500 dark:text-zinc-400 text-sm">Visualize e organize seus próximos atendimentos.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    viewMode === 'grid' ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  )}
                >
                  Grade
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    viewMode === 'list' ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  )}
                >
                  Lista
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <span className="font-bold text-xs min-w-[120px] text-center capitalize">
                  {safeFormat(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 card-shadow overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-zinc-800">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dayAppointments = strictlyFuture.filter(r => isSameDay(r.parsedDate, day));
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    onMouseEnter={(e) => {
                      if (dayAppointments.length > 0) {
                        setHoveredDate(day);
                        const sortedApps = [...dayAppointments].sort((a, b) => {
                          const dateA = parseDataConsulta(a['Data da consulta']) || new Date();
                          const dateB = parseDataConsulta(b['Data da consulta']) || new Date();
                          return dateA.getTime() - dateB.getTime();
                        });
                        setHoveredAppointments(sortedApps);
                        setMousePos({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (dayAppointments.length > 0) {
                        setMousePos({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredDate(null);
                      setHoveredAppointments([]);
                    }}
                    className={cn(
                      "min-h-[100px] md:min-h-[120px] p-2 border-r border-b border-slate-50 dark:border-zinc-800/50 transition-all cursor-pointer relative group",
                      !isCurrentMonth && "bg-slate-50/50 dark:bg-zinc-900/50 opacity-40",
                      isSelected && "bg-brand-50/50 dark:bg-brand-900/10 ring-2 ring-inset ring-brand-500/20 z-10"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold",
                        isToday(day) ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" : "text-slate-600 dark:text-zinc-400",
                        isSelected && !isToday(day) && "text-brand-600 dark:text-brand-400"
                      )}>
                        {safeFormat(day, 'd')}
                      </span>
                      
                      {dayAppointments.length > 0 && (
                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      {dayAppointments.slice(0, 2).map((app, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "text-[10px] truncate p-1 rounded border-l-2 text-slate-700 dark:text-zinc-300",
                            app.source === 'therapy' 
                              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500" 
                              : "bg-slate-100 dark:bg-zinc-800 border-brand-500"
                          )}
                        >
                          {safeFormat(app.parsedDate, 'HH:mm')} - {app.Nome}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-medium pl-1">
                          + {dayAppointments.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {strictlyFuture
              .filter(r => isSameMonth(r.parsedDate, currentMonth))
              .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
              .map((app, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setSelectedDate(app.parsedDate);
                    setSelectedPatient(app);
                  }}
                  className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 card-shadow flex items-center justify-between gap-4 cursor-pointer hover:border-brand-500/30 transition-all"
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex flex-col items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
                      <span className="text-[10px] font-bold uppercase">{safeFormat(app.parsedDate, 'MMM', { locale: ptBR })}</span>
                      <span className="text-lg font-bold leading-none">{safeFormat(app.parsedDate, 'dd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{app.Nome}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={12} />
                          {safeFormat(app.parsedDate, 'HH:mm')}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                          app.source === 'therapy' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
                        )}>
                          {app.tipo_consulta}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(app.parsedDate);
                        setSelectedPatient(app);
                      }}
                      className="px-3 py-1.5 bg-brand-500 text-white text-xs font-bold rounded-lg hover:bg-brand-600 transition-colors shrink-0"
                    >
                      Ver Resumo
                    </button>
                  </div>
                </div>
              ))}
            {strictlyFuture.filter(r => isSameMonth(r.parsedDate, currentMonth)).length === 0 && (
              <div className="bg-white dark:bg-zinc-900 p-12 rounded-3xl border border-slate-200 dark:border-zinc-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-300 mx-auto">
                  <CalendarIcon size={32} />
                </div>
                <p className="text-slate-400">Nenhuma consulta agendada para este mês.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar Details Panel */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 card-shadow h-full flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-1">
                <CalendarIcon className="text-brand-500" size={20} />
                <h3 className="font-bold text-lg">Detalhes do Dia</h3>
              </div>
              <p className="text-sm text-slate-500 capitalize">
                {selectedDate ? safeFormat(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {appointmentsForSelectedDate.length > 0 ? (
                <div className="space-y-4">
                  {appointmentsForSelectedDate.map((app, idx) => (
                    <div 
                      key={idx}
                      className="group p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl border border-transparent hover:border-brand-500/30 transition-all animate-in fade-in slide-in-from-right-2 duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
                          <Clock size={14} />
                          {safeFormat(app.parsedDate, 'HH:mm')}
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                          app.source === 'therapy' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
                        )}>
                          {app.tipo_consulta}
                        </span>
                      </div>
                      <h4 
                        onClick={() => setSelectedPatient(app)}
                        className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-500 transition-colors"
                      >
                        {app.Nome}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                        &quot;{app['Resumo da conversa']}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-300">
                    <Info size={32} />
                  </div>
                  <p className="text-slate-400 text-sm">Nenhuma consulta agendada para este dia.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Patient Summary Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div 
            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200"
          >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedPatient.Nome}</h3>
                    <p className="text-xs text-slate-500">Resumo para a sessão</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8">
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-2xl text-slate-700 dark:text-zinc-300 leading-relaxed italic border border-slate-100 dark:border-zinc-800">
                  &quot;{selectedPatient['Resumo da conversa']}&quot;
                </div>
                
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/30 rounded-xl">
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Horário</p>
                    <p className="font-bold text-sm">{selectedPatient['Data da consulta']}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/30 rounded-xl">
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Modalidade</p>
                    <p className="font-bold text-sm">{selectedPatient.tipo_consulta}</p>
                  </div>
                </div>

                {selectedPatient.source === 'therapy' && (
                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">Consulta Recorrente</p>
                      <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Este atendimento faz parte de um plano ativo.</p>
                    </div>
                    <button 
                      onClick={() => router.push(`/terapias?id=${selectedPatient.planId}`)}
                      className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      Ver Plano
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 dark:bg-zinc-800/30 flex justify-end gap-3">
                {selectedPatient.source !== 'therapy' && (
                  <button 
                    onClick={() => {
                      setIsFormOpen(true);
                    }}
                    className="px-6 py-2 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors flex items-center gap-2"
                  >
                    <Edit size={18} />
                    Editar
                  </button>
                )}
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

      {/* Hover Pop-up */}
      {hoveredDate && hoveredAppointments.length > 0 && (
        <div 
          className="fixed z-[200] pointer-events-none animate-in fade-in zoom-in duration-150"
          style={{ 
            left: mousePos.x + 15 + 280 > (typeof window !== 'undefined' ? window.innerWidth : 1000) ? mousePos.x - 295 : mousePos.x + 15, 
            top: mousePos.y + 15 + 200 > (typeof window !== 'undefined' ? window.innerHeight : 800) ? mousePos.y - 215 : mousePos.y + 15,
            maxWidth: '280px'
          }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-4 overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-zinc-800">
              <CalendarIcon size={14} className="text-brand-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {safeFormat(hoveredDate, "d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <div className="space-y-3">
              {hoveredAppointments.map((app, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                      <Clock size={10} />
                      {safeFormat(parseDataConsulta(app['Data da consulta']) || new Date(), 'HH:mm')}
                    </span>
                    <span className={cn(
                      "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                      app.source === 'therapy' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
                    )}>
                      {app.tipo_consulta}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                    {app.Nome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
