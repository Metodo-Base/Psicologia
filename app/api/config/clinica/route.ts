import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/services/authService';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('clinic_config')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json(data || {});
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role === 'viewer') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const role = user.role;

    // RBAC: Secretaria can only edit opening_hours and contact_text
    let updateData: any = {};
    if (role === 'secretaria') {
      updateData = {
        opening_hours: body.opening_hours,
        contact_text: body.contact_text,
        updated_at: new Date().toISOString()
      };
    } else {
      // Admin can edit everything
      updateData = { ...body, updated_at: new Date().toISOString() };
      delete updateData.id;
      delete updateData.created_at;
    }

    const { data, error } = await supabase
      .from('clinic_config')
      .upsert({ id: body.id || 'default', ...updateData })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
