import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ whatsapp: string }> }
) {
  const auth = await authenticateApi(req);
  if (!auth.authenticated) return auth.response;

  const { whatsapp } = await params;

  const { data, error } = await supabase
    .from('CRM_Geral')
    .select('*')
    .ilike('Whatsapp', `%${whatsapp}%`)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Paciente com este WhatsApp não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
