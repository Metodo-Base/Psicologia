import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/services/apiKeysService';
import { logApiRequest } from '@/services/apiLogsService';

// Simple in-memory rate limiter for the current runtime
const ipRateLimit = new Map<string, { count: number, reset: number }>();
const keyRateLimit = new Map<string, { count: number, reset: number }>();

function checkRateLimit(map: Map<string, { count: number, reset: number }>, identifier: string, limit: number) {
  const now = Date.now();
  const record = map.get(identifier);

  if (!record || now > record.reset) {
    map.set(identifier, { count: 1, reset: now + 60000 });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export async function authenticateApi(req: NextRequest) {
  const startTime = Date.now();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const endpoint = req.nextUrl.pathname;

  // 1. IP Rate Limit (60 req/min)
  if (!checkRateLimit(ipRateLimit, ip, 60)) {
    return { 
      authenticated: false, 
      response: NextResponse.json({ error: 'Muitas requisições por IP. Tente novamente em um minuto.' }, { status: 429 }) 
    };
  }

  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response = NextResponse.json({ error: 'Não autorizado. Header Authorization: Bearer <API_KEY> ausente.' }, { status: 401 });
    await logApiRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      status_code: 401,
      ip,
      api_key_id: null,
      response_time: Date.now() - startTime
    });
    return { authenticated: false, response };
  }

  const apiKey = authHeader.split(' ')[1];
  const validKey = await validateApiKey(apiKey);

  if (!validKey) {
    const response = NextResponse.json({ error: 'Chave de API inválida ou revogada.' }, { status: 401 });
    await logApiRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      status_code: 401,
      ip,
      api_key_id: null,
      response_time: Date.now() - startTime
    });
    return { authenticated: false, response };
  }

  // 2. Key Rate Limit (120 req/min)
  const keyLimit = endpoint.includes('busca-ia') ? 20 : 120;
  if (!checkRateLimit(keyRateLimit, validKey.id, keyLimit)) {
    const response = NextResponse.json({ error: 'Limite de requisições da chave de API excedido.' }, { status: 429 });
    await logApiRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      status_code: 429,
      ip,
      api_key_id: validKey.id,
      response_time: Date.now() - startTime
    });
    return { authenticated: false, response };
  }

  return { 
    authenticated: true, 
    apiKey: validKey,
    logRequest: async (statusCode: number) => {
      await logApiRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        status_code: statusCode,
        ip,
        api_key_id: validKey.id,
        response_time: Date.now() - startTime
      });
    }
  };
}
