'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { 
  Bot, 
  Save, 
  Loader2, 
  Check, 
  AlertCircle,
  Cpu,
  Settings2,
  Lock,
  Zap
} from 'lucide-react';
import { getAiConfig, saveAiConfig, AiConfig } from '@/services/aiConfigService';
import { cn } from '@/lib/utils';

export default function AiConfigPage() {
  const [config, setConfig] = useState<AiConfig>({
    provider: 'google',
    model: 'gemini-2.5-flash-preview',
    api_key: '',
    max_tokens: 1000,
    default_mode: 'enxuto'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await getAiConfig();
        if (data) setConfig(data);
      } catch (err) {
        console.error('Error fetching AI config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await saveAiConfig(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving AI config:', err);
    } finally {
      setSaving(false);
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
      
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Bot className="text-brand-500" />
            Configurações de IA
          </h1>
          <p className="text-slate-500 dark:text-zinc-400">
            Configure o motor de inteligência artificial para a busca por texto livre.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <Cpu size={20} className="text-brand-500" />
                Provedor & Modelo
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Provedor</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, provider: 'google', model: 'gemini-2.5-flash-preview' })}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all text-center space-y-2",
                        config.provider === 'google' 
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400" 
                          : "border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="font-bold">Google Gemini</div>
                      <div className="text-[10px] opacity-60">Recomendado</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, provider: 'openai', model: 'gpt-4o' })}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all text-center space-y-2",
                        config.provider === 'openai' 
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400" 
                          : "border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="font-bold">OpenAI GPT</div>
                      <div className="text-[10px] opacity-60">Padrão do mercado</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Modelo</label>
                  <select
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  >
                    {config.provider === 'google' ? (
                      <>
                        <option value="gemini-2.5-flash-preview">Gemini 2.5 Flash (Rápido & Barato)</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Inteligente)</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-4o">GPT-4o (Mais Poderoso)</option>
                        <option value="gpt-4o-mini">GPT-4o Mini (Econômico)</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <Lock size={20} className="text-brand-500" />
                Autenticação
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Chave da API ({config.provider === 'google' ? 'Google AI' : 'OpenAI'})</label>
                  <input
                    type="password"
                    required
                    value={config.api_key}
                    onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    placeholder="sk-..."
                  />
                  <p className="mt-2 text-[10px] text-slate-500">Sua chave é armazenada de forma segura no banco de dados.</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Limite de Tokens</label>
                  <input
                    type="number"
                    value={config.max_tokens}
                    onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Settings2 size={20} className="text-brand-500" />
              Comportamento da Resposta
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-3">Modo Padrão</label>
                <div className="flex gap-4">
                  <label className="flex-1 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="mode" 
                      className="hidden" 
                      checked={config.default_mode === 'enxuto'}
                      onChange={() => setConfig({ ...config, default_mode: 'enxuto' })}
                    />
                    <div className={cn(
                      "p-4 rounded-2xl border-2 transition-all",
                      config.default_mode === 'enxuto' ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-slate-100 dark:border-zinc-800"
                    )}>
                      <div className="font-bold text-sm mb-1">Enxuto</div>
                      <div className="text-xs text-slate-500">Apenas campos básicos (Nome, WhatsApp, Status).</div>
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="mode" 
                      className="hidden" 
                      checked={config.default_mode === 'detalhado'}
                      onChange={() => setConfig({ ...config, default_mode: 'detalhado' })}
                    />
                    <div className={cn(
                      "p-4 rounded-2xl border-2 transition-all",
                      config.default_mode === 'detalhado' ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-slate-100 dark:border-zinc-800"
                    )}>
                      <div className="font-bold text-sm mb-1">Detalhado</div>
                      <div className="text-xs text-slate-500">Dados completos, incluindo notas e histórico.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl">
                <div className="flex gap-3">
                  <Zap className="text-brand-500 shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-bold mb-1">Dica de Performance</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      O modelo <strong>Gemini 2.5 Flash</strong> é ideal para extração de filtros por ser extremamente rápido e ter um custo muito baixo por requisição.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button 
              type="submit"
              disabled={saving}
              className="px-8 py-4 bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : success ? <Check size={20} /> : <Save size={20} />}
              {success ? 'Configurações Salvas!' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
