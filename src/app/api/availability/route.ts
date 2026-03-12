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
  morning: { start: 9, end: 12 },
  afternoon: { start: 13, end: 17 },
  visitDuration: 15, // Duração da vistoria em minutos
  interval: 0,       // Sem intervalo entre vistorias
  slotDuration: 15,  // Total por slot (= visitDuration)
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

    const calendarId = process.env.GOOGLE_CALENDAR_ID!;
    const calendarsData = response.data.calendars || {};
    
    // Log todas as chaves retornadas para debug
    const calendarKeys = Object.keys(calendarsData);
    console.log('🔑 Calendar ID configurado:', calendarId);
    console.log('🔑 Chaves retornadas pelo freebusy:', calendarKeys);
    
    // Tenta buscar pelo ID exato, senão pega o primeiro calendário disponível
    let busySlots = calendarsData[calendarId]?.busy || [];
    
    if (busySlots.length === 0 && calendarKeys.length > 0) {
      // Fallback: tenta match case-insensitive ou pega o primeiro
      const matchingKey = calendarKeys.find(k => k.toLowerCase() === calendarId.toLowerCase()) || calendarKeys[0];
      if (matchingKey && matchingKey !== calendarId) {
        console.log(`⚠️ Calendar ID não bateu exato. Usando chave: ${matchingKey}`);
        busySlots = calendarsData[matchingKey]?.busy || [];
      }
    }
    
    console.log(`📅 Eventos ocupados encontrados: ${busySlots.length}`);
    busySlots.forEach((busy: any, index: number) => {
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

      // Horários da manhã (09:00-12:00) em slots de 15min
      for (let totalMin = WORK_HOURS.morning.start * 60; totalMin < WORK_HOURS.morning.end * 60; totalMin += WORK_HOURS.slotDuration) {
        const slotHour = Math.floor(totalMin / 60);
        const slotMin = totalMin % 60;
        const startISO = toSaoPauloISO(checkDate, slotHour, slotMin);
        const endISO = toSaoPauloISO(checkDate, slotHour, slotMin + WORK_HOURS.slotDuration);
        const slotStart = new Date(startISO);
        const slotEnd = new Date(endISO);

        if (slotStart < now) continue;

        const isOccupied = busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!isOccupied) {
          availableSlots.push({
            start: startISO,
            end: toSaoPauloISO(checkDate, slotHour, slotMin + WORK_HOURS.visitDuration),
            display: `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`
          });
        }
      }

      // Horários da tarde (13:00-17:00) em slots de 15min
      for (let totalMin = WORK_HOURS.afternoon.start * 60; totalMin < WORK_HOURS.afternoon.end * 60; totalMin += WORK_HOURS.slotDuration) {
        const slotHour = Math.floor(totalMin / 60);
        const slotMin = totalMin % 60;
        const startISO = toSaoPauloISO(checkDate, slotHour, slotMin);
        const endISO = toSaoPauloISO(checkDate, slotHour, slotMin + WORK_HOURS.slotDuration);
        const slotStart = new Date(startISO);
        const slotEnd = new Date(endISO);

        if (slotStart < now) continue;

        const isOccupied = busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!isOccupied) {
          availableSlots.push({
            start: startISO,
            end: toSaoPauloISO(checkDate, slotHour, slotMin + WORK_HOURS.visitDuration),
            display: `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`
          });
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
    
    // Manhã: 09:00-12:00 em slots de 15min
    for (let totalMin = WORK_HOURS.morning.start * 60; totalMin < WORK_HOURS.morning.end * 60; totalMin += WORK_HOURS.slotDuration) {
      const slotHour = Math.floor(totalMin / 60);
      const slotMin = totalMin % 60;
      const slotStart = new Date(date);
      slotStart.setHours(slotHour, slotMin, 0, 0);
      if (slotStart > now) {
        slots.push({
          start: toSaoPauloISO(date, slotHour, slotMin),
          end: toSaoPauloISO(date, slotHour, slotMin + WORK_HOURS.visitDuration),
          display: `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`
        });
      }
    }

    // Tarde: 13:00-17:00 em slots de 15min
    for (let totalMin = WORK_HOURS.afternoon.start * 60; totalMin < WORK_HOURS.afternoon.end * 60; totalMin += WORK_HOURS.slotDuration) {
      const slotHour = Math.floor(totalMin / 60);
      const slotMin = totalMin % 60;
      const slotStart = new Date(date);
      slotStart.setHours(slotHour, slotMin, 0, 0);
      if (slotStart > now) {
        slots.push({
          start: toSaoPauloISO(date, slotHour, slotMin),
          end: toSaoPauloISO(date, slotHour, slotMin + WORK_HOURS.visitDuration),
          display: `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`
        });
      }
    }
  }
  
  return slots;
}
