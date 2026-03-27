'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 mx-auto">
              <AlertTriangle size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ops! Algo deu errado.</h2>
              <p className="text-slate-500 dark:text-zinc-400 mt-2">
                Ocorreu um erro inesperado na aplicação. Tente recarregar a página.
              </p>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-rose-600 dark:text-rose-400 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
            >
              <RefreshCw size={20} />
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
