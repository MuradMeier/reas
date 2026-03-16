'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationsBell } from '@/components/NotificationsBell';

export default function Header() {
  const { isHeadRealtor, logout } = useAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold">
          Агентство CRM
        </Link>
        <nav className="flex items-center gap-2">
          {isHeadRealtor && (
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Дашборд</Button>
          </Link>
        )}
          <Link href="/objects">
            <Button variant="ghost" size="sm">Объекты</Button>
          </Link>
          <Link href="/requests">
            <Button variant="ghost" size="sm">Заявки</Button>
          </Link>
          <Link href="/clients">
            <Button variant="ghost" size="sm">Клиенты</Button>
          </Link>
          <Link href="/meetings">
            <Button variant="ghost" size="sm">Встречи</Button>
          </Link>
          {isHeadRealtor && (
            <>
              <Link href="/trash">
                <Button variant="ghost" size="sm">Корзина</Button>
              </Link>
              <Link href="/users">
                <Button variant="ghost" size="sm">Пользователи</Button>
              </Link>
              <Link href="/settings/regions">
                <Button variant="ghost" size="sm">Регионы</Button>
              </Link>
            </>
          )}
          <NotificationsBell />
          <Button variant="ghost" size="sm" onClick={logout}>
            Выход
          </Button>
        </nav>
      </div>
    </header>
  );
}