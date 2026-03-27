'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  MoreVertical, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  PauseCircle, 
  XCircle,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { 
  TherapyPlan, 
  getTherapyPlans 
} from '@/services/therapyPlansService';
import { TherapyPlanForm } from '@/components/TherapyPlanForm';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormat } from '@/lib/date-utils';

const WEEKDAY_LABELS: Record<string, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom'
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: '1x por semana',
  twice_weekly: '2x por semana',
  biweekly: 'Quinzenal',
  monthly: 'Mensal'
};

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
  active: { label: 'Ativo', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
  paused: { label: 'Pausado', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon: PauseCircle },
  ended: { label: 'Encerrado', color: 'text-slate-500 bg-slate-50 dark:bg-zinc-800', icon: XCircle }
};

export default function TherapyPlansPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <TherapyPlansContent />
    </Suspense>
  );
}

function TherapyPlansContent() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<TherapyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TherapyPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await getTherapyPlans();
      setPlans(data);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar planos:', err);
      setError('Não foi possível carregar os planos de terapia. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    
    // Verifica se há um patient_id na URL para abrir o formulário automaticamente
    const patientId = searchParams.get('patient_id');
    if (patientId) {
      setSelectedPlan({ patient_id: patientId } as any);
      setIsFormOpen(true);
    }
  }, [searchParams]);

  const filteredPlans = plans.filter(plan => 
    plan.crm_psico_patients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatWeekdays = (days: string[]) => {
    if (!days || days.length === 0) return 'Nenhum dia';
    return days.map(d => WEEKDAY_LABELS[d] || d).join(', ');
  };

  const handleEdit = (plan: TherapyPlan) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setSelectedPlan(null);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Terapias</h1>
            <p className="text-slate-500 dark:text-zinc-400">Gerencie os planos de terapia recorrentes dos seus pacientes.</p>
          </div>
          
          <button 
            onClick={handleNew}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={20} />
            Novo plano de terapia
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome do paciente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all">
            <Filter size={18} />
            Filtros
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium animate-pulse">Carregando planos...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 rounded-2xl text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">Ops! Algo deu errado</h3>
            <p className="text-red-600 dark:text-red-300 mb-6">{error}</p>
            <button 
              onClick={fetchPlans}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-dashed border-slate-300 dark:border-zinc-700 p-12 rounded-2xl text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum plano encontrado</h3>
            <p className="text-slate-500 dark:text-zinc-400 mb-6 max-w-md mx-auto">
              {searchTerm 
                ? `Não encontramos resultados para "${searchTerm}". Tente outro termo.` 
                : "Você ainda não cadastrou nenhum plano de terapia recorrente."}
            </p>
            {!searchTerm && (
              <button 
                onClick={handleNew}
                className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-all"
              >
                Cadastrar primeiro plano
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPlans.map((plan) => {
              const StatusIcon = STATUS_CONFIG[plan.status].icon;
              return (
                <div 
                  key={plan.id}
                  onClick={() => handleEdit(plan)}
                  className="group bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-brand-500/50 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:text-brand-500 transition-colors">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                          {plan.crm_psico_patients?.name || 'Paciente não identificado'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            STATUS_CONFIG[plan.status].color
                          )}>
                            <StatusIcon size={12} />
                            {STATUS_CONFIG[plan.status].label}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                            <Calendar size={14} className="text-slate-400" />
                            {FREQUENCY_LABELS[plan.frequency]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 md:gap-12">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Horário e Dias</span>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
                          <Clock size={16} className="text-brand-500" />
                          <span>{plan.time.substring(0, 5)}</span>
                          <span className="text-slate-300 dark:text-zinc-700">•</span>
                          <span>{formatWeekdays(plan.weekdays)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Início</span>
                        <div className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                          {safeFormat(new Date(plan.start_date), "dd 'de' MMMM", { locale: ptBR }) || 'Data inválida'}
                        </div>
                      </div>

                      <div className="hidden md:flex items-center text-slate-300 dark:text-zinc-700 group-hover:text-brand-500 transition-colors">
                        <ChevronRight size={24} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Form */}
        {isFormOpen && (
          <TherapyPlanForm 
            plan={selectedPlan}
            onClose={() => setIsFormOpen(false)}
            onSave={() => {
              setIsFormOpen(false);
              fetchPlans();
            }}
          />
        )}
      </main>
    </div>
  );
}
