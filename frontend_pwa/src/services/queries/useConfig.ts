import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { configApi } from '../api/config';

// Keys für React Query Cache
export const configKeys = {
  all: ['config'] as const,
  googleMapsApiKey: () => [...configKeys.all, 'googleMapsApiKey'] as const,
  lastImportTime: () => [...configKeys.all, 'lastImportTime'] as const,
  nrwpHolidays: (year: number) => [...configKeys.all, 'nrwpHolidays', year] as const,
};

export const useGoogleMapsApiKey = () =>
  useQuery({
    queryKey: configKeys.googleMapsApiKey(),
    queryFn: configApi.getGoogleMapsApiKey,
    staleTime: 1000 * 60 * 60, // 1 Stunde
  });

// Hook zum Laden der letzten Import-Zeit
export const useLastPatientImportTime = () => {
  return useQuery({
    queryKey: configKeys.lastImportTime(),
    queryFn: () => configApi.getLastImportTime(),
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
  });
}; 

/** Map YYYY-MM-DD -> holiday name for NRW (one calendar year). */
export const useNrwpHolidaysMap = (year: number) => {
  const query = useQuery({
    queryKey: configKeys.nrwpHolidays(year),
    queryFn: () => configApi.getHolidays(year),
    staleTime: 1000 * 60 * 60 * 24,
  });
  const map = useMemo(() => {
    const m = new Map<string, string>();
    const list = query.data?.holidays;
    if (!list) return m;
    for (const h of list) {
      m.set(h.date, h.name);
    }
    return m;
  }, [query.data]);
  return { ...query, holidayByYmd: map };
};

/** Merge NRW holidays for several calendar years (KW can cross years). */
export const useNrwpHolidaysForYears = (years: number[]) => {
  const uniqueYears = [...new Set(years)].sort((a, b) => a - b);
  const sortedKey = uniqueYears.join(',');
  const query = useQuery({
    queryKey: [...configKeys.all, 'nrwpHolidaysMulti', sortedKey],
    queryFn: async () => {
      const results = await Promise.all(uniqueYears.map((yr) => configApi.getHolidays(yr)));
      const m = new Map<string, string>();
      for (const r of results) {
        for (const h of r.holidays) {
          m.set(h.date, h.name);
        }
      }
      return m;
    },
    enabled: years.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
  });
  return { ...query, holidayByYmd: query.data ?? new Map<string, string>() };
};