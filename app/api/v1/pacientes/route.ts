import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(req.url);
  
  const tipo = searchParams.get('tipo');
  const status_conversao = searchParams.get('status_conversao');
  const modalidade = searchParams.get('modalidade');
  const origem = searchParams.get('origem');
  const valor_sessao_min = searchParams.get('valor_sessao_min');
  const valor_sessao_max = searchParams.get('valor_sessao_max');
  const q = searchParams.get('q');
  const whatsapp = searchParams.get('whatsapp');
  const limit = parseInt(searchParams.get('limit') || '7');
  const offset = parseInt(searchParams.get('offset') || '0');
  const sort = searchParams.get('sort') || 'updated_at_desc';

  let query = supabase.from('CRM_Geral').select('*', { count: 'exact' });

  if (tipo) query = query.eq('tipo', tipo);
  if (status_conversao) query = query.eq('status_conversao', status_conversao);
  if (modalidade) query = query.eq('modalidade', modalidade);
  if (origem) query = query.eq('origem', origem);
  if (valor_sessao_min) query = query.gte('valor_sessao', parseFloat(valor_sessao_min));
  if (valor_sessao_max) query = query.lte('valor_sessao', parseFloat(valor_sessao_max));
  if (whatsapp) query = query.ilike('Whatsapp', `%${whatsapp}%`);
  
  if (q) {
    query = query.or(`Nome.ilike.%${q}%,"Resumo da conversa".ilike.%${q}%`);
  }

  // Se a chave de API estiver vinculada a um usuário específico, poderíamos filtrar aqui
  // Por enquanto, como é um CRM de clínica única, assumimos acesso total com a chave válida.

  // Sorting
  switch (sort) {
    case 'valor_sessao_asc': query = query.order('valor_sessao', { ascending: true }); break;
    case 'valor_sessao_desc': query = query.order('valor_sessao', { ascending: false }); break;
    case 'created_at_desc': query = query.order('created_at', { ascending: false }); break;
    case 'updated_at_desc': 
    default: query = query.order('updated_at', { ascending: false }); break;
  }

  // Pagination
  const finalLimit = Math.min(limit, 50); // Aumentado para 50
  query = query.range(offset, offset + finalLimit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('API Pacientes Error:', error);
    if (auth.logRequest) await auth.logRequest(500);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (auth.logRequest) await auth.logRequest(200);

  return NextResponse.json({
    meta: {
      limit: finalLimit,
      offset,
      total: count || 0,
      sort
    },
    items: data
  });
}
