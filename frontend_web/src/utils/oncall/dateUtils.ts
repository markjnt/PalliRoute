export const getCalendarDays = (date: Date): Array<Date | null> => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  
  const days: Array<Date | null> = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  
  return days;
};

export const getWeekDays = (date: Date): Date[] => {
  const days: Date[] = [];
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  startOfWeek.setDate(diff);
  
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(startOfWeek.getDate() + i);
    days.push(currentDay);
  }
  
  return days;
};

export const formatDate = (date: Date): string => {
  // Format date as YYYY-MM-DD using local timezone (not UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatMonthYear = (date: Date): string => {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
};

export const formatWeekRange = (dates: Date[]): string => {
  if (dates.length === 0) return '';
  const start = dates[0];
  const end = dates[dates.length - 1];
  return `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

export const getCalendarWeek = (date: Date): number => {
  // ISO 8601 week calculation - correct implementation
  const d = new Date(date.getTime());
  
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  const dayOfWeek = (d.getDay() + 6) % 7 + 1; // Monday = 1, Sunday = 7
  d.setDate(d.getDate() + 4 - dayOfWeek);
  
  // Get first day of year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  
  // Calculate full weeks to nearest Thursday
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return weekNumber;
};

export const formatWeekWithKW = (dates: Date[]): string => {
  if (dates.length === 0) return '';
  const start = dates[0];
  const end = dates[dates.length - 1];
  const kw = getCalendarWeek(start);
  return `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} (KW ${kw})`;
};

