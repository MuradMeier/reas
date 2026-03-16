'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import api from '@repo/api-client';
import { toast } from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExtendedDataDisplay } from '@/components/ExtendedDataDisplay'; // импортируем компонент для отображения данных

const statusLabels: Record<string, string> = {
  new: 'Новая',
  viewed: 'Просмотрена',
  //call_made: 'Совершён звонок',
  no_answer: 'Не дозвонился',
  callback: 'Перезвонить позже',
  contacted: 'Контакт установлен',
  meeting_scheduled: 'Встреча назначена',
  pending_result: 'Ожидание результата встречи',  // новый
  contract_signed: 'Договор подписан',
  rejected_at_call: 'Отказ на этапе звонка',      // новый
  rejected_at_meeting: 'Отказ на встрече',        // новый
  thinking_after_call: 'Клиент думает (после звонка)',
  thinking_after_meeting: 'Клиент думает (после встречи)',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  viewed: 'bg-gray-100 text-gray-800',
  call_made: 'bg-yellow-100 text-yellow-800',
  no_answer: 'bg-orange-100 text-orange-800',
  callback: 'bg-purple-100 text-purple-800',
  contacted: 'bg-green-100 text-green-800',
  meeting_scheduled: 'bg-indigo-100 text-indigo-800',
  pending_result: 'bg-amber-100 text-amber-800',      // новый цвет
  contract_signed: 'bg-emerald-100 text-emerald-800',
  rejected_at_call: 'bg-red-200 text-red-900',        // новый цвет
  rejected_at_meeting: 'bg-red-300 text-red-900',     // новый цвет
  thinking_after_call: 'bg-pink-100 text-pink-800',
  thinking_after_meeting: 'bg-purple-100 text-purple-800',
};

const purposeLabels: Record<string, string> = {
  buy: 'Купить',
  sell: 'Продать',
  rent: 'Снять',
  lease: 'Сдать',
};

const propertyTypeLabels: Record<string, string> = {
  flat: 'Квартира',
  house: 'Дом',
  land: 'Участок',
  room: 'Комната',
};

const eventTypeLabels: Record<string, string> = {
  view: 'Просмотр',
  call: 'Звонок',
  comment: 'Комментарий',
  meeting_scheduled: 'Встреча назначена',
  meeting_done: 'Встреча состоялась',
  offer: 'Предложение',
  rejected: 'Отказ от встречи',
};

