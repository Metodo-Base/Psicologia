'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Eye, 
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { getApiKeys, createApiKey, revokeApiKey, activateApiKey, ApiKey } from '@/services/apiKeysService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const data = await getApiKeys();
      setKeys(data);
    } catch (err) {
      console.error('Error fetching keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setCreating(true);
      const key = await createApiKey(newKeyName);
      setGeneratedKey(key);
      setShowNewKeyModal(true);
      setNewKeyName('');
      fetchKeys();
    } catch (err) {
      console.error('Error creating key:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar esta chave? Ela deixará de funcionar imediatamente.')) return;
    try {
      await revokeApiKey(id);
      fetchKeys();
    } catch (err) {
      console.error('Error revoking key:', err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Key className="text-brand-500" />
              Chaves de API
            </h1>
            <p className="text-slate-500 dark:text-zinc-400">
              Gerencie o acesso privado ao sistema para n8n e outras automações.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm sticky top-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus size={20} className="text-brand-500" />
                Nova Chave
              </h2>
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Nome da Chave</label>
                  <input 
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    placeholder="Ex: n8n Sofia"
                  />
                </div>
                <button 
                  disabled={creating}
                  className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  Gerar Chave
                </button>
              </form>

              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex gap-3">
                  <AlertCircle className="text-amber-600 shrink-0" size={20} />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    <strong>Atenção:</strong> Chaves de API dão acesso total aos dados dos pacientes. Guarde-as com segurança e nunca as compartilhe publicamente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
                <h2 className="text-lg font-bold">Suas Chaves</h2>
              </div>

              {loading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="animate-spin text-brand-500" size={32} />
                </div>
              ) : keys.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic">
                  Nenhuma chave gerada ainda.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {keys.map((key) => (
                    <div key={key.id} className="p-6 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {key.name}
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                              key.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                            )}>
                              {key.status === 'active' ? 'Ativa' : 'Revogada'}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500">Criada em {format(new Date(key.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        </div>
                        <button 
                          onClick={() => handleRevoke(key.id)}
                          disabled={key.status === 'inactive'}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-30"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 p-3 rounded-xl">
                        <code className="flex-1 font-mono text-sm overflow-hidden text-ellipsis">
                          {visibleKeys[key.id] ? key.key : '••••••••••••••••••••••••••••••••'}
                        </code>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => toggleVisibility(key.id)}
                            className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all"
                          >
                            {visibleKeys[key.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button 
                            onClick={() => handleCopy(key.key)}
                            className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        <ShieldCheck size={12} />
                        Último uso: {key.last_used_at ? format(new Date(key.last_used_at), "dd/MM 'às' HH:mm") : 'Nunca utilizada'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* New Key Modal */}
      {showNewKeyModal && generatedKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Chave Gerada!</h2>
              <p className="text-slate-500 mb-8">
                Copie sua chave agora. Por segurança, ela não será mostrada novamente por completo.
              </p>

              <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-2xl flex items-center gap-3 mb-8">
                <code className="flex-1 font-mono text-brand-600 dark:text-brand-400 font-bold break-all">
                  {generatedKey.key}
                </code>
                <button 
                  onClick={() => handleCopy(generatedKey.key)}
                  className="p-3 bg-white dark:bg-zinc-700 rounded-xl shadow-sm hover:scale-105 transition-all"
                >
                  {copied ? <Check className="text-emerald-500" size={20} /> : <Copy size={20} />}
                </button>
              </div>

              <button 
                onClick={() => setShowNewKeyModal(false)}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:opacity-90 transition-all"
              >
                Entendi, já salvei
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
