import { supabase } from '@/lib/supabase';

export interface AiConfig {
  id?: string;
  provider: 'google' | 'openai';
  model: string;
  api_key: string;
  max_tokens: number;
  default_mode: 'enxuto' | 'detalhado';
  updated_at?: string;
}

export async function getAiConfig() {
  const { data, error } = await supabase
    .from('ai_configs')
    .select('*')
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as AiConfig | null;
}

export async function saveAiConfig(config: AiConfig) {
  const { data: existing } = await supabase
    .from('ai_configs')
    .select('id')
    .single();

  if (existing) {
    const { error } = await supabase
      .from('ai_configs')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('ai_configs')
      .insert([config]);
    if (error) throw error;
  }
}
