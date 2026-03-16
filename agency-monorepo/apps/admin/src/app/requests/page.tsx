'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus, Trash2 } from 'lucide-react';
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
import api from '@repo/api-client';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DataTable } from '@repo/ui';
import { Badge } from '@/components/ui/badge';
import { QuickRequestModal } from '@/components/modals/QuickRequestModal';
import { toast } from 'react-hot-toast';

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
  taken: 'В обработке',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  viewed: 'bg-gray-100 text-gray-800',
  call_made: 'bg-yellow-100 text-yellow-800',
  no_answer: 'bg-orange-100 text-orange-800',
  callback: 'bg-purple-100 text-purple-800',
  contacted: 'bg-green-100 text-green-800',
  meeting_scheduled: 'bg-indigo-100 text-indigo-800',
  pending_result: 'bg-amber-100 text-amber-800',
  contract_signed: 'bg-emerald-100 text-emerald-800',
  rejected_at_call: 'bg-red-200 text-red-900',
  rejected_at_meeting: 'bg-red-300 text-red-900',
  thinking_after_call: 'bg-pink-100 text-pink-800',
  thinking_after_meeting: 'bg-purple-100 text-purple-800',
  taken: 'bg-orange-100 text-orange-800',
};

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [spamFilter, setSpamFilter] = useState<'all' | 'spam' | 'not_spam'>('not_spam');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { isHeadRealtor } = useAuth();
  const [realtorFilter, setRealtorFilter] = useState('all');
  const { data: realtors } = useQuery({
  queryKey: ['realtors'],
  queryFn: async () => {
    const res = await api.get('/users/?page_size=1000');
    const users = res.data.results || res.data || [];
    // Предполагаем, что у пользователя есть поле groups_detail с названиями групп
        return users.filter((u: any) =>
      u.groups?.some((groupId: number) => groupId === 1 || groupId === 2)
    );
  },
  enabled: isHeadRealtor,
});
  const { data: requests, isLoading } = useQuery({
  queryKey: ['requests', search, statusFilter, spamFilter, purposeFilter, propertyTypeFilter, realtorFilter],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (spamFilter !== 'all') params.append('is_spam', spamFilter === 'spam' ? 'true' : 'false');
    if (purposeFilter !== 'all') params.append('purpose', purposeFilter);
    if (propertyTypeFilter !== 'all') params.append('property_type', propertyTypeFilter);
    if (isHeadRealtor && realtorFilter !== 'all') params.append('naznachen', realtorFilter);
    const res = await api.get(`/requests/?${params.toString()}`);
    return res.data.results || res.data;
  },
});

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/requests/${id}/`);
    },
    onSuccess: () => {
      toast.success('Заявка удалена');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error('Ошибка при удалении');
      setDeleteDialogOpen(false);
    },
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (item: any) => `#${item.id}`,
    },
    {
      key: 'client',
      header: 'Клиент',
      render: (item: any) => {
        const { imya = '', familiya = '', otchestvo = '' } = item.klient_detail || {};
        return [familiya, imya, otchestvo].filter(Boolean).join(' ') || '—';
      },
    },
    {
      key: 'phone',
      header: 'Телефон',
      render: (item: any) => item.klient_detail?.telefon || '—',
    },
    {
      key: 'realty',
      header: 'Объект',
      render: (item: any) => item.nedvizhimost || '—',
    },
    {
      key: 'status',
      header: 'Статус',
      render: (item: any) => (
        <Badge className={statusColors[item.status]}>
          {statusLabels[item.status]}
        </Badge>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Ответственный',
      render: (item: any) => item.naznachen_imya || '—',
    },
    {
      key: 'created_at',
      header: 'Создана',
      render: (item) => (item.sozdano ? format(new Date(item.sozdano), 'dd.MM.yyyy', { locale: ru }) : '—'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (item: any) => (
        <div className="flex justify-end gap-2">
          <Link href={`/requests/${item.id}`}>
            <Button variant="ghost" size="sm">Просмотр</Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(item.id);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Заявки</h1>
        <Button onClick={() => setQuickModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Новая заявка (звонок)
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по клиенту, телефону, комментарию..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={spamFilter} onValueChange={(v: any) => setSpamFilter(v)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Спам" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_spam">Не спам</SelectItem>
            <SelectItem value="spam">Спам</SelectItem>
            <SelectItem value="all">Все</SelectItem>
          </SelectContent>
        </Select>
        <Select value={purposeFilter} onValueChange={setPurposeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Цель" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все цели</SelectItem>
            <SelectItem value="buy">Купить</SelectItem>
            <SelectItem value="sell">Продать</SelectItem>
            <SelectItem value="rent">Снять</SelectItem>
            <SelectItem value="lease">Сдать</SelectItem>
          </SelectContent>
        </Select>
        <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Тип объекта" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="flat">Квартира</SelectItem>
            <SelectItem value="house">Дом</SelectItem>
            <SelectItem value="land">Участок</SelectItem>
            <SelectItem value="room">Комната</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isHeadRealtor && (
  <Select value={realtorFilter} onValueChange={setRealtorFilter}>
    <SelectTrigger className="w-full sm:w-[180px]">
      <SelectValue placeholder="Риэлтор" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Все риэлторы</SelectItem>
      {realtors?.map((realtor: any) => (
        <SelectItem key={realtor.id} value={String(realtor.id)}>
          {realtor.first_name} {realtor.last_name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}

      <Card>
        <CardHeader>
          <CardTitle>Все заявки</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={requests || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <QuickRequestModal open={quickModalOpen} onOpenChange={setQuickModalOpen} />

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId!)}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}