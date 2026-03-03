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
  visitDuration: 30, // Duração da vistoria em minutos
  interval: 30, // Intervalo entre vistorias em minutos
  slotDuration: 60, // Total (vistoria + intervalo)
  maxSlotsPerPeriod: 4
};

// Sábados com atendimento especial (exceto aos fins de semana normais)
const SPECIAL_SATURDAYS = [
  '2026-03-14',
];

function isSpecialSaturday(date: Date): boolean {
  return SPECIAL_SATURDAYS.includes(toSaoPauloDateStr(date));
}

// Datas bloqueadas (feriados e dias sem atendimento)
const BLOCKED_DATES = [
  '2026-01-01', // Ano Novo
  '2026-02-02', // Carnaval (segunda)
  '2026-02-16', // Carnaval
  '2026-02-17', // Carnaval (terça)
  '2026-02-18', // Quarta de Cinzas
  '2026-04-03', // Paixão de Cristo
  '2026-04-21', // Tiradentes
  '2026-05-01', // Dia do Trabalho
  '2026-06-04', // Corpus Christi
  '2026-09-07', // Independência
  '2026-09-20', // Revolução Farroupilha
  '2026-10-12', // Nossa Senhora Aparecida
  '2026-11-02', // Finados
  '2026-11-20', // Consciência Negra
  '2026-12-25', // Natal
];

// Verifica se uma data está bloqueada
// Usa toSaoPauloDateStr para evitar problema de fuso no servidor UTC
function toSaoPauloDateStr(date: Date): string {
  // Converte para horário de São Paulo (UTC-3) manualmente
  const spOffset = -3 * 60; // -180 minutos
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const spDate = new Date(utcMs + spOffset * 60000);
  return `${spDate.getFullYear()}-${String(spDate.getMonth() + 1).padStart(2, '0')}-${String(spDate.getDate()).padStart(2, '0')}`;
}

function isDateBlocked(date: Date): boolean {
  const dateStr = toSaoPauloDateStr(date);
  return BLOCKED_DATES.includes(dateStr);
}

