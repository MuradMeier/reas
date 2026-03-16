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
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const meetingSchema = z.object({
  request: z.number().optional(),
  datetime: z.string().min(1, 'Дата и время обязательны'),
  place: z.string().optional(),
  status: z.enum(['planned', 'completed', 'cancelled']).default('planned'),
  comment: z.string().optional(),
  reminder_hours: z.number().default(24),
});

type MeetingForm = z.infer<typeof meetingSchema>;

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      if (isNew) return null;
      const res = await api.get(`/meetings/${id}/`);
      return res.data;
    },
    enabled: !isNew,
  });

  const form = useForm<MeetingForm>({
    resolver: zodResolver(meetingSchema),
    defaultValues: meeting || {
      datetime: '',
      place: '',
      status: 'planned',
      comment: '',
      reminder_hours: 24,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: MeetingForm) => {
      if (isNew) {
        await api.post('/meetings/', data);
      } else {
        await api.patch(`/meetings/${id}/`, data);
      }
    },
    onSuccess: () => {
      toast.success(isNew ? 'Встреча создана' : 'Встреча обновлена');
      router.push('/meetings');
    },
    onError: () => toast.error('Ошибка при сохранении'),
  });

  const onSubmit = (data: MeetingForm) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isNew ? 'Новая встреча' : `Встреча #${meeting?.id}`}
        </h1>
        <Button variant="outline" onClick={() => router.back()}>Назад</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Детали встречи</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="datetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата и время *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите статус" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planned">Запланирована</SelectItem>
                          <SelectItem value="completed">Состоялась</SelectItem>
                          <SelectItem value="cancelled">Отменена</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="place"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Место</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reminder_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Напоминание за (часов)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              {!isNew && (
                <div className="space-y-2">
                  <Label>Подтверждение клиента</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="confirmed" checked={meeting?.client_confirmed} disabled />
                      <Label htmlFor="confirmed">Подтверждено</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="rejected" checked={meeting?.client_rejected} disabled />
                      <Label htmlFor="rejected">Отказ</Label>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-4">
                <Button type="submit" disabled={mutation.isPending}>
                  Сохранить
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}