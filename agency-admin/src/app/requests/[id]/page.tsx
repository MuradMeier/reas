'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

const statusLabels: Record<string, string> = {
  new: 'Новая',
  viewed: 'Просмотрена',
  call_made: 'Совершён звонок',
  no_answer: 'Не дозвонился',
  callback: 'Перезвонить позже',
  contacted: 'Контакт установлен',
  meeting_scheduled: 'Встреча назначена',
  contract_signed: 'Договор подписан',
  rejected: 'Отказ',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  viewed: 'bg-gray-100 text-gray-800',
  call_made: 'bg-yellow-100 text-yellow-800',
  no_answer: 'bg-orange-100 text-orange-800',
  callback: 'bg-purple-100 text-purple-800',
  contacted: 'bg-green-100 text-green-800',
  meeting_scheduled: 'bg-indigo-100 text-indigo-800',
  contract_signed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [newEventType, setNewEventType] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { data: request, isLoading, refetch } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const res = await api.get(`/requests/${id}/`);
      return res.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await api.patch(`/requests/${id}/`, { status });
    },
    onSuccess: () => {
      toast.success('Статус обновлён');
      refetch();
    },
    onError: () => toast.error('Ошибка при обновлении статуса'),
  });

  const addEventMutation = useMutation({
    mutationFn: async (event: { event_type: string; description: string }) => {
      await api.post(`/requests/${id}/add_event/`, event);
    },
    onSuccess: () => {
      toast.success('Событие добавлено');
      setNewEventType('');
      setNewEventDesc('');
      refetch();
    },
    onError: () => toast.error('Ошибка при добавлении события'),
  });

  const handleStatusChange = (value: string) => {
    updateStatusMutation.mutate(value);
  };

  const handleAddEvent = () => {
    if (!newEventType) {
      toast.error('Выберите тип события');
      return;
    }
    addEventMutation.mutate({ event_type: newEventType, description: newEventDesc });
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!request) {
    return <div>Заявка не найдена</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Заявка #{request.id}</h1>
        <Button variant="outline" onClick={() => router.back()}>Назад</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Информация о заявке</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Статус</Label>
                  <Select onValueChange={handleStatusChange} defaultValue={request.status}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ответственный</Label>
                  <p className="text-sm mt-2">{request.assigned_to_name || 'Не назначен'}</p>
                </div>
                <div>
                  <Label>Дата создания</Label>
                  <p className="text-sm mt-2">{format(new Date(request.created_at), 'dd.MM.yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label>IP-адрес</Label>
                  <p className="text-sm mt-2">{request.ip_address || '—'}</p>
                </div>
              </div>
              <div>
                <Label>Комментарий клиента</Label>
                <p className="text-sm mt-2">{request.client_comment || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Бюджет от</Label>
                  <p className="text-sm mt-2">{request.budget_from ? `${request.budget_from} ₽` : '—'}</p>
                </div>
                <div>
                  <Label>Бюджет до</Label>
                  <p className="text-sm mt-2">{request.budget_to ? `${request.budget_to} ₽` : '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>История событий</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.events?.map((event: any) => (
                  <div key={event.id} className="border-l-2 pl-4 py-2">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.created_at), 'dd.MM.yyyy HH:mm')} — {event.created_by_name}
                    </p>
                    <p className="font-medium">{event.get_event_type_display}</p>
                    {event.description && <p className="text-sm">{event.description}</p>}
                  </div>
                ))}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Добавить событие</h4>
                  <div className="space-y-2">
                    <Select onValueChange={setNewEventType} value={newEventType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Тип события" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Звонок</SelectItem>
                        <SelectItem value="comment">Комментарий</SelectItem>
                        <SelectItem value="meeting_scheduled">Встреча назначена</SelectItem>
                        <SelectItem value="offer">Предложение</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Описание"
                      value={newEventDesc}
                      onChange={(e) => setNewEventDesc(e.target.value)}
                    />
                    <Button onClick={handleAddEvent} disabled={addEventMutation.isPending}>
                      Добавить событие
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Клиент</CardTitle>
            </CardHeader>
            <CardContent>
              {request.client_detail && (
                <div className="space-y-2">
                  <p><strong>{request.client_detail.first_name} {request.client_detail.last_name}</strong></p>
                  <p>Телефон: {request.client_detail.phone}</p>
                  {request.client_detail.email && <p>Email: {request.client_detail.email}</p>}
                  <Link href={`/clients/${request.client_detail.id}`}>
                    <Button variant="outline" size="sm" className="mt-2">Перейти к клиенту</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Объект</CardTitle>
            </CardHeader>
            <CardContent>
              {request.realty ? (
                <p>{request.realty}</p>
              ) : (
                <p className="text-muted-foreground">Не указан</p>
              )}
            </CardContent>
          </Card>

          {request.meetings?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Встречи</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.meetings.map((meeting: any) => (
                    <div key={meeting.id} className="text-sm">
                      <p>{format(new Date(meeting.datetime), 'dd.MM.yyyy HH:mm')}</p>
                      <p className="text-muted-foreground">{meeting.place}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}