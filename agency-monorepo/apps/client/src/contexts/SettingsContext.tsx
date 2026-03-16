'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import api from '@repo/api-client';

interface Settings {
  allowed_region_codes: string[];
}

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const fetchSettings = async () => {
      try {
        const res = await api.get('/region-settings/1/');
        if (isMounted.current) {
          setSettings(res.data);
        }
      } catch (error) {
        if (isMounted.current) {
          console.error('Failed to load settings', error);
        }
      }
    };
    fetchSettings();
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}