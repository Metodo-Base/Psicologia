'use client';

import React from 'react';
import { Sidebar } from '@/components/sidebar';
import { 
  FileText, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink,
  Lock,
  Search,
  Users,
  MessageSquare,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApiDocsPage() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '/api/v1';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto w-full">
        <div className="mb-12">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="text-brand-500" />
            Documentação da API
          </h1>
          <p className="text-slate-500 dark:text-zinc-400">
            Guia completo para integrar o PsicoCRM com n8n, WhatsApp e outras ferramentas.
          </p>
        </div>

        <div className="space-y-12">
          {/* Introdução */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Lock size={20} className="text-brand-500" />
              Autenticação
            </h2>
            <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
              Toda requisição à API deve incluir o cabeçalho <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-brand-600">Authorization</code> com sua chave de API privada.
            </p>
            <div className="bg-slate-900 rounded-2xl p-6 relative group">
              <pre className="text-emerald-400 font-mono text-sm overflow-x-auto">
                {`Authorization: Bearer <SUA_CHAVE_DE_API>`}
              </pre>
              <button 
                onClick={() => handleCopy(`Authorization: Bearer <SUA_CHAVE_DE_API>`, 'auth')}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all opacity-0 group-hover:opacity-100"
              >
                {copied === 'auth' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </section>

          {/* Endpoints */}
          <section className="space-y-8">
            <h2 className="text-xl font-bold">Endpoints</h2>

            {/* GET /pacientes */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-800/30">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">GET</span>
                  <code className="font-bold text-slate-700 dark:text-zinc-300">/pacientes</code>
                </div>
                <Users size={20} className="text-slate-400" />
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-zinc-400">Lista e filtra pacientes e leads.</p>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Parâmetros (Query)</h4>
                  <ul className="text-xs space-y-1 text-slate-500">
                    <li><code className="text-brand-500">tipo</code>: lead, paciente</li>
                    <li><code className="text-brand-500">status_conversao</code>: novo, em_atendimento, agendado, alta, abandono</li>
                    <li><code className="text-brand-500">modalidade</code>: online, presencial</li>
                    <li><code className="text-brand-500">q</code>: busca por nome, email ou resumo</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* GET /pacientes/whatsapp/{numero} */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-800/30">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">GET</span>
                  <code className="font-bold text-slate-700 dark:text-zinc-300">/pacientes/whatsapp/{'{numero}'}</code>
                </div>
                <MessageSquare size={20} className="text-slate-400" />
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-zinc-400">Busca rápida por número de WhatsApp. Essencial para automações de atendimento.</p>
              </div>
            </div>

            {/* POST /busca-ia */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm border-l-4 border-l-brand-500">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-brand-50/30 dark:bg-brand-900/10">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-brand-100 text-brand-700 text-[10px] font-bold rounded uppercase">POST</span>
                  <code className="font-bold text-brand-600 dark:text-brand-400">/busca-ia</code>
                </div>
                <Bot size={20} className="text-brand-500" />
              </div>
              <div className="p-6 space-y-6">
                <p className="text-sm text-slate-600 dark:text-zinc-400">Busca inteligente usando linguagem natural. A IA interpreta a frase e aplica os filtros automaticamente.</p>
                
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Exemplo de Payload</h4>
                  <div className="bg-slate-900 rounded-2xl p-6 relative group">
                    <pre className="text-emerald-400 font-mono text-sm overflow-x-auto">
{`{
  "query": "pacientes online que pagam mais de 150",
  "modo": "enxuto"
}`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Exemplos de Frases</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "buscar leads do instagram",
                      "pacientes com status de alta",
                      "quem é o paciente do número 11999999999?",
                      "listar pacientes presenciais"
                    ].map((phrase, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-xs text-slate-600 dark:text-zinc-400 italic">
                        &quot;{phrase}&quot;
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* n8n Integration */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Terminal size={20} className="text-brand-500" />
              Integração com n8n
            </h2>
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
              <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                Para integrar com a <strong>Secretária Sofia</strong> ou outras automações no n8n, utilize o nó <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">HTTP Request</code> com as seguintes configurações:
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl">
                    <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Method</h4>
                    <p className="font-bold">POST</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl">
                    <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2">URL</h4>
                    <p className="font-mono text-xs break-all">{baseUrl}/busca-ia</p>
                  </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-2xl relative group">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-4">cURL Example</h4>
                  <pre className="text-emerald-400 font-mono text-xs overflow-x-auto">
{`curl -X POST ${baseUrl}/busca-ia \\
  -H "Authorization: Bearer <SUA_CHAVE>" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "buscar paciente 11999999999"}'`}
                  </pre>
                  <button 
                    onClick={() => handleCopy(`curl -X POST ${baseUrl}/busca-ia -H "Authorization: Bearer <SUA_CHAVE>" -H "Content-Type: application/json" -d '{"query": "buscar paciente 11999999999"}'`, 'curl')}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    {copied === 'curl' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <a 
                  href="https://n8n.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand-500 text-sm font-bold flex items-center gap-2 hover:underline"
                >
                  Ir para o n8n <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
