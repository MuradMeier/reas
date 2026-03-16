'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, CalendarPlus, Trash2 } from 'lucide-react';
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
import { DataTable } from '@repo/ui';
import api from '@repo/api-client';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  planned: 'Запланирована',
  completed: 'Состоялась',
  cancelled: 'Отменена',
};

export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [realtorFilter, setRealtorFilter] = useState('all');
  const { isHeadRealtor } = useAuth();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Запрос списка пользователей (для главного)
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users/?page_size=1000');
      return res.data.results || res.data || [];
    },
    enabled: isHeadRealtor,
  });

  const realtors = users?.filter((user: any) =>
    user.groups?.some((g: number) => g === 1 || g === 2) // ID групп главного и обычного риэлтора
  ) || [];

  const { data: meetings, isLoading } = useQuery({
    queryKey: ['meetings', search, statusFilter, realtorFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (isHeadRealtor && realtorFilter !== 'all') params.append('sozdal', realtorFilter);
      const res = await api.get(`/meetings/?${params.toString()}`);
      return res.data.results || res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/meetings/${id}/`);
    },
    onSuccess: () => {
      toast.success('Встреча удалена');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error('Ошибка при удалении');
      setDeleteDialogOpen(false);
    },
  });

  const getColumns = (isHead: boolean) => [
    {
      key: 'datetime',
      header: 'Дата и время',
      render: (meeting: any) => {
        if (!meeting.data_vremya) return '—';
        try {
          return format(new Date(meeting.data_vremya), 'dd.MM.yyyy HH:mm');
        } catch {
          return '—';
        }
      },
    },
    {
      key: 'client',
      header: 'Клиент',
      render: (meeting: any) => {
        const client = meeting.zayavka_detail?.klient_detail;
        if (!client) return '—';
        return [client.familiya, client.imya, client.otchestvo].filter(Boolean).join(' ') || '—';
      },
    },
    ...(isHead ? [{
      key: 'created_by',
      header: 'Риэлтор',
      render: (meeting: any) => meeting.sozdal_imya || '—',
    }] : []),
    {
      key: 'place',
      header: 'Место',
      render: (meeting: any) => meeting.mesto || '—',
    },
    {
      key: 'status',
      header: 'Статус',
      render: (meeting: any) => (
        <Badge className={statusColors[meeting.status]}>
          {statusLabels[meeting.status]}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (meeting: any) => (
        <div className="flex justify-end gap-2">
          <Link href={`/meetings/${meeting.id}`}>
            <Button variant="ghost" size="sm">Просмотр</Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(meeting.id);
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
        <h1 className="text-3xl font-bold">Встречи</h1>
        <Link href="/meetings/new">
          <Button>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Назначить встречу
          </Button>
        </Link>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по клиенту, месту..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="planned">Запланирована</SelectItem>
            <SelectItem value="completed">Состоялась</SelectItem>
            <SelectItem value="cancelled">Отменена</SelectItem>
          </SelectContent>
        </Select>

        {isHeadRealtor && (
          <Select value={realtorFilter} onValueChange={setRealtorFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Риэлтор" />
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
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все встречи</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={getColumns(isHeadRealtor)} data={meetings || []} isLoading={isLoading} />
        </CardContent>
      </Card>

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