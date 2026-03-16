import { useQuery } from '@tanstack/react-query';
import api from '@repo/api-client';

export const useRegions = () => {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await api.get('/regions/');
      if (Array.isArray(res.data)) return res.data;
      if (res.data?.results && Array.isArray(res.data.results)) return res.data.results;
      return [];
    },
  });
};
