import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';
import { getAiConfig } from '@/services/aiConfigService';
import { interpretQuery } from '@/lib/ai-interpreter';
import { logAiSearch } from '@/services/aiSearchLogsService';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const auth = await authenticateApi(req);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await req.json();
    const { query, limit = 7, modo } = body;

    if (!query) {
      return NextResponse.json({ error: 'O campo "query" é obrigatório.' }, { status: 400 });
    }

    const config = await getAiConfig();
    if (!config || !config.api_key) {
      return NextResponse.json({ error: 'IA não configurada no painel.' }, { status: 500 });
    }

    const extractedFilters = await interpretQuery(query, config);
    const finalModo = modo || config.default_mode || 'enxuto';

    let dbQuery = supabase.from('CRM_Geral').select('*', { count: 'exact' });

    if (extractedFilters.tipo) dbQuery = dbQuery.eq('tipo', extractedFilters.tipo);
    if (extractedFilters.status_conversao) dbQuery = dbQuery.eq('status_conversao', extractedFilters.status_conversao);
    if (extractedFilters.origem) dbQuery = dbQuery.eq('origem', extractedFilters.origem);
    if (extractedFilters.valor_sessao_min) dbQuery = dbQuery.gte('valor_sessao', extractedFilters.valor_sessao_min);
    if (extractedFilters.valor_sessao_max) dbQuery = dbQuery.lte('valor_sessao', extractedFilters.valor_sessao_max);
    if (extractedFilters.whatsapp) dbQuery = dbQuery.ilike('Whatsapp', `%${extractedFilters.whatsapp}%`);
    
    if (extractedFilters.q) {
      dbQuery = dbQuery.or(`Nome.ilike.%${extractedFilters.q}%,"Resumo da conversa".ilike.%${extractedFilters.q}%`);
    }

    const finalLimit = Math.min(limit, 20);
    dbQuery = dbQuery.range(0, finalLimit - 1);
    dbQuery = dbQuery.order('updated_at', { ascending: false });

    const { data, error, count } = await dbQuery;

    if (error) throw error;

    // Filter fields based on mode
    const items = data.map(item => {
      if (finalModo === 'enxuto') {
        return {
          id: item.id,
          Nome: item.Nome,
          Whatsapp: item.Whatsapp,
          status_conversao: item.status_conversao,
          tipo: item.tipo
        };
      }
      return item;
    });

    const responseTime = Date.now() - startTime;

    // Log the search
    await logAiSearch({
      query,
      provider: config.provider,
      model: config.model,
      filters: extractedFilters,
      results_count: items.length,
      status: 'success',
      response_time: responseTime
    });

    return NextResponse.json({
      meta: {
        limit: finalLimit,
        offset: 0,
        total: count || 0,
        sort: 'updated_at_desc',
        interpretacao: {
          filtros_extraidos: extractedFilters,
          observacoes: extractedFilters.observacoes
        }
      },
      items
    });

  } catch (err: any) {
    console.error('AI Search Error:', err);
    
    const config = await getAiConfig();
    await logAiSearch({
      query: (await req.clone().json()).query || '',
      provider: config?.provider || 'unknown',
      model: config?.model || 'unknown',
      filters: {},
      results_count: 0,
      status: 'error',
      response_time: Date.now() - startTime
    });

    return NextResponse.json({ error: err.message || 'Erro interno na busca com IA.' }, { status: 500 });
  }
}
