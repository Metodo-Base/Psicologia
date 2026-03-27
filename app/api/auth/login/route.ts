import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyPassword, createSession, checkBruteForce, recordLoginAttempt, seedAdmin } from '@/services/authService';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  try {
    // Ensure seed admin exists
    await seedAdmin();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ 
        error: 'Configuração do Supabase ausente. Verifique as variáveis de ambiente (Secrets) no menu Configurações.' 
      }, { status: 500 });
    }

    const { email, password } = await req.json();

    // 1. Check Brute Force
    const bruteCheck = await checkBruteForce(ip);
    if (bruteCheck.blocked) {
      return NextResponse.json({ 
        error: `Muitas tentativas. Bloqueado até ${new Date(bruteCheck.until!).toLocaleString()}` 
      }, { status: 429 });
    }

    // 2. Find User
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      await recordLoginAttempt(ip, false);
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    // 3. Verify Password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await recordLoginAttempt(ip, false);
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    // 4. Success
    await recordLoginAttempt(ip, true);
    
    const sessionUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password,
      name: user.name
    };

    await createSession(sessionUser);

    return NextResponse.json({ user: sessionUser });
  } catch (err: any) {
    console.error('Login error:', err);
    
    // Provide more context for debugging if it's a database error
    const errorMessage = err.message || 'Erro interno no servidor';
    const isDatabaseError = err.code || err.details || errorMessage.includes('relation') || errorMessage.includes('table');
    
    return NextResponse.json({ 
      error: isDatabaseError ? `Erro de Banco de Dados: ${errorMessage}` : 'Erro interno no servidor',
      details: process.env.NODE_ENV === 'development' ? err : undefined
    }, { status: 500 });
  }
}
