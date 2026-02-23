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
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  
  if (!privateKey) {
    throw new Error('GOOGLE_PRIVATE_KEY não está configurada');
  }
  
  // Tratamento robusto da chave privada
  // 1. Remove espaços e aspas externas
  privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
  
  // 2. Substitui TODOS os tipos de escape de \n por quebra real
  // Trata \\n (duplo escape) primeiro, depois \n (escape simples)
  privateKey = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
  
  // Validação da estrutura
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Formato de chave privada inválido - faltando header BEGIN');
  }
  if (!privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Formato de chave privada inválido - faltando footer END');
  }

  console.log('🔑 Chave privada carregada com sucesso');
  console.log('📧 Email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly', // necessário para freebusy.query
    ]
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

    // ── Verificação de conflito em tempo real ──────────────────────────────
    // Impede sobreposição mesmo que dois usuários vejam o mesmo slot disponível
    const VISIT_DURATION = 30; // minutos
    const INTERVAL = 30;       // minutos de buffer entre vistorias

    const slotStart = new Date(startIso);
    // Janela de checagem: o slot inteiro + buffer após
    const checkWindowEnd = new Date(slotStart.getTime() + (VISIT_DURATION + INTERVAL) * 60 * 1000);
    // Começa 30min antes para pegar eventos que terminam muito perto do nosso início
    const checkWindowStart = new Date(slotStart.getTime() - INTERVAL * 60 * 1000);

    const freebusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: checkWindowStart.toISOString(),
        timeMax: checkWindowEnd.toISOString(),
        timeZone: 'America/Sao_Paulo',
        items: [{ id: process.env.GOOGLE_CALENDAR_ID }]
      }
    });

    const busyNow = freebusyRes.data.calendars?.[process.env.GOOGLE_CALENDAR_ID!]?.busy || [];
    const slotEnd = new Date(slotStart.getTime() + VISIT_DURATION * 60 * 1000);

    const hasConflict = busyNow.some((busy: any) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      // Aplica buffer de 30min após cada evento existente
      const busyEndWithBuffer = new Date(busyEnd.getTime() + INTERVAL * 60 * 1000);
      return slotStart < busyEndWithBuffer && slotEnd > busyStart;
    });

    if (hasConflict) {
      console.warn('⚠️ Conflito detectado ao agendar:', { startIso, busyNow });
      return NextResponse.json(
        { ok: false, error: 'Este horário acabou de ser ocupado. Por favor, escolha outro horário.' },
        { status: 409 }
      );
    }
    // ──────────────────────────────────────────────────────────────────────

    console.log('📅 Criando evento no Google Calendar:', {
      startIso,
      endIso,
      name,
      slot: readableSlot
    });

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
      // Attendees removidos - Service Account não pode convidar sem Domain-Wide Delegation
      // O email do cliente está na descrição para referência
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'popup', minutes: 1440 }, // 1 dia antes
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
      sendUpdates: 'none', // Alterado de 'all' para 'none' - sem envio automático
    });

    console.log('✅ Agendamento criado com sucesso:', {
      eventId: response.data.id,
      name,
      email,
      slot: readableSlot,
      start: startIso,
      end: endIso
    });

    return NextResponse.json({
      ok: true,
      eventId: response.data.id,
      hangoutLink: response.data.hangoutLink || response.data.htmlLink,
      readableSlot: readableSlot,
    });

  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error);
    
    // Log detalhado para debugging de erro DECODER
    if (error.message?.includes('DECODER')) {
      console.error('❌ ERRO DE DECODER - Problema com a chave privada do Google');
      console.error('Verifique GOOGLE_PRIVATE_KEY no .env.local');
    }
    
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
