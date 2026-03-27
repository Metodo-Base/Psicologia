'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/sidebar';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  User,
  Phone,
  Calendar,
  Clock,
  Plus,
  Edit,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PatientRegistrationModal } from '@/components/PatientRegistrationModal';
import { parseDataConsulta } from '@/lib/date-utils';

interface UnifiedPatient {
  id: string;
  name: string;
  phone: string;
  source: 'formal' | 'lead';
  status: string;
  next_appointment?: string;
  last_activity?: string;
  patient_id?: string; // For leads that are converted
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<UnifiedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Buscando dados de pacientes...');
      
      // 1. Fetch formal patients (manual registration or converted leads)
      const { data: formalPatients, error: formalError } = await supabase
        .from('crm_psico_patients')
        .select('*')
        .order('name', { ascending: true });

      if (formalError) {
        console.error('Erro ao buscar pacientes formais:', formalError);
        throw formalError;
      }

      // 2. Fetch leads with appointments or converted
      const { data: leads, error: leadsError } = await supabase
        .from('CRM_Geral')
        .select('*')
        .or('status_conversao.eq.Convertido,"Data da consulta".not.is.null,patient_id.not.is.null');

      if (leadsError) {
        console.error('Erro ao buscar leads:', leadsError);
        throw leadsError;
      }

      console.log('Pacientes formais encontrados:', formalPatients?.length);
      console.log('Leads relevantes encontrados:', leads?.length);

      // 3. Combine and unify
      // We want to avoid duplicates if a lead is converted
      const convertedLeadIds = new Set(leads?.filter(l => l.patient_id).map(l => l.patient_id));
      
      const unified: UnifiedPatient[] = [];

      // Add formal patients
      formalPatients?.forEach(p => {
        unified.push({
          id: p.id,
          name: p.name,
          phone: p.phone || '',
          source: 'formal',
          status: 'Em Terapia',
          last_activity: p.updated_at
        });
      });

      // Add leads with appointments that are NOT yet formal patients
      leads?.forEach(l => {
        if (!l.patient_id) {
          const leadId = l.id || l.Whatsapp || l['IDLead ChatWoot'] || l['Identificador do usuario'];
          unified.push({
            id: String(leadId),
            name: l.Nome || l.Whatsapp || 'Lead sem Nome',
            phone: l.Whatsapp || '',
            source: 'lead',
            status: l['Data da consulta'] ? 'Consulta Marcada' : 'Lead',
            next_appointment: l['Data da consulta'],
            last_activity: l['Inicio do atendimento']
          });
        }
      });

      console.log('Total de pacientes unificados:', unified.length);
      setPatients(unified);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar pacientes:', err);
      setError('Não foi possível carregar a lista de pacientes: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.phone.includes(searchTerm)
    );
  }, [patients, searchTerm]);

  const safeFormatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      // Tenta o formato customizado DD/MM - HH:mm primeiro
      let date = parseDataConsulta(dateStr);
      
      // Se falhar, tenta o formato nativo (para ISO strings)
      if (!date) {
        date = new Date(dateStr);
      }
      
      if (!date || isNaN(date.getTime())) return null;
      return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Pacientes</h1>
            <p className="text-slate-500 dark:text-zinc-400">
              Pacientes em terapia ou com consultas agendadas.
            </p>
          </div>
          
          <button 
            onClick={() => setIsRegistrationModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={20} />
            Cadastrar Paciente
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar paciente por nome ou whatsapp..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium animate-pulse">Carregando pacientes...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 rounded-2xl text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">Ops! Algo deu errado</h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-dashed border-slate-300 dark:border-zinc-700 p-12 rounded-2xl text-center">
            <User className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum paciente encontrado</h3>
            <p className="text-slate-500 dark:text-zinc-400">
              {searchTerm ? "Tente ajustar sua busca." : "Cadastre seu primeiro paciente ou converta um lead."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <div 
                key={`${patient.source}-${patient.id}`}
                className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <User size={24} />
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    patient.status === 'Em Terapia' 
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  )}>
                    {patient.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand-500 transition-colors">
                  {patient.name}
                </h3>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
                    <Phone size={14} />
                    <span>{patient.phone}</span>
                  </div>
                  {patient.next_appointment && safeFormatDate(patient.next_appointment) && (
                    <div className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 font-medium">
                      <Calendar size={14} />
                      <span>Consulta: {safeFormatDate(patient.next_appointment)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <button 
                    onClick={() => router.push(patient.source === 'formal' ? `/terapias?patient_id=${patient.id}` : `/leads?id=${patient.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 dark:bg-zinc-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-slate-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg text-xs font-bold transition-all"
                  >
                    {patient.source === 'formal' ? <ClipboardList size={14} /> : <Search size={14} />}
                    {patient.source === 'formal' ? 'Ver Terapias' : 'Ver Detalhes'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <PatientRegistrationModal 
          isOpen={isRegistrationModalOpen}
          onClose={() => setIsRegistrationModalOpen(false)}
          onSuccess={() => {
            setIsRegistrationModalOpen(false);
            fetchData();
          }}
        />
      </main>
    </div>
  );
}
