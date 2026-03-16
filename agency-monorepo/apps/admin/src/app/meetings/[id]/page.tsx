'use client';

import { FormInput, FormSelect, FormTextarea } from '@repo/ui';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Form } from '@repo/ui';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@repo/api-client';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';

const meetingSchema = z.object({
  zayavka: z.number().optional(),
  datetime: z.string().min(1, 'Дата и время обязательны'),
  place: z.string().optional(),
  status: z.enum(['planned', 'completed', 'cancelled']).default('planned'),
  comment: z.string().optional(),
  reminder_hours: z.coerce.number().default(24),
});

type MeetingForm = z.infer<typeof meetingSchema>;

const statusLabels: Record<string, string> = {
  planned: 'Запланирована',
  completed: 'Состоялась',
  cancelled: 'Отменена',
};

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId');

  const { data: meeting, isLoading: meetingLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      if (isNew) return null;
      const res = await api.get(`/meetings/${id}/`);
      return res.data;
    },
    enabled: !isNew,
  });

  const { data: request, isLoading: requestLoading } = useQuery({
    queryKey: ['request', requestId],
    queryFn: async () => {
      if (!requestId) return null;
      const res = await api.get(`/requests/${requestId}/`);
      return res.data;
    },
    enabled: !!requestId && isNew,
  });

  // Преобразуем данные встречи в формат формы
  const defaultFormValues = (() => {
    if (!isNew && meeting) {
      return {
        zayavka: meeting.zayavka,
        datetime: meeting.data_vremya ? meeting.data_vremya.slice(0, 16) : '',
        place: meeting.mesto || '',
        status: meeting.status,
        comment: meeting.kommentariy || '',
        reminder_hours: meeting.napominanie_za_chasov || 24,
      };
    }
    if (isNew && requestId) {
      return {
        zayavka: Number(requestId),
        datetime: '',
        place: '',
        status: 'planned',
        comment: '',
        reminder_hours: 24,
      };
    }
    return {
      zayavka: undefined,
      datetime: '',
      place: '',
      status: 'planned',
      comment: '',
      reminder_hours: 24,
    };
  })();

  const form = useForm<MeetingForm>({
    resolver: zodResolver(meetingSchema),
    defaultValues: defaultFormValues,
  });

  const mutation = useMutation({
    mutationFn: async (data: MeetingForm) => {
      const payload = {
        zayavka: data.zayavka,
        data_vremya: data.datetime,
        mesto: data.place,
        status: data.status,
        kommentariy: data.comment,
        napominanie_za_chasov: data.reminder_hours,
      };
      if (isNew) {
        await api.post('/meetings/', payload);
      } else {
        await api.patch(`/meetings/${id}/`, payload);
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
const queryClient = useQueryClient();
  const handleSetMeetingResult = async (result: string) => {
  try {
    await api.post(`/requests/${meeting.zayavka}/set-meeting-result/`, { result });
    toast.success('Результат сохранён');
    queryClient.invalidateQueries({ queryKey: ['meeting', id] });
  } catch {
    toast.error('Ошибка при сохранении результата');
  }
};
  const isLoading = meetingLoading || (isNew && requestLoading);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const clientInfo = isNew
    ? request?.klient_detail
    : meeting?.zayavka_detail?.klient_detail;
  const relatedRequest = isNew ? request : meeting?.zayavka_detail;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isNew ? 'Новая встреча' : `Встреча #${meeting?.id}`}
        </h1>
        <Button variant="outline" onClick={() => router.back()}>Назад</Button>
      </div>

      {(clientInfo || relatedRequest) && (
        <Card>
          <CardHeader>
            <CardTitle>Информация о клиенте и заявке</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {clientInfo && (
              <>
                <p><strong>Клиент:</strong> {[clientInfo.familiya, clientInfo.imya, clientInfo.otchestvo].filter(Boolean).join(' ') || '—'}</p>
                <p><strong>Телефон:</strong> {clientInfo.telefon || '—'}</p>
                {clientInfo.email && <p><strong>Email:</strong> {clientInfo.email}</p>}
              </>
            )}
            {relatedRequest && (
              <p>
                <strong>Заявка #{relatedRequest.id}:</strong>{' '}
                {relatedRequest.purpose === 'buy' ? 'Купить' :
                 relatedRequest.purpose === 'sell' ? 'Продать' :
                 relatedRequest.purpose === 'rent' ? 'Снять' :
                 relatedRequest.purpose === 'lease' ? 'Сдать' : relatedRequest.purpose}
                , {relatedRequest.property_type === 'flat' ? 'Квартира' :
                  relatedRequest.property_type === 'house' ? 'Дом' :
                  relatedRequest.property_type === 'land' ? 'Участок' :
                  relatedRequest.property_type === 'room' ? 'Комната' : relatedRequest.property_type}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Детали встречи</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput control={form.control} name="datetime" label="Дата и время" type="datetime-local" required />
                <FormSelect
                  control={form.control}
                  name="status"
                  label="Статус"
                  options={[
                    { value: 'planned', label: 'Запланирована' },
                    { value: 'completed', label: 'Состоялась' },
                    { value: 'cancelled', label: 'Отменена' }
                  ]}
                  placeholder="Выберите статус"
                />
                <FormInput control={form.control} name="place" label="Место" />
                <FormInput control={form.control} name="reminder_hours" label="Напоминание за (часов)" type="number" />
              </div>
              <FormTextarea control={form.control} name="comment" label="Комментарий" rows={4} />
              {!isNew && meeting && (
                <div className="space-y-2">
                  <Label>Подтверждение клиента</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="confirmed" checked={meeting.klient_podtverdil} disabled />
                      <Label htmlFor="confirmed">Подтверждено</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="rejected" checked={meeting.klient_otkazal} disabled />
                      <Label htmlFor="rejected">Отказ</Label>
                    </div>
                    {meeting.zapros_perenosa && (
                      <Badge variant="outline" className="bg-yellow-50">
                        Запрос на перенос
                      </Badge>
                    )}
                  </div>
                </div>
              )}
          {!isNew && meeting?.status === 'completed' && meeting?.zayavka_detail?.status === 'pending_result' && (
              <div className="space-y-2 mt-4 border-t pt-4">
                <Label>Результат встречи</Label>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSetMeetingResult('contract_signed')}>
                    Договор подписан
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleSetMeetingResult('thinking_after_meeting')}>
                      Клиент думает (после встречи)
                    </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleSetMeetingResult('rejected_at_meeting')}>
                    Отказ
                  </Button>
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