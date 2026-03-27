import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession, hashPassword, createSession } from '@/services/authService';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ 
        error: 'Configuração do Supabase ausente. Verifique as variáveis de ambiente (Secrets).' 
      }, { status: 500 });
    }

    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Nova senha é obrigatória' }, { status: 400 });
    }

    if (password.length < 10) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 10 caracteres.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash, 
        must_change_password: false
      })
      .eq('id', user.id);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ 
        error: `Erro ao atualizar banco de dados: ${error.message}`,
        code: error.code 
      }, { status: 500 });
    }

    // Update session
    const updatedUser = { ...user, must_change_password: false };
    await createSession(updatedUser);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json({ 
      error: err.message || 'Erro interno no servidor',
      code: err.code
    }, { status: 500 });
  }
}
