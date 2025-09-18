import { useQuery } from '@tanstack/react-query';
import { configApi } from '../api/config';

// Keys für React Query Cache
export const configKeys = {
  all: ['config'] as const,
  googleMapsApiKey: () => [...configKeys.all, 'googleMapsApiKey'] as const,
  lastImportTime: () => [...configKeys.all, 'lastImportTime'] as const,
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