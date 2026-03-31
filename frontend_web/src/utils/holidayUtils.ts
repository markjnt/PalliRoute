import type { Weekday } from '../types/models';

/** ISO weekday: 1 = Monday … 7 = Sunday (same as Python date.fromisocalendar) */
const WEEKDAY_TO_ISO: Record<Weekday, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

/**
 * Local calendar date for ISO year / ISO week / ISO weekday (aligned with Python date.fromisocalendar).
 */
export function dateFromIsoCalendarWeek(isoYear: number, week: number, isoWeekday: number): Date {
  const jan4 = new Date(isoYear, 0, 4);
  const dow = jan4.getDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - dow + 1);
  const out = new Date(mondayWeek1);
  out.setDate(mondayWeek1.getDate() + (week - 1) * 7 + (isoWeekday - 1));
  out.setHours(0, 0, 0, 0);
  return out;
}

export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * NRW holiday name for the date implied by ISO week + english weekday, using the same
 * `year` parameter as the backend default (calendar year from "now").
 */
export function holidayNameForCalendarWeekday(
  holidayByYmd: Map<string, string>,
  isoYear: number,
  calendarWeek: number,
  weekday: Weekday
): string | null {
  const isoD = WEEKDAY_TO_ISO[weekday];
  if (isoD === undefined) return null;
  try {
    const d = dateFromIsoCalendarWeek(isoYear, calendarWeek, isoD);
    return holidayByYmd.get(formatLocalYmd(d)) ?? null;
  } catch {
    return null;
  }
}
