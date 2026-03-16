'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import api from '@repo/api-client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect } from 'react';

const clientSchema = z.object({
  full_name: z.string().min(2, 'Введите ФИО'),
  phone: z.string().min(10, 'Введите корректный телефон'),
  email: z.string().email('Неверный email').optional().or(z.literal('')),
  comment: z.string().optional(),
  notification_enabled: z.boolean().default(false),
});

type ClientForm = z.infer<typeof clientSchema>;

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const { data: client, isLoading, refetch } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (isNew) return null;
      const res = await api.get(`/clients/${id}/`);
      return res.data;
    },
    enabled: !isNew,
  });

  const form = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      comment: '',
      notification_enabled: false,
    },
  });

  // Заполняем форму данными клиента (объединяем фамилию, имя, отчество в одно поле)
  useEffect(() => {
    if (client) {
      form.reset({
        full_name: [client.familiya, client.imya, client.otchestvo].filter(Boolean).join(' ') || '',
        phone: client.telefon || '',
        email: client.email || '',
        comment: client.kommentariy || '',
        notification_enabled: client.uvedomleniya_vklyucheny || false,
      });
    }
  }, [client, form]);

  const mutation = useMutation({
    mutationFn: async (data: ClientForm) => {
      const payload = {
        imya: data.full_name,        // сохраняем полное имя в поле imya
        familiya: '',
        otchestvo: '',
        telefon: data.phone,
        email: data.email,
        kommentariy: data.comment,
        uvedomleniya_vklyucheny: data.notification_enabled,
      };
      if (isNew) {
        await api.post('/clients/', payload);
      } else {
        await api.patch(`/clients/${id}/`, payload);
      }
    },
    onSuccess: () => {
      toast.success(isNew ? 'Клиент создан' : 'Клиент обновлён');
      if (isNew) {
        router.push('/clients');
      } else {
        refetch();
      }
    },
    onError: () => toast.error('Ошибка при сохранении'),
  });

  const onSubmit = (data: ClientForm) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isNew ? 'Новый клиент' : `Клиент #${client?.id}`}
        </h1>
        <Button variant="outline" onClick={() => router.back()}>Назад</Button>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Информация</TabsTrigger>
          {!isNew && (
            <>
              <TabsTrigger value="requests">Заявки</TabsTrigger>
              <TabsTrigger value="meetings">Встречи</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Основные данные</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>ФИО *</FormLabel>
                          <FormControl>
                            <Input placeholder="Иванов Иван Иванович" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Телефон *</FormLabel>
                          <FormControl>
                            <Input placeholder="+7 (999) 999-99-99" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name="notification_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Получать уведомления</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Комментарий</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-4">
                    <Button type="submit" disabled={mutation.isPending}>
                      Сохранить
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {!isNew && (
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Заявки клиента</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientRequests clientId={client?.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {!isNew && (
          <TabsContent value="meetings">
            <Card>
              <CardHeader>
                <CardTitle>Встречи клиента</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientMeetings clientId={client?.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Запросы клиента
function ClientRequests({ clientId }: { clientId: number }) {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['client-requests', clientId],
    queryFn: async () => {
      const res = await api.get(`/requests/?klient=${clientId}`);
      return res.data.results || res.data;
    },
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  if (!requests?.length) {
    return <p className="text-muted-foreground">У клиента нет заявок</p>;
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd.MM.yyyy');
    } catch {
      return '—';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Объект</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Создана</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req: any) => (
          <TableRow key={req.id}>
            <TableCell>#{req.id}</TableCell>
            <TableCell>{req.nedvizhimost || '—'}</TableCell>
            <TableCell>
              <Badge variant="outline">{req.status}</Badge>
            </TableCell>
            <TableCell>{formatDate(req.sozdano)}</TableCell>
            <TableCell className="text-right">
              <Link href={`/requests/${req.id}`}>
                <Button variant="ghost" size="sm">Перейти</Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Встречи клиента
function ClientMeetings({ clientId }: { clientId: number }) {
  // сначала получаем заявки клиента
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['client-requests-for-meetings', clientId],
    queryFn: async () => {
      const res = await api.get(`/requests/?klient=${clientId}`);
      return res.data.results || res.data;
    },
  });

  const requestIds = requests?.map((r: any) => r.id) || [];

  // затем получаем все встречи и фильтруем по заявкам клиента
  const { data: meetings, isLoading: meetingsLoading } = useQuery({
    queryKey: ['all-meetings'],
    queryFn: async () => {
      const res = await api.get('/meetings/');
      return res.data.results || res.data;
    },
  });

  const filteredMeetings = meetings?.filter((m: any) => requestIds.includes(m.zayavka)) || [];

  const isLoading = requestsLoading || meetingsLoading;

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  if (filteredMeetings.length === 0) {
    return <p className="text-muted-foreground">У клиента нет встреч</p>;
  }

  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd.MM.yyyy HH:mm');
    } catch {
      return '—';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Дата и время</TableHead>
          <TableHead>Место</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredMeetings.map((meeting: any) => (
          <TableRow key={meeting.id}>
            <TableCell>{formatDateTime(meeting.data_vremya)}</TableCell>
            <TableCell>{meeting.mesto || '—'}</TableCell>
            <TableCell>
              <Badge variant="outline">{meeting.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/meetings/${meeting.id}`}>
                <Button variant="ghost" size="sm">Перейти</Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}