'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { 
  TherapyPlan, 
  Patient, 
  getPatients, 
  createTherapyPlan, 
  updateTherapyPlan 
} from '@/services/therapyPlansService';
import { cn } from '@/lib/utils';

interface TherapyPlanFormProps {
  plan?: TherapyPlan | null;
  onClose: () => void;
  onSave: () => void;
}

const WEEKDAYS = [
  { label: 'Seg', value: 'monday' },
  { label: 'Ter', value: 'tuesday' },
  { label: 'Qua', value: 'wednesday' },
  { label: 'Qui', value: 'thursday' },
  { label: 'Sex', value: 'friday' },
  { label: 'Sáb', value: 'saturday' },
  { label: 'Dom', value: 'sunday' }
];

const FREQUENCIES = [
  { label: '1x por semana', value: 'weekly' },
  { label: '2x por semana', value: 'twice_weekly' },
  { label: 'Quinzenal', value: 'biweekly' },
  { label: 'Mensal', value: 'monthly' }
];

const STATUSES = [
  { label: 'Ativo', value: 'active' },
  { label: 'Pausado', value: 'paused' },
  { label: 'Encerrado', value: 'ended' }
];

export function TherapyPlanForm({ plan, onClose, onSave }: TherapyPlanFormProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<TherapyPlan, 'id' | 'crm_psico_patients'>>({
    patient_id: plan?.patient_id || '',
    status: plan?.status || 'active',
    frequency: plan?.frequency || 'weekly',
    weekdays: plan?.weekdays || [],
    time: plan?.time || '09:00:00',
    start_date: plan?.start_date || new Date().toISOString().split('T')[0],
    end_date: plan?.end_date || null,
    observations: plan?.observations || ''
  });

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setFetchingPatients(true);
        const data = await getPatients();
        setPatients(data);
      } catch (err: any) {
        console.error('Erro ao buscar pacientes:', err);
        setError('Não foi possível carregar a lista de pacientes.');
      } finally {
        setFetchingPatients(false);
      }
    };
    loadPatients();
  }, []);

  const handleToggleWeekday = (day: string) => {
    setFormData(prev => {
      const current = prev.weekdays;
      if (current.includes(day)) {
        return { ...prev, weekdays: current.filter(d => d !== day) };
      } else {
        return { ...prev, weekdays: [...current, day] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.patient_id) {
      setError('Por favor, selecione um paciente.');
      return;
    }
    if (formData.weekdays.length === 0) {
      setError('Selecione pelo menos um dia da semana.');
      return;
    }
    if (!formData.time || !formData.start_date) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (plan?.id) {
        await updateTherapyPlan(plan.id, formData);
      } else {
        await createTherapyPlan(formData);
      }
      
      onSave();
    } catch (err: any) {
      console.error('Erro ao salvar plano:', err);
      setError(`Erro ao salvar: ${err.message || 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {plan ? 'Editar Plano de Terapia' : 'Novo Plano de Terapia'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Configure a recorrência e horários das sessões.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto no-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Paciente */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <User size={16} className="text-brand-500" />
                Paciente *
              </label>
              <div className="relative">
                <select
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  disabled={fetchingPatients || !!plan}
                  className={cn(
                    "w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all appearance-none",
                    fetchingPatients && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <option value="">Selecione um paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
              {fetchingPatients && <p className="mt-1 text-[10px] text-slate-400 animate-pulse">Carregando pacientes...</p>}
            </div>

            {/* Status e Frequência */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Frequência *</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Dias da Semana */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-3">Dias da Semana *</label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleToggleWeekday(day.value)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                      formData.weekdays.includes(day.value)
                        ? "bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/20"
                        : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-brand-500"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horário */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <Clock size={16} className="text-brand-500" />
                Horário *
              </label>
              <input
                type="time"
                value={formData.time.substring(0, 5)}
                onChange={(e) => setFormData({ ...formData, time: `${e.target.value}:00` })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Data Início */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-brand-500" />
                Data de Início *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Data Fim (Opcional) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Data de Término (Opcional)</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Observações */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Observações</label>
              <textarea
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={3}
                placeholder="Detalhes adicionais sobre o plano..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              {plan ? 'Atualizar Plano' : 'Salvar Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
