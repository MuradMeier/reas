import { useQuery } from '@tanstack/react-query';
import api from '@repo/api-client';

export const useDistricts = (cityId?: string, search?: string) => {
  return useQuery({
    queryKey: ['districts', cityId, search],
    queryFn: async () => {
      if (!cityId && !search) return [];
      const params = new URLSearchParams();
      if (cityId) params.append('city', cityId);
      if (search) params.append('search', search);
      const res = await api.get(`/districts/?${params.toString()}`);
      if (Array.isArray(res.data)) return res.data;
      if (res.data?.results && Array.isArray(res.data.results)) return res.data.results;
      return [];
    },
    enabled: !!(cityId || search),
  });
};
