import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pflegeheimeApi } from '../api/pflegeheime';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';

export const pflegeheimeKeys = {
  all: ['pflegeheime'] as const,
  lists: () => [...pflegeheimeKeys.all, 'list'] as const,
};

export const usePflegeheime = () => {
  return useQuery({
    queryKey: pflegeheimeKeys.lists(),
    queryFn: () => pflegeheimeApi.getAll(),
  });
};

export const useImportPflegeheime = () => {
  const queryClient = useQueryClient();
  const { setLastPflegeheimeImportTime } = useLastUpdateStore();

  return useMutation({
    mutationFn: () => pflegeheimeApi.import(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pflegeheimeKeys.all });
      setLastPflegeheimeImportTime(new Date());
    },
  });
};
