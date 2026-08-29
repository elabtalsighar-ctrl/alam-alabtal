import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';
import type { Settings } from '../lib/types';

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  loading: true,
  refresh: async () => {}
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const s = await api.settings();
      setSettings(s as unknown as Settings);
    } catch {
      // keep default
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function whatsappLink(number: string, message: string): string {
  const clean = String(number).replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
