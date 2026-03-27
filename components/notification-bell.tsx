'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar, UserPlus, Check, X, Clock, Trash2 } from 'lucide-react';
import { supabase, PatientRecord } from '@/lib/supabase';
import { parseDataConsulta, safeFormat } from '@/lib/date-utils';
import { format, isAfter, isBefore, addHours, subHours, startOfToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'new' | 'upcoming';
  timestamp: Date;
  read: boolean;
  patientId?: string | number;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.info('Todas as notificações marcadas como lidas');
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    setIsOpen(false);
    toast.info('Notificações limpas');
  };

  // Fetch initial upcoming appointments and set up real-time
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }

    const fetchUpcoming = async () => {
      const { data, error } = await supabase
        .from('CRM_Geral')
        .select('*');
      
      if (data) {
        const now = new Date();
        const tomorrow = addDays(now, 1);
        
        const upcoming = data
          .map(r => ({ ...r, parsedDate: parseDataConsulta(r['Data da consulta']) }))
          .filter(r => {
            if (!r.parsedDate) return false;
            // Within next 24 hours and in the future
            return isAfter(r.parsedDate, now) && isBefore(r.parsedDate, tomorrow);
          })
          .map(r => ({
            id: `upcoming-${r.id}`,
            title: 'Consulta Próxima',
            message: `Você tem uma consulta com ${r.Nome} amanhã às ${(() => {
              try {
                return safeFormat(r.parsedDate!, 'HH:mm');
              } catch (e) {
                return '--:--';
              }
            })()}.`,
            type: 'upcoming' as const,
            timestamp: new Date(),
            read: false,
            patientId: r.id
          }));
        
        setNotifications(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(n => n.id));
          const newUpcoming = upcoming.filter(u => !existingIds.has(u.id));
          return [...prev, ...newUpcoming].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        });
      }
    };

    fetchUpcoming();

    // Re-check upcoming every hour
    const upcomingInterval = setInterval(fetchUpcoming, 1000 * 60 * 60);

    // Set up real-time subscription for new appointments
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'CRM_Geral'
        },
        (payload) => {
          const newRecord = payload.new as PatientRecord;
          const notification: Notification = {
            id: `new-${newRecord.id}-${Date.now()}`,
            title: 'Nova Consulta Marcada',
            message: `${newRecord.Nome} agendou uma consulta para ${newRecord['Data da consulta']}.`,
            type: 'new',
            timestamp: new Date(),
            read: false,
            patientId: newRecord.id
          };
          
          setNotifications(prev => [notification, ...prev]);
          
          // Show toast
          toast.success(notification.title, {
            description: notification.message,
            duration: 5000,
            action: {
              label: 'Ver',
              onClick: () => setIsOpen(true)
            },
            cancel: {
              label: 'Lida',
              onClick: () => markAsRead(notification.id)
            }
          });
          
          // Native notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, { body: notification.message });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(upcomingInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-all group"
        aria-label="Notificações"
      >
        <Bell size={20} className={cn("group-hover:scale-110 transition-transform", unreadCount > 0 && "animate-pulse")} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 animate-in zoom-in duration-300">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile to close on click outside easily */}
            <div 
              className="fixed inset-0 z-[90] md:hidden bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "fixed md:absolute z-[100]",
                "top-[72px] md:top-full mt-2",
                "left-4 right-4 md:left-0 md:right-auto md:w-[400px]",
                "bg-white dark:bg-zinc-900 rounded-[24px] md:rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-100px)] md:max-h-[500px]"
              )}
            >
              <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notificações</h3>
                    {unreadCount > 0 && (
                      <p className="text-[10px] text-brand-500 font-medium">{unreadCount} novas mensagens</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button 
                      onClick={() => {
                        if (confirm('Deseja limpar todas as notificações?')) {
                          clearAll();
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Limpar tudo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-slate-50 dark:divide-zinc-800/50">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={cn(
                          "p-5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all relative group flex gap-4",
                          !notification.read && "bg-brand-50/20 dark:bg-brand-900/5"
                        )}
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                          notification.type === 'new' 
                            ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400" 
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                        )}>
                          {notification.type === 'new' ? <UserPlus size={20} /> : <Clock size={20} />}
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center justify-between mb-1">
                            <p className={cn(
                              "text-sm tracking-tight truncate",
                              notification.read ? "text-slate-600 dark:text-zinc-400 font-medium" : "text-slate-900 dark:text-white font-bold"
                            )}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0 ml-2 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-slate-300 dark:text-zinc-600" />
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                              {safeFormat(notification.timestamp, "HH:mm '•' d 'de' MMM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="absolute top-5 right-4 flex flex-col gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all">
                          {!notification.read && (
                            <button 
                              onClick={() => markAsRead(notification.id)}
                              className="p-2 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl text-emerald-500 shadow-sm border border-slate-100 dark:border-zinc-700 transition-all hover:scale-110 active:scale-95"
                              title="Marcar como lida"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => removeNotification(notification.id)}
                            className="p-2 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 dark:border-zinc-700 transition-all hover:scale-110 active:scale-95"
                            title="Remover"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-center text-slate-200 dark:text-zinc-700 mx-auto mb-6 border-2 border-dashed border-slate-100 dark:border-zinc-800">
                      <Bell size={40} />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Sem notificações</h4>
                    <p className="text-sm text-slate-400 max-w-[200px] mx-auto">Tudo em dia por aqui. Avisaremos quando algo novo acontecer.</p>
                  </div>
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-4 bg-slate-50/50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  {unreadCount > 0 ? (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors px-3 py-1.5 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg"
                    >
                      Marcar todas como lidas
                    </button>
                  ) : (
                    <div />
                  )}
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                    {notifications.length} total
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
