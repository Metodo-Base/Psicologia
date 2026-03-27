import { NextResponse } from 'next/server';
import { getOAuth2Client, getRedirectUri, SCOPES } from '@/lib/google-auth';

export async function GET() {
  const oauth2Client = getOAuth2Client();
  const redirectUri = getRedirectUri();
  
  console.log('Generating Google Auth URL with redirectUri:', redirectUri);
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Missing Google Client ID or Secret');
    return NextResponse.json({ error: 'Configuração do Google incompleta' }, { status: 500 });
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    redirect_uri: redirectUri
  });

  return NextResponse.json({ url });
}
