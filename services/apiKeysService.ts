import { supabase } from '@/lib/supabase';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: 'active' | 'inactive';
  created_at: string;
  last_used_at: string | null;
}

export async function getApiKeys() {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as ApiKey[];
}

export async function createApiKey(name: string) {
  const key = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  const { data, error } = await supabase
    .from('api_keys')
    .insert([{ name, key, status: 'active' }])
    .select()
    .single();
  
  if (error) throw error;
  return data as ApiKey;
}

export async function revokeApiKey(id: string) {
  const { error } = await supabase
    .from('api_keys')
    .update({ status: 'inactive' })
    .eq('id', id);
  
  if (error) throw error;
}

export async function activateApiKey(id: string) {
  const { error } = await supabase
    .from('api_keys')
    .update({ status: 'active' })
    .eq('id', id);
  
  if (error) throw error;
}

export async function validateApiKey(key: string) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key', key)
    .eq('status', 'active')
    .single();
  
  if (error || !data) return null;

  // Update last used at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return data as ApiKey;
}
