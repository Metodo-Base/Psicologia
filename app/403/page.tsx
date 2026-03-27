import React from 'react';
import { Sidebar } from '@/components/sidebar';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Acesso Negado</h1>
          <p className="text-slate-500 dark:text-zinc-400 mb-8">
            Você não tem permissão para acessar esta página. Se acredita que isso é um erro, entre em contato com a administração.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:opacity-90 transition-all"
          >
            <ArrowLeft size={20} />
            Voltar ao Início
          </Link>
        </div>
      </main>
    </div>
  );
}
