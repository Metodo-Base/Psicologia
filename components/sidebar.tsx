'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Moon, 
  Sun,
  BrainCircuit,
  ClipboardList,
  Key,
  Bot,
  History,
  FileText,
  Settings,
  LogOut,
  Shield,
  Activity,
  UserCircle,
  Columns,
  Database
} from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { NotificationBell } from './notification-bell';
import { useAuth } from '@/hooks/use-auth';

function SidebarContent({ isCollapsed, pathname, theme, toggleTheme, setIsCollapsed }: any) {
  const { user, logout } = useAuth();
  const role = user?.role || 'viewer';

  const navItems = useMemo(() => [
    { name: 'Home', href: '/', icon: LayoutDashboard, roles: ['admin', 'secretaria', 'viewer'] },
    { name: 'Kanban', href: '/kanban', icon: Columns, roles: ['admin', 'secretaria', 'viewer'] },
    { name: 'Leads', href: '/leads', icon: Users, roles: ['admin', 'secretaria', 'viewer'] },
    { name: 'Pacientes', href: '/pacientes', icon: Users, roles: ['admin', 'secretaria', 'viewer'] },
    { name: 'Terapias', href: '/terapias', icon: ClipboardList, roles: ['admin', 'secretaria', 'viewer'] },
    { name: 'Agenda', href: '/agenda', icon: Calendar, roles: ['admin', 'secretaria', 'viewer'] },
  ], []);

  const configItems = useMemo(() => [
    { name: 'Chaves de API', href: '/config/api-keys', icon: Key, roles: ['admin'] },
    { name: 'Configurações de IA', href: '/config/ia', icon: Bot, roles: ['admin'] },
    { name: 'Logs da Busca IA', href: '/config/ia-logs', icon: History, roles: ['admin'] },
    { name: 'Logs da API', href: '/config/api-logs', icon: Activity, roles: ['admin'] },
    { name: 'Documentação API', href: '/docs/api', icon: FileText, roles: ['admin'] },
    { name: 'Clínica', href: '/config/clinica', icon: Settings, roles: ['admin', 'secretaria'] },
    { name: 'Usuários', href: '/config/users', icon: Shield, roles: ['admin'] },
  ], []);

  const isAdmin = role === 'admin';
  const filteredNav = navItems.filter(item => item.roles.includes(role));
  const filteredConfig = configItems.filter(item => 
    item.roles.includes(role) || (isAdmin && item.roles.includes('admin'))
  );

  const [isConfigOpen, setIsConfigOpen] = useState(() => 
    filteredConfig.some(item => pathname === item.href)
  );

  // Adjust state when pathname changes (React recommended pattern instead of useEffect)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (filteredConfig.some(item => pathname === item.href)) {
      setIsConfigOpen(true);
    }
  }

  return (
    <div className="flex flex-col h-full py-6 px-4">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-500/20">
          <BrainCircuit size={24} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-200">
            <span className="font-display font-bold text-lg leading-tight">PsicoCRM</span>
            <span className="text-xs text-slate-500 dark:text-zinc-500 font-medium">Psicologia Clínica</span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
        <div className="mb-4">
          {!isCollapsed && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 block">Principal</span>}
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" 
                    : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400"
                )}
              >
                <item.icon size={20} className={cn(isActive ? "text-white" : "group-hover:scale-110 transition-transform")} />
                {!isCollapsed && (
                  <span className="font-medium animate-in fade-in slide-in-from-left-2 duration-200">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {filteredConfig.length > 0 && (
          <div className="space-y-1">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group",
                isConfigOpen 
                  ? "bg-slate-100 dark:bg-zinc-800/50 text-brand-600 dark:text-brand-400" 
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-brand-600 dark:hover:text-brand-400"
              )}
            >
              <div className="flex items-center gap-3">
                <Settings size={20} className={cn(isConfigOpen ? "text-brand-500" : "group-hover:scale-110 transition-transform")} />
                {!isCollapsed && (
                  <span className="font-bold text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-200">
                    Sistema & Config
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown 
                  size={16} 
                  className={cn("transition-transform duration-200", isConfigOpen ? "rotate-180" : "")} 
                />
              )}
            </button>

            {isConfigOpen && (
              <div className={cn("space-y-1", !isCollapsed && "pl-4 ml-2 border-l border-slate-200 dark:border-zinc-800")}>
                {filteredConfig.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 group",
                        isActive 
                          ? "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 font-bold" 
                          : "hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 hover:text-brand-600 dark:hover:text-brand-400"
                      )}
                    >
                      <item.icon size={18} className={cn(isActive ? "text-brand-500" : "group-hover:scale-110 transition-transform")} />
                      {!isCollapsed && (
                        <span className="text-sm animate-in fade-in slide-in-from-left-2 duration-200">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-200 dark:border-zinc-800 space-y-2">
        {!isCollapsed && user && (
          <div className="px-3 py-3 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <UserCircle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name || user.email}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{user.role}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <NotificationBell />
          {!isCollapsed && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alertas</span>}
        </div>
        
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-all"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          {!isCollapsed && (
            <span className="font-medium animate-in fade-in slide-in-from-left-2 duration-200">
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </span>
          )}
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-all"
        >
          <LogOut size={20} />
          {!isCollapsed && (
            <span className="font-medium animate-in fade-in slide-in-from-left-2 duration-200">
              Sair
            </span>
          )}
        </button>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex w-full items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-all"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!isCollapsed && (
            <span className="font-medium animate-in fade-in slide-in-from-left-2 duration-200">
              Recolher
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => setIsMobileOpen(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
            <BrainCircuit size={18} />
          </div>
          <span className="font-display font-bold">PsicoCRM</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {isMobileOpen && (
        <>
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden animate-in fade-in duration-200"
          />
          <div
            className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-zinc-900 z-[70] md:hidden shadow-2xl animate-in slide-in-from-left duration-300"
          >
            <div className="absolute top-4 right-4">
              <button onClick={() => setIsMobileOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <SidebarContent 
              isCollapsed={false} 
              pathname={pathname} 
              theme={theme} 
              toggleTheme={toggleTheme} 
              setIsCollapsed={() => {}} 
            />
          </div>
        </>
      )}

      <aside 
        className={cn(
          "hidden md:flex flex-col fixed top-0 left-0 bottom-0 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 transition-all duration-300 z-40",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent 
          isCollapsed={isCollapsed} 
          pathname={pathname} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          setIsCollapsed={setIsCollapsed} 
        />
      </aside>

      <div className={cn(
        "transition-all duration-300",
        "md:pl-20",
        !isCollapsed && "md:pl-64"
      )} />
    </>
  );
}
