import { supabase } from '@/lib/supabase';

export interface AiSearchLog {
  id?: string;
  query: string;
  provider: string;
  model: string;
  filters: any;
  results_count: number;
  status: 'success' | 'error';
  response_time: number;
  created_at?: string;
}

export async function getAiSearchLogs() {
  const { data, error } = await supabase
    .from('ai_search_logs')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as AiSearchLog[];
}

export async function logAiSearch(log: AiSearchLog) {
  const { error } = await supabase
    .from('ai_search_logs')
    .insert([log]);
  
  if (error) console.error('Error logging AI search:', error);
}
