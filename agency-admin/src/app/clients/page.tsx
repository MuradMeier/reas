'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ClientsPage() {
  const [search, setSearch] = useState('');

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get(`/clients/?${params.toString()}`);
      return res.data.results || res.data;
    },
  });

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все клиенты</CardTitle>
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
                  <TableHead>ФИО</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ответственный</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell>#{client.id}</TableCell>
                    <TableCell>{client.last_name} {client.first_name} {client.patronymic}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.email || '—'}</TableCell>
                    <TableCell>{client.responsible_name || '—'}</TableCell>
                    <TableCell>
                      {format(new Date(client.created_at), 'dd.MM.yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/clients/${client.id}`}>
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