'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, CalendarPlus } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
  const [search, setSearch] = useState('');

  const { data: meetings, isLoading } = useQuery({
    queryKey: ['meetings', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get(`/meetings/?${params.toString()}`);
      return res.data.results || res.data;
    },
  });

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все встречи</CardTitle>
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
                  <TableHead>Дата и время</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Заявка</TableHead>
                  <TableHead>Место</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Подтверждение</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings?.map((meeting: any) => (
                  <TableRow key={meeting.id}>
                    <TableCell>
                      {format(new Date(meeting.datetime), 'dd.MM.yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {meeting.request?.client?.first_name} {meeting.request?.client?.last_name}
                    </TableCell>
                    <TableCell>#{meeting.request?.id}</TableCell>
                    <TableCell>{meeting.place || '—'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[meeting.status]}>
                        {statusLabels[meeting.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {meeting.client_confirmed && (
                        <Badge variant="outline" className="bg-green-50">Подтверждено</Badge>
                      )}
                      {meeting.client_rejected && (
                        <Badge variant="outline" className="bg-red-50">Отказ</Badge>
                      )}
                      {meeting.reschedule_request && (
                        <Badge variant="outline" className="bg-yellow-50">Запрос переноса</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/meetings/${meeting.id}`}>
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