export default function RequestDetailPage() {
  const [showCallResultDialog, setShowCallResultDialog] = useState(false);
  const params = useParams();
  const router = useRouter();
  const handleShowPhone = async () => {
  try {
    await api.post(`/requests/${id}/mark_call/`);
    setShowPhone(true);
    refetch(); // чтобы статус заявки обновился на call_made
  } catch {
    toast.error('Ошибка при открытии номера');
  }
};
  const id = params.id as string;
  const [showPhone, setShowPhone] = useState(false);
  const [newEventType, setNewEventType] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
  mutationFn: async () => {
    await api.delete(`/requests/${id}/`);
  },
  onSuccess: () => {
    toast.success('Заявка удалена');
    router.push('/requests');
  },
  onError: () => toast.error('Ошибка при удалении'),
});
  const { user } = useAuth();
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
  const takeMutation = useMutation({
  mutationFn: async () => {
    await api.post(`/requests/${id}/take/`);
  },
  onSuccess: () => {
    toast.success('Заявка взята в обработку');
    refetch();
  },
  onError: () => toast.error('Ошибка при взятии заявки'),
});
  const addEventMutation = useMutation({
    mutationFn: async (event: { tip_sobytiya: string; opisanie: string }) => {
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

  const handleMarkCall = async () => {
    try {
      await api.post(`/requests/${id}/mark_call/`);
      toast.success('Звонок отмечен');
      setShowCallResultDialog(true);
      refetch();
    } catch {
      toast.error('Ошибка при отметке звонка');
    }
  };

  const handleCallResult = async (result: string) => {
    try {
      await api.post(`/requests/${id}/set_call_result/`, { result });
      toast.success('Результат сохранён');
      setShowCallResultDialog(false);
      refetch();
    } catch {
      toast.error('Ошибка при сохранении результата');
    }
  };

  const handleStatusChange = (value: string) => {
    updateStatusMutation.mutate(value);
  };

  const handleAddEvent = () => {
    if (!newEventType) {
      toast.error('Выберите тип события');
      return;
    }
    addEventMutation.mutate({ tip_sobytiya: newEventType, opisanie: newEventDesc });
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
        <div className="flex gap-2">
          <Link href={`/requests/${id}/edit`}>
            <Button variant="outline">Редактировать</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          {!request.nedvizhimost && (request.purpose === 'sell' || request.purpose === 'lease') && (
            <Link href={`/objects/new?fromRequest=${request.id}&type=${request.property_type}`}>
              <Button>Создать объект</Button>
            </Link>
          )}
          <Button variant="outline" onClick={() => router.back()}>Назад</Button>
        </div>
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
                {request.naznachen ? (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Ответственный:</strong> {request.naznachen_imya}
                    </p>
                    {request.status === 'taken' && request.taken_at && (
                      <p className="text-sm text-muted-foreground">
                        Взято в обработку: {format(new Date(request.taken_at), 'dd.MM.yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                ) : (
                  request.status !== 'taken' && (
                    <div className="mt-4">
                      <Button onClick={() => takeMutation.mutate()} disabled={takeMutation.isPending}>
                        Взять заявку в обработку
                      </Button>
                    </div>
                  )
                )}
                <div>
                  <Label>Цель</Label>
                  <p className="text-sm mt-2">{purposeLabels[request.purpose] || request.purpose}</p>
                </div>
                <div>
                  <Label>Тип объекта</Label>
                  <p className="text-sm mt-2">{propertyTypeLabels[request.property_type] || request.property_type}</p>
                </div>
                <div>
                  <Label>Дата создания</Label>
                  <p className="text-sm mt-2">{request.sozdano ? format(new Date(request.sozdano), 'dd.MM.yyyy HH:mm') : '—'}</p>
                </div>
                <div>
                  <Label>IP-адрес</Label>
                  <p className="text-sm mt-2">{request.ip_adres || '—'}</p>
                </div>
              </div>
              <div>
                <Label>Комментарий клиента</Label>
                <p className="text-sm mt-2">{request.kommentariy_klienta || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Бюджет от</Label>
                  <p className="text-sm mt-2">{request.byudzhet_ot ? `${request.byudzhet_ot} ₽` : '—'}</p>
                </div>
                <div>
                  <Label>Бюджет до</Label>
                  <p className="text-sm mt-2">{request.byudzhet_do ? `${request.byudzhet_do} ₽` : '—'}</p>
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
                {request.sobytiya?.map((event: any) => (
                  <div key={event.id} className="border-l-2 pl-4 py-2">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.sozdano), 'dd.MM.yyyy HH:mm')} — {event.sozdal_imya || 'Система'}
                    </p>
                    <p className="font-medium">{eventTypeLabels[event.tip_sobytiya] || event.tip_sobytiya}</p>
                    {event.opisanie && <p className="text-sm">{event.opisanie}</p>}
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
              {request.klient_detail && (
                <div className="space-y-2">
                  <p><strong>{[request.klient_detail.familiya, request.klient_detail.imya, request.klient_detail.otchestvo].filter(Boolean).join(' ')}</strong></p>
                  <div className="flex items-center gap-2">
                      {showPhone ? (
                        <p>Телефон: {request.klient_detail.telefon}</p>
                      ) : (
                        <Button variant="outline" size="sm" onClick={handleShowPhone}>
                          Показать номер
                        </Button>
                      )}
                    </div>
                  {request.klient_detail.email && <p>Email: {request.klient_detail.email}</p>}
                  <Link href={`/clients/${request.klient_detail.id}`}>
                    <Button variant="outline" size="sm" className="mt-2">Перейти к клиенту</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Объект
              {!request.nedvizhimost && request.extended_data?.object_id && (
  <div className="mt-2">
    <p>Ссылка на объект:</p>
    <Link href={`/objects/${request.extended_data.object_type}/${request.extended_data.object_id}`}>
      <Button variant="outline" size="sm">Перейти к объекту</Button>
    </Link>
  </div>
)}</CardTitle>
            </CardHeader>
            <CardContent>
              {request.nedvizhimost ? (
                <div className="space-y-2">
                  <p>{request.nedvizhimost}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Link href={`/objects/${request.property_type}/${request.id_nedvizhimosti}`}>
                      <Button variant="outline" size="sm">Перейти к объекту</Button>
                    </Link>
                    <Link href={`/objects/${request.property_type}/${request.id_nedvizhimosti}/edit`}>
                      <Button variant="outline" size="sm">Редактировать</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">Объект не создан</p>
                  {request.extended_data && Object.keys(request.extended_data).length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Данные из заявки:</h4>
                      <ExtendedDataDisplay data={request.extended_data} propertyType={request.property_type} />
                    </div>
                  )}
                  {(request.purpose === 'sell' || request.purpose === 'lease') && (
                    <Link href={`/objects/new?fromRequest=${request.id}&type=${request.property_type}`}>
                      <Button variant="outline" size="sm">Создать объект</Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {request.vstrechi?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Встречи</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.vstrechi.map((meeting: any) => (
                    <div key={meeting.id} className="text-sm">
                      <p>{format(new Date(meeting.data_vremya), 'dd.MM.yyyy HH:mm')}</p>
                      <p className="text-muted-foreground">{meeting.mesto}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showCallResultDialog} onOpenChange={setShowCallResultDialog}>
  <DialogContent className="sm:max-w-md bg-white max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Результат звонка</DialogTitle>
    </DialogHeader>
    <div className="grid gap-3 py-4">
      <Button onClick={() => handleCallResult('callback')}>
        Перезвонить позже
      </Button>
      <Button onClick={() => handleCallResult('no_answer')}>
        Не дозвонился
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setShowCallResultDialog(false);
          router.push(`/meetings/new?requestId=${id}`);
        }}
      >
        Назначить встречу
      </Button>
      <Button onClick={() => handleCallResult('thinking_after_call')}>
          Клиент думает
        </Button>
      <Button variant="destructive" onClick={() => handleCallResult('rejected')} className="text-black">
        Отказ
      </Button>
    </div>
  </DialogContent>
</Dialog>
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
      <AlertDialogDescription>
        Заявка будет перемещена в корзину. Главный риэлтор сможет восстановить её или удалить навсегда.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Отмена</AlertDialogCancel>
      <AlertDialogAction onClick={() => deleteMutation.mutate()}>
        Удалить
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
    </div>
  );
}