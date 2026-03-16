'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, UserPlus, Trash2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';

interface Client {
  id: number;
  imya: string;
  familiya: string;
  otchestvo: string;
  telefon: string;
  email: string;
  otvetstvennyi: number | null;
  sozdano: string;
}

const columns = (handleDeleteClick: (id: number) => void) => [
  {
    key: 'id',
    header: 'ID',
    render: (client: Client) => `#${client.id}`,
  },
  {
    key: 'fullName',
    header: 'ФИО',
    render: (client: Client) => {
      const parts = [client.familiya, client.imya, client.otchestvo].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : '—';
    },
  },
  {
    key: 'telefon',
    header: 'Телефон',
    render: (client: Client) => client.telefon || '—',
  },
  {
    key: 'email',
    header: 'Email',
    render: (client: Client) => client.email || '—',
  },
  {
    key: 'sozdano',
    header: 'Создан',
    render: (client: Client) => client.sozdano ? format(new Date(client.sozdano), 'dd.MM.yyyy', { locale: ru }) : '—',
  },
  {
    key: 'actions',
    header: '',
    className: 'text-right',
    render: (client: Client) => (
      <div className="flex justify-end gap-2">
        <Link href={`/clients/${client.id}`}>
          <Button variant="ghost" size="sm">Просмотр</Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(client.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    ),
  },
];

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { isHeadRealtor } = useAuth();
  const [realtorFilter, setRealtorFilter] = useState('all');
  const { data: realtors } = useQuery({
    queryKey: ['realtors'],
    queryFn: async () => {
      const res = await api.get('/users/?page_size=1000');
      const users = res.data.results || res.data || [];
      return users.filter((u: any) =>
        u.groups?.some((g: any) => g === 1 || g === 2)  // предполагаем ID групп
      );
    },
    enabled: isHeadRealtor,
  });

    const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', search, realtorFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (isHeadRealtor && realtorFilter !== 'all') params.append('otvetstvennyi', realtorFilter);
      const res = await api.get(`/clients/?${params.toString()}`);
      return res.data.results || res.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/clients/${id}/`);
    },
    onSuccess: () => {
      toast.success('Клиент удалён');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error('Ошибка при удалении');
      setDeleteDialogOpen(false);
    },
  });

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Клиенты</h1>
        <Link href="/clients/new">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Добавить клиента
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, телефону, email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
                {isHeadRealtor && (
          <Select value={realtorFilter} onValueChange={setRealtorFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Ответственный" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {realtors?.map((realtor: any) => (
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
          <CardTitle>Все клиенты</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns(handleDeleteClick)}
            data={clients || []}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

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