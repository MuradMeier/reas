import { useQuery } from '@tanstack/react-query';
import api from '@repo/api-client';

export interface AddressParts {
  city?: string;
  street?: string;
  house?: string;
  korpus?: string;
  stroenie?: string;
}

export function useHouseLookup(address: AddressParts | null) {
  return useQuery({
    queryKey: ['houseLookup', address],
    queryFn: async () => {
      if (!address || !address.city || !address.street || !address.house) {
        return null;
      }
      const params = new URLSearchParams({
        gorod_tekst: address.city,
        ulitsa: address.street,
        nomer_doma: address.house,
      });
      if (address.korpus) params.append('korpus', address.korpus);
      if (address.stroenie) params.append('stroenie', address.stroenie);

      const res = await api.get(`/apartments/?${params.toString()}`);
      const results = res.data.results || res.data || [];
      return results[0] || null;
    },
    enabled: !!(address?.city && address?.street && address?.house),
  });
}
