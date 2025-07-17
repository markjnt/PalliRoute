import { useQuery } from '@tanstack/react-query';
import { configApi } from '../api/config';

export const useGoogleMapsApiKey = () =>
  useQuery({
    queryKey: ['googleMapsApiKey'],
    queryFn: configApi.getGoogleMapsApiKey,
    staleTime: 1000 * 60 * 60, // 1 Stunde
  }); 