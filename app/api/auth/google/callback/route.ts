import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Create the response
    const response = NextResponse.json({ success: true });

    // Store tokens in a cookie
    // In a real app, you'd store this in a database linked to the user
    // For this demo, we'll use a cookie with SameSite=None; Secure
    const tokenStr = JSON.stringify(tokens);
    
    response.cookies.set('google_calendar_tokens', tokenStr, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    // Return a simple HTML that posts a message to the opener and closes
    return new NextResponse(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticação concluída com sucesso! Esta janela fechará automaticamente.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.json({ error: 'Failed to exchange code' }, { status: 500 });
  }
}
