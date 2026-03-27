import { supabase } from '@/lib/supabase';
import { syncTherapyPlanWithGoogleCalendar } from './googleCalendarService';

export interface TherapyPlan {
  id?: string;
  patient_id: string;
  status: 'active' | 'paused' | 'ended';
  frequency: 'weekly' | 'twice_weekly' | 'biweekly' | 'monthly';
  weekdays: string[]; // ["monday", "wednesday"]
  time: string; // HH:mm:ss
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  observations?: string | null;
  // Join field
  crm_psico_patients?: {
    name: string;
  };
}

export interface Patient {
  id: string;
  name: string;
}

/**
 * Busca todos os planos de terapia com o nome do paciente (join)
 */
export async function getTherapyPlans() {
  const { data, error } = await supabase
    .from('therapy_plans')
    .select(`
      *,
      crm_psico_patients (
        name
      )
    `)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data as TherapyPlan[];
}

/**
 * Busca um plano de terapia específico pelo ID
 */
export async function getTherapyPlanById(id: string) {
  const { data, error } = await supabase
    .from('therapy_plans')
    .select(`
      *,
      crm_psico_patients (
        name
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as TherapyPlan;
}

/**
 * Cria um novo plano de terapia e chama o stub do Google Calendar
 */
export async function createTherapyPlan(planData: Omit<TherapyPlan, 'id' | 'crm_psico_patients'>) {
  const { data, error } = await supabase
    .from('therapy_plans')
    .insert([planData])
    .select()
    .single();

  if (error) throw error;

  // Chama a integração futura com Google Calendar
  if (data?.id) {
    await syncTherapyPlanWithGoogleCalendar(data.id);
  }

  return data;
}

/**
 * Atualiza um plano de terapia existente e chama o stub do Google Calendar
 */
export async function updateTherapyPlan(id: string, planData: Partial<Omit<TherapyPlan, 'id' | 'crm_psico_patients'>>) {
  const { data, error } = await supabase
    .from('therapy_plans')
    .update(planData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Chama a integração futura com Google Calendar
  if (data?.id) {
    await syncTherapyPlanWithGoogleCalendar(data.id);
  }

  return data;
}

/**
 * Busca a lista de pacientes para o dropdown do formulário
 */
export async function getPatients() {
  const { data, error } = await supabase
    .from('crm_psico_patients')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Patient[];
}
