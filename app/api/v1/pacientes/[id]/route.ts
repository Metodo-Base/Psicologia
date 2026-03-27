import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  const { data, error } = await supabase
    .from('CRM_Geral')
    .select('*')
    .eq('Whatsapp', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
