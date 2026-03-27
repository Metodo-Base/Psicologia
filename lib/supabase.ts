import { createClient } from '@supabase/supabase-js';

const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/['"\s\n\r]/g, '').trim();
const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/['"\s\n\r]/g, '').trim();

// Limpeza da URL
let supabaseUrl = rawUrl;
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.replace(/\/+$/, ''); // Remove barras no final
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, ''); // Remove sufixos de API
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
}

// Log de diagnóstico (visível no F12 do navegador)
if (typeof window !== 'undefined') {
  console.log('%c--- Supabase Connection Diagnostic ---', 'color: #3ecf8e; font-weight: bold;');
  console.log('URL detectada:', supabaseUrl ? `${supabaseUrl.substring(0, 25)}...` : 'Vazia/Nula');
  console.log('Key detectada:', rawKey ? `${rawKey.substring(0, 15)}...` : 'Vazia/Nula');
  if (!supabaseUrl || !rawKey) {
    console.error('ERRO: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não encontradas!');
  }
  console.log('---------------------------------------');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-fix.supabase.co', 
  rawKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

export const testSupabaseConnection = async () => {
  if (!supabaseUrl || !rawKey) {
    return { success: false, message: 'Configuração ausente (URL ou Key vazia)' };
  }
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': rawKey,
        'Authorization': `Bearer ${rawKey}`
      }
    });
    
    if (response.ok) {
      return { success: true, message: 'Conexão estabelecida com sucesso!' };
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      return { 
        success: false, 
        message: `Erro ${response.status}: ${errorData.message || response.statusText}` 
      };
    }
  } catch (err: any) {
    return { success: false, message: `Falha de rede: ${err.message}` };
  }
};

export interface PatientRecord {
  id?: string | number;
  Nome: string;
  Whatsapp: string;
  tipo_consulta: string;
  'Resumo da conversa': string;
  'Inicio do atendimento': string;
  'Timestamp ultima msg': string;
  'Data da consulta': string;
  'Identificador do usuario'?: string;
  'IDLead ChatWoot'?: string | number;
  'IDConversa ChatWoot'?: string | number;
  patient_id?: string | null;
  status_conversao?: string | null;
  tipo?: 'lead' | 'paciente';
  modalidade?: 'online' | 'presencial';
  origem?: 'whatsapp' | 'instagram' | 'site' | 'indicacao';
  valor_sessao?: number | null;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}
