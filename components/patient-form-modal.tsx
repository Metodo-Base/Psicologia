'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar } from 'lucide-react';
import { supabase, PatientRecord } from '@/lib/supabase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getAvailableSlots } from '@/lib/date-utils';
import { useAuth } from '@/hooks/use-auth';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  patient?: PatientRecord | null;
}

export function PatientFormModal({ isOpen, onClose, onSave, patient }: PatientFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<PatientRecord>>({
    Nome: '',
    Whatsapp: '',
    tipo_consulta: 'Online',
    'Resumo da conversa': '',
    'Inicio do atendimento': format(new Date(), 'dd-MM-yyyy'),
    'Timestamp ultima msg': new Date().toISOString(),
    'Data da consulta': '',
    'Identificador do usuario': '',
  });

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const { data, error: supabaseError } = await supabase
          .from('CRM_Geral')
          .select('*');
        
        if (supabaseError) {
          console.error('Supabase error fetching slots:', supabaseError);
          setAvailableSlots(getAvailableSlots([]));
          return;
        }

        const slots = getAvailableSlots(data as any[] || []);
        if (patient?.['Data da consulta'] && !slots.includes(patient['Data da consulta'])) {
          slots.push(patient['Data da consulta']);
          slots.sort();
        }
        setAvailableSlots(slots);
      } catch (err) {
        console.error('Catch error fetching slots:', err);
        setAvailableSlots(getAvailableSlots([]));
      }
    };
    if (isOpen) {
      setError(null);
      fetchSlots();
    }
  }, [isOpen, patient]);

  useEffect(() => {
    if (patient) {
      setFormData(patient);
    } else {
      setFormData({
        Nome: '',
        Whatsapp: '',
        tipo_consulta: 'Online',
        'Resumo da conversa': '',
        'Inicio do atendimento': format(new Date(), 'dd-MM-yyyy'),
        'Timestamp ultima msg': new Date().toISOString(),
        'Data da consulta': '',
        'Identificador do usuario': '',
      });
    }
  }, [patient, isOpen, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { id: _, ...cleanData } = formData;
      
      const payload = {
        ...cleanData,
        'Timestamp ultima msg': new Date().toISOString(),
        'Identificador do usuario': formData['Identificador do usuario'] || `${formData.Whatsapp}@s.whatsapp.net`,
      };

      let result;
      if (patient?.['Identificador do usuario']) {
        result = await supabase
          .from('CRM_Geral')
          .update(payload)
          .eq('Identificador do usuario', patient['Identificador do usuario']);
      } else {
        result = await supabase
          .from('CRM_Geral')
          .insert([payload]);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }
      
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Erro ao salvar paciente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold">{patient ? 'Editar Paciente' : 'Novo Paciente'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Nome Completo</label>
              <input 
                required
                value={formData.Nome}
                onChange={(e) => setFormData({ ...formData, Nome: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">WhatsApp</label>
              <input 
                required
                value={formData.Whatsapp}
                onChange={(e) => setFormData({ ...formData, Whatsapp: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="Ex: 5511999999999"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Modalidade</label>
                <select 
                  value={formData.tipo_consulta}
                  onChange={(e) => setFormData({ ...formData, tipo_consulta: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all appearance-none"
                >
                  <option value="Online">Online</option>
                  <option value="Presencial">Presencial</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Data e Hora da Consulta</label>
                <div className="relative">
                  <select 
                    required
                    value={formData['Data da consulta']}
                    onChange={(e) => setFormData({ ...formData, 'Data da consulta': e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all appearance-none pr-10"
                  >
                    <option value="">Selecione um horário disponível</option>
                    {availableSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
                {availableSlots.length === 0 && !loading && (
                  <p className="text-[10px] text-orange-500 font-medium mt-1">Nenhum horário disponível nos próximos 15 dias.</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Resumo da Conversa</label>
              <textarea 
                rows={4}
                value={formData['Resumo da conversa']}
                onChange={(e) => setFormData({ ...formData, 'Resumo da conversa': e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"
                placeholder="Descreva o motivo do contato..."
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