// Helper para criar data ISO com fuso horário de São Paulo
// minute pode ser > 59 (ex: 60 = 1h depois), a função normaliza
function toSaoPauloISO(date: Date, hour: number, extraMinutes: number = 0): string {
  // Usa a data correta em SP (não UTC do servidor)
  const dateStr = toSaoPauloDateStr(date); // YYYY-MM-DD em SP
  
  // Normaliza: se extraMinutes >= 60, soma nas horas
  const totalMinutes = hour * 60 + extraMinutes;
  const finalHour = Math.floor(totalMinutes / 60);
  const finalMinute = totalMinutes % 60;
  
  const hourStr = String(finalHour).padStart(2, '0');
  const minuteStr = String(finalMinute).padStart(2, '0');
  
  // Formato: 2026-02-12T15:00:00-03:00
  // São Paulo é UTC-3 (sem horário de verão desde 2019)
  return `${dateStr}T${hourStr}:${minuteStr}:00-03:00`;
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
    endDate.setDate(endDate.getDate() + 45); // 45 dias para cobrir o próximo mês

    console.log('🔍 Buscando disponibilidade do calendário...');
    console.log('Período:', now.toISOString(), 'até', endDate.toISOString());

    // Busca eventos ocupados usando freebusy
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
        items: [{ id: process.env.GOOGLE_CALENDAR_ID }]
      }
    });

    const busySlots = response.data.calendars?.[process.env.GOOGLE_CALENDAR_ID]?.busy || [];
    
    console.log(`📅 Eventos ocupados encontrados: ${busySlots.length}`);
    busySlots.forEach((busy: any, index) => {
      console.log(`  ${index + 1}. ${busy.start} → ${busy.end}`);
    });
    
    // Gera slots disponíveis
    const availableSlots: any[] = [];
    const currentDate = new Date(now);
    // 03:00 UTC = 00:00 São Paulo (UTC-3)
    // Garante que getDay() e toSaoPauloDateStr() usem o dia correto em SP
    currentDate.setHours(3, 0, 0, 0);

    for (let day = 0; day < 45; day++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() + day);
      
      // Pula fins de semana (exceto sábados especiais)
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0) continue; // domingo nunca
      if (dayOfWeek === 6 && !isSpecialSaturday(checkDate)) continue; // sábado só se especial

      // Pula datas bloqueadas (feriados)
      if (isDateBlocked(checkDate)) continue;

      let morningSlots = 0;
      let afternoonSlots = 0;

      // Horários da manhã (09:00-11:00)
      for (let hour = WORK_HOURS.morning.start; hour < WORK_HOURS.morning.end && morningSlots < WORK_HOURS.maxSlotsPerPeriod; hour++) {
        // Usa o mesmo ISO que será enviado ao Google Calendar para garantir comparação correta
        const startISO = toSaoPauloISO(checkDate, hour, 0);
        const endISO = toSaoPauloISO(checkDate, hour, WORK_HOURS.slotDuration); // inclui intervalo
        const slotStart = new Date(startISO);
        const slotEnd = new Date(endISO);

        // Pula se o slot já passou
        if (slotStart < now) continue;

        // Verifica se há conflito com eventos existentes
        // Exige intervalo de 30min APÓS cada evento existente também
        const isOccupied = busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          // Adiciona buffer de intervalo ao fim do evento existente
          const busyEndWithBuffer = new Date(busyEnd.getTime() + WORK_HOURS.interval * 60 * 1000);
          const hasConflict = slotStart < busyEndWithBuffer && slotEnd > busyStart;
          if (hasConflict) {
            console.log(`❌ Conflito manhã ${hour}:00 SP:`, {
              slot: `${slotStart.toISOString()} → ${slotEnd.toISOString()}`,
              busy: `${busyStart.toISOString()} → ${busyEnd.toISOString()} (+30min buffer → ${busyEndWithBuffer.toISOString()})`
            });
          }
          return hasConflict;
        });

        if (!isOccupied) {
          availableSlots.push({
            start: startISO,
            end: toSaoPauloISO(checkDate, hour, WORK_HOURS.visitDuration),
            display: `${String(hour).padStart(2, '0')}:00`
          });
          morningSlots++;
        }
      }

      // Horários da tarde (14:00-18:00)
      for (let hour = WORK_HOURS.afternoon.start; hour < WORK_HOURS.afternoon.end && afternoonSlots < WORK_HOURS.maxSlotsPerPeriod; hour++) {
        // Usa o mesmo ISO que será enviado ao Google Calendar para garantir comparação correta
        const startISO = toSaoPauloISO(checkDate, hour, 0);
        const endISO = toSaoPauloISO(checkDate, hour, WORK_HOURS.slotDuration); // inclui intervalo
        const slotStart = new Date(startISO);
        const slotEnd = new Date(endISO);

        // Pula se o slot já passou
        if (slotStart < now) continue;

        // Verifica se há conflito com eventos existentes
        // Exige intervalo de 30min APÓS cada evento existente também
        const isOccupied = busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          // Adiciona buffer de intervalo ao fim do evento existente
          const busyEndWithBuffer = new Date(busyEnd.getTime() + WORK_HOURS.interval * 60 * 1000);
          const hasConflict = slotStart < busyEndWithBuffer && slotEnd > busyStart;
          if (hasConflict) {
            console.log(`❌ Conflito tarde ${hour}:00 SP:`, {
              slot: `${slotStart.toISOString()} → ${slotEnd.toISOString()}`,
              busy: `${busyStart.toISOString()} → ${busyEnd.toISOString()} (+30min buffer → ${busyEndWithBuffer.toISOString()})`
            });
          }
          return hasConflict;
        });

        if (!isOccupied) {
          availableSlots.push({
            start: startISO,
            end: toSaoPauloISO(checkDate, hour, WORK_HOURS.visitDuration),
            display: `${String(hour).padStart(2, '0')}:00`
          });
          afternoonSlots++;
        }
      }
    }

    console.log(`✅ Total de slots disponíveis: ${availableSlots.length}`);

    return NextResponse.json({
      ok: true,
      slots: availableSlots,
      calendarId: process.env.GOOGLE_CALENDAR_ID
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar disponibilidade:', error?.message || error);
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Erro ao buscar disponibilidade',
      slots: []
    }, { status: 500 });
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
    if (dayOfWeek === 0) continue;
    if (dayOfWeek === 6 && !isSpecialSaturday(date)) continue;
    
    // Pula datas bloqueadas (feriados)
    if (isDateBlocked(date)) continue;
    
    // Manhã: 09:00, 10:00
    for (let hour of [9, 10]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotEnd.getHours() + 1);
      
      if (slotStart > now) {
        slots.push({
          start: toSaoPauloISO(date, hour, 0),
          end: toSaoPauloISO(date, hour, 30), // Apenas 30 minutos para a vistoria
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
          end: toSaoPauloISO(date, hour, 30), // Apenas 30 minutos para a vistoria
          display: `${String(hour).padStart(2, '0')}:00`
        });
      }
    }
  }
  
  return slots;
}
