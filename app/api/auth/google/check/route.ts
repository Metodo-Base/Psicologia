import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const tokensCookie = req.cookies.get('google_calendar_tokens');
  return NextResponse.json({ connected: !!tokensCookie });
}
