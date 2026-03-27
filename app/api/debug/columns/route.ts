import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Tenta buscar um registro de CRM_Geral para ver as colunas
    const { data: crmData, error: crmError } = await supabase
      .from('CRM_Geral')
      .select('*')
      .limit(1);

    // Tenta buscar um registro de leads para ver as colunas
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(1);

    return NextResponse.json({
      CRM_Geral: {
        exists: !crmError || crmError.code !== 'PGRST116',
        error: crmError,
        columns: crmData && crmData.length > 0 ? Object.keys(crmData[0]) : null,
        sample: crmData && crmData.length > 0 ? crmData[0] : null
      },
      leads: {
        exists: !leadsError || leadsError.code !== 'PGRST116',
        error: leadsError,
        columns: leadsData && leadsData.length > 0 ? Object.keys(leadsData[0]) : null,
        sample: leadsData && leadsData.length > 0 ? leadsData[0] : null
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
