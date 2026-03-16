// contexts/SettingsContext.tsx
'use client';

import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@repo/api-client';

interface Settings {
  allowed_region_codes: string[];
}

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');

  const { data: settings } = useQuery({
    queryKey: ['region-settings'],
    queryFn: async () => {
      const res = await api.get('/region-settings/1/');
      return res.data;
    },
    enabled: hasToken, // Загружаем только если есть токен
    staleTime: Infinity,
    retry: false, // не повторять при ошибке
  });

  return (
    <SettingsContext.Provider value={settings ?? null}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}