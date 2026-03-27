import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { seedAdmin } from '@/services/authService';

export async function GET(req: NextRequest) {
  try {
    // 1. Clear login attempts
    const { error: deleteError } = await supabase
      .from('login_attempts')
      .delete()
      .neq('ip', '0.0.0.0'); // Delete all

    if (deleteError) {
      console.error('Error clearing login attempts:', deleteError);
    }

    // 2. Seed admin
    await seedAdmin();

    return NextResponse.json({ 
      success: true, 
      message: 'Tentativas de login resetadas e admin recriado (se não existia).' 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
