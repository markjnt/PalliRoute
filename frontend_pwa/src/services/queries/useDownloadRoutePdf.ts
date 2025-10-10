import { useMutation } from '@tanstack/react-query';
import { routesApi } from '../api/routes';

interface DownloadRoutePdfParams {
  employeeId?: number;
  area?: string;
  calendarWeek: number;
}

export const useDownloadRoutePdf = () => {
  return useMutation({
    mutationFn: async (params: DownloadRoutePdfParams) => {
      return await routesApi.downloadRoutePdf(params);
    },
    onSuccess: ({ blob, filename }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Failed to download route PDF:', error);
    },
  });
};

