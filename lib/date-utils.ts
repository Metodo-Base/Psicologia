import { 
  parse, 
  format,
  isWithinInterval, 
  startOfToday, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear,
  isSameDay,
  parseISO,
  getHours,
  getDay,
  addDays,
  setHours,
  setMinutes,
  isAfter,
  isBefore,
  addHours,
  startOfHour
} from 'date-fns';
import { PatientRecord } from '@/lib/supabase';

export type PeriodType = 'Hoje' | 'Ontem' | 'Últimos 7 dias' | 'Este mês' | 'Mês passado' | 'Este ano' | 'Tudo' | 'Personalizado';

export function parseInicioAtendimento(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  try {
    // Try DD-MM-YYYY (current format)
    let parsed = parse(dateStr, 'dd-MM-yyyy', new Date());
    if (!isNaN(parsed.getTime())) return parsed;

    // Try YYYY-MM-DD (ISO date)
    parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (!isNaN(parsed.getTime())) return parsed;

    // Try DD/MM/YYYY
    parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
    if (!isNaN(parsed.getTime())) return parsed;

    // Fallback to native Date parser
    parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch (e) {
    console.error('Error parsing date:', dateStr, e);
  }

  return new Date();
}

export function parseTimestampUltimaMsg(dateStr: string): Date {
  if (!dateStr) return new Date();
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

export function parseDataConsulta(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Format: DD/MM - HH:mm
  // Note: This format doesn't have a year. We assume current year or next if it makes sense.
  const now = new Date();
  const currentYear = now.getFullYear();
  try {
    const parsed = parse(`${dateStr} ${currentYear}`, 'dd/MM - HH:mm yyyy', new Date());
    if (isNaN(parsed.getTime())) return null;

    // If the parsed date is more than 6 months in the past, it's likely for next year
    // (e.g., it's December and we are parsing a June date, or vice versa)
    // For a clinical agenda, we usually look forward.
    if (isBefore(parsed, subMonths(now, 6))) {
      return parse(`${dateStr} ${currentYear + 1}`, 'dd/MM - HH:mm yyyy', new Date());
    }
    
    return parsed;
  } catch (e) {
    return null;
  }
}

export function safeFormat(date: Date | number | null | undefined, formatStr: string, options?: any): string {
  if (!date) return '';
  try {
    const d = typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return format(d, formatStr, options);
  } catch (e) {
    console.error('Error formatting date:', date, e);
    return '';
  }
}

export function isBusinessHour(date: Date): boolean {
  const hours = getHours(date);
  const day = getDay(date); // 0 = Sunday, 6 = Saturday
  const isWeekday = day >= 1 && day <= 5;
  return isWeekday && hours >= 9 && hours < 18; // Extended to 18h
}


export function getAvailableSlots(existingRecords: any[], daysToLookAhead: number = 15): string[] {
  const slots: string[] = [];
  const now = new Date();
  
  // Get all taken slots, normalize them
  const takenSlots = (existingRecords || [])
    .map(r => {
      if (typeof r === 'string') return r;
      return r['Data da consulta'] || r.data_consulta || '';
    })
    .filter(Boolean)
    .map(s => String(s).trim());

  // Start from today and go forward
  for (let i = 0; i <= daysToLookAhead; i++) {
    const day = addDays(now, i);
    const dayOfWeek = getDay(day);
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Business hours: 08:00 to 19:00 (extended)
    for (let hour = 8; hour < 19; hour++) {
      // Check both :00 and :30 slots to give more options
      for (let minute of [0, 30]) {
        const slotDate = setMinutes(setHours(day, hour), minute);
        
        // Only future slots (add 5 min buffer)
        if (isBefore(slotDate, addHours(now, 0))) {
          if (isBefore(slotDate, now)) continue;
        }

        const slotStr = format(slotDate, 'dd/MM - HH:mm');
        
        // Check if slot is taken (simple string match)
        const isTaken = takenSlots.some(ts => ts === slotStr);
        
        if (!isTaken) {
          slots.push(slotStr);
        }
      }
    }
  }

  return slots;
}

export function generateRecurringDates(
  startDateStr: string,
  weekdays: string[],
  time: string,
  frequency: 'weekly' | 'twice_weekly' | 'biweekly' | 'monthly',
  daysToLookAhead: number = 30
): Date[] {
  const dates: Date[] = [];
  const [hours, minutes] = time.split(':').map(Number);
  
  const weekdayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  const targetWeekdays = weekdays.map(d => weekdayMap[d.toLowerCase()]);
  const planStart = parseISO(startDateStr);
  const lookAheadEnd = addDays(new Date(), daysToLookAhead);

  // We start looking from today or plan start, whichever is later
  let currentDay = isAfter(planStart, startOfToday()) ? planStart : startOfToday();

  while (isBefore(currentDay, lookAheadEnd) || isSameDay(currentDay, lookAheadEnd)) {
    const dayOfWeek = getDay(currentDay);
    
    if (targetWeekdays.includes(dayOfWeek)) {
      // Calculate weeks since plan start to handle biweekly/monthly
      const msDiff = currentDay.getTime() - planStart.getTime();
      const weeksDiff = Math.floor(msDiff / (7 * 24 * 60 * 60 * 1000));
      
      let shouldAdd = false;
      if (frequency === 'weekly' || frequency === 'twice_weekly') {
        shouldAdd = true;
      } else if (frequency === 'biweekly') {
        shouldAdd = weeksDiff % 2 === 0;
      } else if (frequency === 'monthly') {
        shouldAdd = weeksDiff % 4 === 0;
      }

      if (shouldAdd) {
        const appointmentDate = setMinutes(setHours(currentDay, hours), minutes);
        dates.push(appointmentDate);
      }
    }
    currentDay = addDays(currentDay, 1);
  }

  return dates;
}

export function filterByPeriod(records: PatientRecord[], period: PeriodType, customRange?: { start: Date; end: Date }): PatientRecord[] {
  const now = new Date();
  let interval: { start: Date; end: Date };

  switch (period) {
    case 'Tudo':
      return records;
    case 'Hoje':
      interval = { start: startOfToday(), end: now };
      break;
    case 'Ontem':
      const yesterday = subDays(startOfToday(), 1);
      interval = { start: yesterday, end: subDays(now, 1) };
      break;
    case 'Últimos 7 dias':
      interval = { start: subDays(startOfToday(), 7), end: now };
      break;
    case 'Este mês':
      interval = { start: startOfMonth(now), end: now };
      break;
    case 'Mês passado':
      const lastMonth = subMonths(now, 1);
      interval = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      break;
    case 'Este ano':
      interval = { start: startOfYear(now), end: now };
      break;
    case 'Personalizado':
      if (!customRange) return records;
      interval = customRange;
      break;
    default:
      return records;
  }

  return records.filter(record => {
    try {
      const date = parseInicioAtendimento(record['Inicio do atendimento']);
      if (isNaN(date.getTime())) return false;
      return isWithinInterval(date, interval);
    } catch (e) {
      console.error('Error filtering record:', record, e);
      return false;
    }
  });
}
