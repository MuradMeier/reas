'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import api from '@repo/api-client';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  groups: number[];
  is_head_realtor: boolean;
  is_realtor: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isHeadRealtor: boolean;
  isRealtor: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/users/me/'); // предполагаем, что такой эндпоинт есть
      const userData = res.data;

      // Определяем роли по группам (ID групп нужно знать)
      const groupIds = userData.groups || [];
      const isHeadRealtor = groupIds.includes(1); // предположим, ID группы "Главный риэлтор" = 1
      const isRealtor = groupIds.includes(2) || isHeadRealtor; // группа "Риэлтор" = 2

      setUser({
        ...userData,
        is_head_realtor: isHeadRealtor,
        is_realtor: isRealtor,
      });
    } catch (error) {
      console.error('Failed to fetch user', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const refreshUser = async () => {
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isHeadRealtor: user?.is_head_realtor || false,
        isRealtor: user?.is_realtor || false,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}