'use server';

import { cookies } from 'next/headers';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function verifyPassword(password: string) {
  if (!ADMIN_PASSWORD) {
    return { success: false, error: 'Configuração de segurança incompleta. Contate o administrador.' };
  }
  if (password === ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('psicocrm_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true };
  }
  return { success: false, error: 'Senha incorreta' };
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('psicocrm_auth');
}

export async function checkAuth() {
  const cookieStore = await cookies();
  return cookieStore.get('psicocrm_auth')?.value === 'true';
}
