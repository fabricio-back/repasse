import { NextResponse } from 'next/server';
import { google } from 'googleapis';

interface ScheduleRequest {
  startIso: string;
  endIso: string;
  name: string;
  email: string;
  phone: string;
  readableSlot: string;
  description?: string;
  valorFipe?: number;
  valorProposta?: number;
}

const getCalendarAuth = () => {
  const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  return new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    ['https://www.googleapis.com/auth/calendar.events']
  );
};

export async function POST(req: Request) {
  try {
    const body: ScheduleRequest = await req.json();
    const { startIso, endIso, name, email, phone, readableSlot, description, valorFipe, valorProposta } = body;

    // Formatação de valores
    const formatCurrency = (value?: number) => {
      if (!value) return 'N/A';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    // Validação básica
    if (!startIso || !endIso || !name || !email || !phone) {
      return NextResponse.json(
        { ok: false, error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Se não houver configuração do Google Calendar, apenas loga e retorna sucesso
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CALENDAR_ID) {
      console.log('⚠️ Agendamento recebido (sem Google Calendar):', {
        name,
        email,
        phone,
        slot: readableSlot
      });

      return NextResponse.json({
        ok: true,
        mock: true,
        message: 'Agendamento registrado (modo desenvolvimento)',
        eventId: `mock-${Date.now()}`
      });
    }

    const auth = getCalendarAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: `Vistoria - ${name}`,
      description: `Cliente: ${name}\nEmail: ${email}\nTelefone: ${phone}\n\n${description || 'Vistoria de veículo agendada'}\n\n=== VALORES ===\nTabela FIPE: ${formatCurrency(valorFipe)}\nProposta: ${formatCurrency(valorProposta)}`,
      start: {
        dateTime: startIso,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endIso,
        timeZone: 'America/Sao_Paulo',
      },
      attendees: [
        { email: email },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    console.log('✅ Agendamento criado:', {
      eventId: response.data.id,
      name,
      email,
      slot: readableSlot
    });

    return NextResponse.json({
      ok: true,
      eventId: response.data.id,
      hangoutLink: response.data.hangoutLink || response.data.htmlLink,
      readableSlot: readableSlot,
    });

  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao criar agendamento',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
