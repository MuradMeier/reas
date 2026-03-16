import { useQuery } from '@tanstack/react-query';
import api from '@repo/api-client';

export const useCities = (regionId?: string, search?: string) => {
  return useQuery({
    queryKey: ['cities', regionId, search],
    queryFn: async () => {
      if (!regionId && !search) return [];
      const params = new URLSearchParams();
      if (regionId) params.append('region', regionId);
      if (search) params.append('search', search);
      const res = await api.get(`/cities/?${params.toString()}`);
      if (Array.isArray(res.data)) return res.data;
      if (res.data?.results && Array.isArray(res.data.results)) return res.data.results;
      return [];
    },
    enabled: !!(regionId || search),
  });
};
