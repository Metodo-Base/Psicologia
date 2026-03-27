import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/services/authService';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  return NextResponse.json({ user });
}
