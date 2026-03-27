import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession, hashPassword } from '@/services/authService';
import { getUsers, createUser, deleteUser, updateUser } from '@/services/usersService';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const users = await getUsers();
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getSession();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { email, name, role, password } = await req.json();

    if (!email || !password || password.length < 10) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await createUser({
      email,
      name,
      role,
      password_hash: passwordHash,
      must_change_password: true
    });

    return NextResponse.json(newUser);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getSession();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });
    }

    const updatedUser = await updateUser(id, updates);
    return NextResponse.json(updatedUser);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getSession();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });

    // Prevent self-deletion
    if (id === admin.id) {
      return NextResponse.json({ error: 'Você não pode excluir a si mesmo' }, { status: 400 });
    }

    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
