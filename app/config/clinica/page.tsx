'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { 
  Building2, 
  Save, 
  Clock, 
  MessageSquare, 
  Phone, 
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Activity,
  Bot
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface ClinicConfig {
  id: string;
  name: string;
  address: string;
  phone: string;
  opening_hours: string;
  contact_text: string;
  ai_welcome_message: string;
}

export default function ClinicConfigPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const role = user?.role || 'viewer';
  const isReadOnly = role === 'viewer';
  const isLimited = role === 'secretaria';

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config/clinica');
        if (!res.ok) throw new Error('Erro ao carregar configurações');
        const data = await res.json();
        setConfig(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/config/clinica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error('Erro ao salvar configurações');
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    if (role !== 'admin') return;
    
    setSeeding(true);
    setSeedResult(null);
    setError(null);
    setShowSeedConfirm(false);

    try {
      console.log('Iniciando seed de dados...');
      const res = await fetch('/api/admin/seed');
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro ao semear dados');
      
      setSeedResult(data.message);
      setTimeout(() => setSeedResult(null), 5000);
    } catch (err: any) {
      console.error('Erro ao executar seed:', err);
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-500" size={32} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Configurações da Clínica</h1>
              <p className="text-slate-500 dark:text-zinc-400 mt-1">Gerencie as informações públicas e de atendimento.</p>
            </div>
            {isReadOnly && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-medium border border-amber-100">
                <Lock size={16} />
                Modo Visualização
              </div>
            )}
          </header>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Nome da Clínica</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      disabled={isLimited || isReadOnly}
                      value={config?.name || ''}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      disabled={isLimited || isReadOnly}
                      value={config?.phone || ''}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                  <textarea 
                    disabled={isLimited || isReadOnly}
                    rows={2}
                    value={config?.address || ''}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, address: e.target.value } : null)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-60 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Horário de Funcionamento</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 text-slate-400" size={18} />
                  <textarea 
                    disabled={isReadOnly}
                    rows={3}
                    value={config?.opening_hours || ''}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, opening_hours: e.target.value } : null)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-60 resize-none"
                    placeholder="Ex: Seg-Sex: 08h às 18h"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Texto de Contato (WhatsApp/Site)</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 text-slate-400" size={18} />
                  <textarea 
                    disabled={isReadOnly}
                    rows={4}
                    value={config?.contact_text || ''}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, contact_text: e.target.value } : null)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-60 resize-none"
                    placeholder="Texto padrão para envio de mensagens..."
                  />
                </div>
              </div>

              {role === 'admin' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Mensagem de Boas-vindas IA</label>
                  <div className="relative">
                    <Bot className="absolute left-3 top-3 text-slate-400" size={18} />
                    <textarea 
                      rows={3}
                      value={config?.ai_welcome_message || ''}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, ai_welcome_message: e.target.value } : null)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {role === 'admin' && (
                  <div className="flex items-center gap-2">
                    {!showSeedConfirm ? (
                      <button 
                        type="button"
                        onClick={() => setShowSeedConfirm(true)}
                        disabled={seeding}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50 text-sm"
                      >
                        <Activity size={16} />
                        Gerar Dados Fictícios (Seed)
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 p-1 rounded-xl border border-amber-100 dark:border-amber-900/30">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-2">Confirmar Seed?</span>
                        <button 
                          type="button"
                          onClick={handleSeedData}
                          disabled={seeding}
                          className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all"
                        >
                          {seeding ? <Loader2 className="animate-spin" size={14} /> : 'Sim, Gerar'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowSeedConfirm(false)}
                          disabled={seeding}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-zinc-600 transition-all"
                        >
                          Não
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {seedResult && (
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium animate-in fade-in slide-in-from-left-2">
                    <CheckCircle2 size={14} />
                    {seedResult}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <CheckCircle2 size={18} />
                    Configurações salvas!
                  </div>
                )}
                {!isReadOnly && (
                  <button 
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Salvar Alterações
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
