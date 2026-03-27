import { supabase } from '@/lib/supabase';
import * as bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'psicocrm-secret-key-change-me');

export type UserRole = 'admin' | 'secretaria' | 'viewer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  must_change_password: boolean;
  name?: string;
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export async function createSession(user: User) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  (await cookies()).set('session', token, {
    httpOnly: true,
    secure: true, // Required for SameSite=None
    sameSite: 'none', // Required for cross-origin iframe
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  });

  return token;
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    return payload as unknown as User;
  } catch (err) {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete('session');
}

export async function checkBruteForce(ip: string) {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('ip', ip)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (data) {
    if (data.blocked_until && new Date(data.blocked_until) > new Date()) {
      return { blocked: true, until: data.blocked_until };
    }
  }

  return { blocked: false };
}

export async function recordLoginAttempt(ip: string, success: boolean) {
  const { data: existing } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('ip', ip)
    .single();

  if (success) {
    if (existing) {
      await supabase.from('login_attempts').delete().eq('ip', ip);
    }
    return;
  }

  const attempts = (existing?.attempts || 0) + 1;
  let blocked_until = null;

  if (attempts >= 3) {
    // Block for 1 hour
    blocked_until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }
  
  // If it was already blocked and they tried again (should be caught by checkBruteForce but just in case)
  // or if they keep failing after 1 hour block, we could escalate to 7 days.
  // For simplicity, let's say if attempts >= 6, block for 7 days.
  if (attempts >= 6) {
    blocked_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (existing) {
    await supabase
      .from('login_attempts')
      .update({ attempts, last_attempt: new Date().toISOString(), blocked_until })
      .eq('ip', ip);
  } else {
    await supabase
      .from('login_attempts')
      .insert([{ ip, attempts, last_attempt: new Date().toISOString(), blocked_until }]);
  }
}

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'ieqmur@gmail.com';
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking for admin:', fetchError);
      // If table doesn't exist, this will likely fail
      return;
    }

    if (!existing) {
      const passwordHash = await hashPassword('Admin@123456'); // Match the password provided to the user
      const { error: insertError } = await supabase.from('users').insert([{
        email,
        password_hash: passwordHash,
        role: 'admin',
        must_change_password: true,
        name: 'Admin Inicial'
      }]);
      
      if (insertError) {
        console.error('Error seeding admin:', insertError);
      } else {
        console.log('Admin seed created.');
      }
    }
  } catch (err) {
    console.error('Unexpected error in seedAdmin:', err);
  }
}
