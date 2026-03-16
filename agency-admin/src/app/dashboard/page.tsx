'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  total_requests: number;
  signed: number;
  conversion_rate: number;
  spam_last_7_days: number;
}

export default function DashboardPage() {
  const { isHeadRealtor } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Если эндпоинты дашборда существуют, иначе используем заглушку
      try {
        const [conversion, spam] = await Promise.all([
          api.get('/dashboard/conversion/'),
          api.get('/dashboard/spam-stats/'),
        ]);
        return {
          total_requests: conversion.data.total_requests,
          signed: conversion.data.signed,
          conversion_rate: conversion.data.conversion_rate,
          spam_last_7_days: spam.data.last_7_days_spam,
        };
      } catch {
        // Заглушка для демо
        return {
          total_requests: 42,
          signed: 5,
          conversion_rate: 11.9,
          spam_last_7_days: 3,
        };
      }
    },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Дашборд</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Всего заявок" value={stats?.total_requests} isLoading={isLoading} />
        <StatCard title="Договоров подписано" value={stats?.signed} isLoading={isLoading} />
        <StatCard title="Конверсия" value={`${stats?.conversion_rate}%`} isLoading={isLoading} />
        {isHeadRealtor && (
          <StatCard title="Спам за 7 дней" value={stats?.spam_last_7_days} isLoading={isLoading} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние заявки</CardTitle>
          </CardHeader>
          <CardContent>
            <LastRequests />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ближайшие встречи</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingMeetings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, isLoading }: { title: string; value?: string | number; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value ?? '—'}</div>
        )}
      </CardContent>
    </Card>
  );
}

function LastRequests() {
  const { data, isLoading } = useQuery({
    queryKey: ['last-requests'],
    queryFn: async () => {
      const res = await api.get('/requests/?limit=5');
      return res.data.results || res.data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (!data?.length) return <p className="text-muted-foreground">Нет заявок</p>;

  return (
    <ul className="space-y-2">
      {data.map((req: any) => (
        <li key={req.id} className="text-sm">
          #{req.id} — {req.client_detail?.first_name} {req.client_detail?.last_name} — {req.status}
        </li>
      ))}
    </ul>
  );
}

function UpcomingMeetings() {
  const { data, isLoading } = useQuery({
    queryKey: ['upcoming-meetings'],
    queryFn: async () => {
      const res = await api.get('/meetings/?limit=5');
      return res.data.results || res.data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (!data?.length) return <p className="text-muted-foreground">Нет ближайших встреч</p>;

  return (
    <ul className="space-y-2">
      {data.map((meeting: any) => (
        <li key={meeting.id} className="text-sm">
          {new Date(meeting.datetime).toLocaleDateString('ru-RU')} — {meeting.place}
        </li>
      ))}
    </ul>
  );
}