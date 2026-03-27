import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google-auth';
import { parse, format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function POST(req: NextRequest) {
  const tokensCookie = req.cookies.get('google_calendar_tokens');
  
  if (!tokensCookie) {
    return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Find the calendar named "Agenda Psicologia"
    let calendarId = 'primary';
    try {
      const calendarList = await calendar.calendarList.list();
      const targetCalendar = calendarList.data.items?.find(
        cal => cal.summary === 'Agenda Psicologia'
      );
      if (targetCalendar?.id) {
        calendarId = targetCalendar.id;
      }
    } catch (listErr) {
      console.error('Error listing calendars, falling back to primary:', listErr);
    }

    const body = await req.json();
    
    const { patientName, whatsapp, dateStr, type } = body;

    // Parse the date: "13/03 - 14:00"
    // We need to add the year. Let's assume current year.
    const currentYear = new Date().getFullYear();
    const fullDateStr = `${dateStr}/${currentYear}`; // "13/03/2026 - 14:00"
    
    // date-fns parse
    const startDate = parse(fullDateStr, 'dd/MM/yyyy - HH:mm', new Date());
    const endDate = addMinutes(startDate, 60); // Default 1 hour

    const event = {
      summary: `Consulta: ${patientName} (${type})`,
      description: `Paciente: ${patientName}\nWhatsApp: ${whatsapp}\nTipo: ${type}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
    });

    return NextResponse.json({ success: true, eventId: response.data.id });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: error.message || 'Failed to create event' }, { status: 500 });
  }
}
