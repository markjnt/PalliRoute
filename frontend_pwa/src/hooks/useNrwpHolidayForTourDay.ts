import { useCallback, useMemo } from 'react';
import { useCalendarWeekStore } from '../stores/useCalendarWeekStore';
import { useNrwpHolidaysForYears } from '../services/queries/useConfig';
import { holidayNameForCalendarWeekday } from '../utils/holidayUtils';
import type { Weekday } from '../types/models';

export function useNrwpHolidayForTourDay(selectedWeekday: Weekday) {
  const { selectedCalendarWeek } = useCalendarWeekStore();
  const backendIsoYear = new Date().getFullYear();
  const holidayYears = useMemo(
    () => [backendIsoYear - 1, backendIsoYear, backendIsoYear + 1],
    [backendIsoYear]
  );
  const { holidayByYmd } = useNrwpHolidaysForYears(holidayYears);

  const holidayName = useMemo(() => {
    if (selectedCalendarWeek == null) return null;
    return holidayNameForCalendarWeekday(
      holidayByYmd,
      backendIsoYear,
      selectedCalendarWeek,
      selectedWeekday
    );
  }, [selectedCalendarWeek, selectedWeekday, holidayByYmd, backendIsoYear]);

  const isSaturdayOrSunday = selectedWeekday === 'saturday' || selectedWeekday === 'sunday';
  const isWeekdayHoliday = Boolean(holidayName && !isSaturdayOrSunday);
  const isAreaTourDay = isSaturdayOrSunday || isWeekdayHoliday;

  return { holidayName, isAreaTourDay };
}

export function useNrwpHolidayLookupForSelectedKw() {
  const { selectedCalendarWeek } = useCalendarWeekStore();
  const backendIsoYear = new Date().getFullYear();
  const holidayYears = useMemo(
    () => [backendIsoYear - 1, backendIsoYear, backendIsoYear + 1],
    [backendIsoYear]
  );
  const { holidayByYmd } = useNrwpHolidaysForYears(holidayYears);

  const getHolidayName = useCallback(
    (weekday: Weekday) => {
      if (selectedCalendarWeek == null) return null;
      return holidayNameForCalendarWeekday(
        holidayByYmd,
        backendIsoYear,
        selectedCalendarWeek,
        weekday
      );
    },
    [selectedCalendarWeek, holidayByYmd, backendIsoYear]
  );

  return getHolidayName;
}
