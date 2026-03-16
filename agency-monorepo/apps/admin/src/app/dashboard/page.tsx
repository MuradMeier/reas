'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@repo/api-client';

// Вспомогательный компонент для карточки статистики
const StatCard = ({ title, value, isLoading }: { title: string; value?: string | number; isLoading: boolean }) => (
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

// Форматирование даты для input type="date"
const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];

export default function DashboardPage() {
  const { isHeadRealtor, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Фильтры
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(formatDateForInput(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatDateForInput(today));
  const [realtorFilter, setRealtorFilter] = useState('all');

  // Загрузка списка пользователей (для фильтра по риэлторам)
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users/?page_size=1000');
      return res.data.results || res.data || [];
    },
    enabled: isHeadRealtor,
  });

  // Фильтруем только риэлторов (группа "Риэлтор" или "Главный риэлтор")
  const realtors = users?.filter((user: any) =>
    user.groups_detail?.some((g: any) => g.name === 'Риэлтор' || g.name === 'Главный риэлтор')
  ) || [];

  // Общая сводка
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary', startDate, endDate, realtorFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (realtorFilter !== 'all') params.append('realtor_id', realtorFilter);
      const res = await api.get(`/dashboard/summary/?${params.toString()}`);
      return res.data;
    },
    enabled: isHeadRealtor,
  });

  // Заявки по статусам
  const { data: requestsByStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['dashboard-requests-by-status', startDate, endDate, realtorFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (realtorFilter !== 'all') params.append('realtor_id', realtorFilter);
      const res = await api.get(`/dashboard/requests_by_status/?${params.toString()}`);
      return res.data;
    },
    enabled: isHeadRealtor,
  });

  // Активность риэлторов
  const { data: realtorActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-realtor-activity', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const res = await api.get(`/dashboard/realtor_activity/?${params.toString()}`);
      return res.data;
    },
    enabled: isHeadRealtor,
  });

  // Динамика заявок по дням (последние 30 дней)
  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['dashboard-timeline', realtorFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('days', '30');
      if (realtorFilter !== 'all') params.append('realtor_id', realtorFilter);
      const res = await api.get(`/dashboard/requests_timeline/?${params.toString()}`);
      return res.data;
    },
    enabled: isHeadRealtor,
  });

  // Топ риэлторов по сделкам
  const { data: topRealtors, isLoading: topLoading } = useQuery({
    queryKey: ['dashboard-top-realtors', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('limit', '5');
      const res = await api.get(`/dashboard/top_realtors/?${params.toString()}`);
      return res.data;
    },
    enabled: isHeadRealtor,
  });

  // Перенаправление, если не главный риэлтор
  useEffect(() => {
    if (!authLoading && !isHeadRealtor) {
      router.push('/');
    }
  }, [authLoading, isHeadRealtor, router]);

  if (authLoading || !isHeadRealtor) return null;

  const statusLabels: Record<string, string> = {
    new: 'Новая',
    viewed: 'Просмотрена',
    call_made: 'Совершён звонок',
    no_answer: 'Не дозвонился',
    callback: 'Перезвонить позже',
    contacted: 'Контакт установлен',
    meeting_scheduled: 'Встреча назначена',
    pending_result: 'Ожидание результата встречи',
    contract_signed: 'Договор подписан',
    rejected_at_call: 'Отказ на этапе звонка',
    rejected_at_meeting: 'Отказ на встрече',
    thinking_after_call: 'Клиент думает (после звонка)',
    thinking_after_meeting: 'Клиент думает (после встречи)',
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Дашборд</h1>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-4 items-end bg-muted p-4 rounded-lg">
        <div className="space-y-2">
          <Label>Дата с</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Дата по</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-2 min-w-[200px]">
          <Label>Риэлтор</Label>
          <Select value={realtorFilter} onValueChange={setRealtorFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Все риэлторы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все риэлторы</SelectItem>
              {realtors.map((realtor: any) => (
                <SelectItem key={realtor.id} value={String(realtor.id)}>
                  {realtor.first_name} {realtor.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => {
          setStartDate(formatDateForInput(thirtyDaysAgo));
          setEndDate(formatDateForInput(today));
          setRealtorFilter('all');
        }}>
          Сбросить
        </Button>
      </div>

      {/* Карточки общей сводки */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Всего заявок" value={summary?.total_requests} isLoading={summaryLoading} />
        <StatCard title="Договоров подписано" value={summary?.signed} isLoading={summaryLoading} />
        <StatCard title="Конверсия" value={summary?.conversion ? `${summary.conversion}%` : '—'} isLoading={summaryLoading} />
        <StatCard title="Спам" value={summary?.spam} isLoading={summaryLoading} />
      </div>

      {/* Две колонки: статусы и топ риэлторов */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Заявки по статусам</CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : requestsByStatus?.length ? (
              <ul className="space-y-2">
                {requestsByStatus.map((item: any) => (
                  <li key={item.status} className="flex justify-between text-sm">
                    <span>{statusLabels[item.status] || item.status}</span>
                    <span className="font-medium">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Нет данных</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Топ риэлторов по сделкам</CardTitle>
          </CardHeader>
          <CardContent>
            {topLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : topRealtors?.length ? (
              <ul className="space-y-2">
                {topRealtors.map((realtor: any) => (
                  <li key={realtor.realtor_id} className="flex justify-between text-sm">
                    <span>{realtor.realtor_name}</span>
                    <span className="font-medium">{realtor.signed}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Нет данных</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Динамика заявок (простой вывод) */}
      <Card>
        <CardHeader>
          <CardTitle>Динамика заявок (последние 30 дней)</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : timeline?.length ? (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {timeline.map((item: any) => (
                <div key={item.date} className="flex justify-between text-sm">
                  <span>{item.date}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Нет данных</p>
          )}
        </CardContent>
      </Card>

      {/* Активность риэлторов (таблица) */}
      <Card>
        <CardHeader>
          <CardTitle>Активность риэлторов</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : realtorActivity?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Риэлтор</th>
                    <th className="text-left py-2">Заявок</th>
                    <th className="text-left py-2">Встреч</th>
                    <th className="text-left py-2">Событий</th>
                    <th className="text-left py-2">Сделок</th>
                  </tr>
                </thead>
                <tbody>
                  {realtorActivity.map((realtor: any) => (
                    <tr key={realtor.realtor_id} className="border-b">
                      <td className="py-2">{realtor.realtor_name}</td>
                      <td className="py-2">{realtor.requests_assigned}</td>
                      <td className="py-2">{realtor.meetings_created}</td>
                      <td className="py-2">{realtor.events_created}</td>
                      <td className="py-2">{realtor.deals_signed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">Нет данных</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}