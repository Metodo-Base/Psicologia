import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/services/authService';
import { getApiLogs } from '@/services/apiLogsService';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const logs = await getApiLogs();
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
