'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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

export default function RequestsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [spamFilter, setSpamFilter] = useState<'all' | 'spam' | 'not_spam'>('not_spam');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests', search, statusFilter, spamFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (spamFilter !== 'all') params.append('is_spam', spamFilter === 'spam' ? 'true' : 'false');
      const res = await api.get(`/requests/?${params.toString()}`);
      return res.data.results || res.data;
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Заявки</h1>
      </div>

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все заявки</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Объект</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Ответственный</TableHead>
                  <TableHead>Создана</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((req: any) => (
                  <TableRow key={req.id} className={req.is_spam ? 'opacity-50' : ''}>
                    <TableCell>#{req.id}</TableCell>
                    <TableCell>{req.client_detail?.first_name} {req.client_detail?.last_name}</TableCell>
                    <TableCell>{req.client_detail?.phone}</TableCell>
                    <TableCell>{req.realty || '—'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[req.status]}>
                        {statusLabels[req.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{req.assigned_to_name || '—'}</TableCell>
                    <TableCell>
                      {format(new Date(req.created_at), 'dd.MM.yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/requests/${req.id}`}>
                        <Button variant="ghost" size="sm">Просмотр</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}