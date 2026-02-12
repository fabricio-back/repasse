import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Configuração do Google Calendar com processamento robusto
const getCalendarAuth = () => {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  
  if (!privateKey) {
    throw new Error('GOOGLE_PRIVATE_KEY não está configurada');
  }
  
  // Mesmo processamento do schedule.ts
  privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
  privateKey = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
  
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Formato de chave privada inválido');
  }

  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/calendar.readonly']
  );
};

const WORK_HOURS = {
  morning: { start: 9, end: 11 },
  afternoon: { start: 14, end: 18 },
  slotDuration: 60,
  maxSlotsPerPeriod: 4
};

// Helper para criar data ISO com fuso horário de São Paulo
function toSaoPauloISO(date: Date, hour: number, minute: number = 0): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hourStr = String(hour).padStart(2, '0');
  const minuteStr = String(minute).padStart(2, '0');
  
  // Formato: 2026-02-12T15:00:00-03:00
  // São Paulo é UTC-3 (sem horário de verão desde 2019)
  return `${year}-${month}-${day}T${hourStr}:${minuteStr}:00-03:00`;
}

export async function GET() {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CALENDAR_ID) {
      // Retorna slots mockados se não houver configuração
      return NextResponse.json({
        ok: true,
        slots: generateMockSlots(),
        mock: true
      });
    }

    const auth = getCalendarAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // Busca eventos ocupados
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: process.env.GOOGLE_CALENDAR_ID }]
      }
    });

    const busySlots = response.data.calendars?.[process.env.GOOGLE_CALENDAR_ID]?.busy || [];
    
    // Gera slots disponíveis
    const availableSlots: any[] = [];
    const currentDate = new Date(now);
    currentDate.setHours(0, 0, 0, 0);

    for (let day = 0; day < 30; day++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() + day);
      
      // Pula fins de semana
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      let morningSlots = 0;
      let afternoonSlots = 0;

      // Horários da manhã (09:00-11:00)
      for (let hour = WORK_HOURS.morning.start; hour < WORK_HOURS.morning.end && morningSlots < WORK_HOURS.maxSlotsPerPeriod; hour++) {
        const slotStart = new Date(checkDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + WORK_HOURS.slotDuration);

        // Pula se o slot já passou
        if (slotStart < now) continue;

        // Verifica se há conflito com eventos existentes
        const isOccupied = busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          // Há conflito se os períodos se sobrepõem
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!isOccupied) {
          availableSlots.push({
            start: toSaoPauloISO(checkDate, hour, 0),
            end: toSaoPauloISO(checkDate, hour + 1, 0),
            display: `${String(hour).padStart(2, '0')}:00`
          });
          morningSlots++;
        }
      }

      // Horários da tarde (14:00-18:00)
      for (let hour = WORK_HOURS.afternoon.start; hour < WORK_HOURS.afternoon.end && afternoonSlots < WORK_HOURS.maxSlotsPerPeriod; hour++) {
        const slotStart = new Date(checkDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + WORK_HOURS.slotDuration);

        // Pula se o slot já passou
        if (slotStart < now) continue;

        // Verifica se há conflito com eventos existentes
        const isOccupied = busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          // Há conflito se os períodos se sobrepõem
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!isOccupied) {
          availableSlots.push({
            start: toSaoPauloISO(checkDate, hour, 0),
            end: toSaoPauloISO(checkDate, hour + 1, 0),
            display: `${String(hour).padStart(2, '0')}:00`
          });
          afternoonSlots++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      slots: availableSlots,
      calendarId: process.env.GOOGLE_CALENDAR_ID
    });

  } catch (error) {
    console.error('Erro ao buscar disponibilidade:', error);
    // Fallback para slots mockados em caso de erro
    return NextResponse.json({
      ok: true,
      slots: generateMockSlots(),
      mock: true
    });
  }
}

// Gera slots mockados para desenvolvimento
function generateMockSlots() {
  const slots = [];
  const now = new Date();
  
  for (let day = 0; day < 15; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // Manhã: 09:00, 10:00
    for (let hour of [9, 10]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotEnd.getHours() + 1);
      
      if (slotStart > now) {
        slots.push({
          start: toSaoPauloISO(date, hour, 0),
          end: toSaoPauloISO(date, hour + 1, 0),
          display: `${String(hour).padStart(2, '0')}:00`
        });
      }
    }
    
    // Tarde: 14:00, 15:00, 16:00, 17:00
    for (let hour of [14, 15, 16, 17]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotEnd.getHours() + 1);
      
      if (slotStart > now) {
        slots.push({
          start: toSaoPauloISO(date, hour, 0),
          end: toSaoPauloISO(date, hour + 1, 0),
          display: `${String(hour).padStart(2, '0')}:00`
        });
      }
    }
  }
  
  return slots;
}
