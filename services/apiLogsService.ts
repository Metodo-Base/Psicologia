import { supabase } from '@/lib/supabase';

export interface ApiLog {
  id?: string;
  timestamp: string;
  endpoint: string;
  status_code: number;
  ip: string;
  api_key_id: string | null;
  response_time: number;
}

export async function logApiRequest(log: ApiLog) {
  const { error } = await supabase
    .from('api_logs')
    .insert([log]);
  
  if (error) console.error('Error logging API request:', error);
}

export async function getApiLogs(filters?: {
  status_code?: number;
  endpoint?: string;
  start_date?: string;
  end_date?: string;
}) {
  let query = supabase.from('api_logs').select('*').order('timestamp', { ascending: false });

  if (filters?.status_code) query = query.eq('status_code', filters.status_code);
  if (filters?.endpoint) query = query.ilike('endpoint', `%${filters.endpoint}%`);
  if (filters?.start_date) query = query.gte('timestamp', filters.start_date);
  if (filters?.end_date) query = query.lte('timestamp', filters.end_date);

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data as ApiLog[];
}
