'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@repo/api-client';
import { toast } from 'react-hot-toast';

interface MeetingInfo {
  id: number;
  datetime: string;
  place: string;
  comment: string;
  request: {
    id: number;
    client: {
      first_name: string;
      last_name: string;
    };
  };
}

export default function ConfirmMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [rescheduleComment, setRescheduleComment] = useState('');

  const { data: meeting, isLoading, error } = useQuery<MeetingInfo>({
    queryKey: ['meeting', token],
    queryFn: async () => {
      const res = await api.get(`/meeting/confirm/${token}/`);
      return res.data;
    },
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: string; data?: any }) => {
      const res = await api.post(`/meeting/confirm/${token}/`, { action, ...data });
      return res.data;
    },
    onSuccess: (data, variables) => {
      const messages = {
        confirm: 'Встреча подтверждена',
        reject: 'Вы отказались от встречи',
        reschedule: 'Запрос на перенос отправлен',
      };
      toast.success(messages[variables.action as keyof typeof messages]);
      setTimeout(() => router.push('/'), 2000);
    },
    onError: () => {
      toast.error('Произошла ошибка. Попробуйте позже.');
    },
  });

  const handleConfirm = () => mutation.mutate({ action: 'confirm' });
  const handleReject = () => mutation.mutate({ action: 'reject' });

  const handleReschedule = () => {
    if (!newDate) {
      toast.error('Выберите дату');
      return;
    }
    const newDateTime = `${newDate}T${newTime}:00`;
    mutation.mutate({
      action: 'reschedule',
      data: {
        new_datetime: newDateTime,
        comment: rescheduleComment,
      },
    });
    setShowRescheduleDialog(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-4">Ссылка недействительна или истекла</h1>
        <Button onClick={() => router.push('/')}>Вернуться на главную</Button>
      </div>
    );
  }

  const meetingDate = new Date(meeting.datetime);
  const formattedDate = format(meetingDate, 'd MMMM yyyy', { locale: ru });
  const formattedTime = format(meetingDate, 'HH:mm');

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Подтверждение встречи</CardTitle>
          <CardDescription>
            Здравствуйте, {meeting.request.client.first_name} {meeting.request.client.last_name}!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-lg font-medium">Детали встречи</p>
            <p><strong>Дата:</strong> {formattedDate}</p>
            <p><strong>Время:</strong> {formattedTime}</p>
            <p><strong>Место:</strong> {meeting.place || 'не указано'}</p>
            {meeting.comment && <p><strong>Комментарий:</strong> {meeting.comment}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleConfirm} disabled={mutation.isPending} className="flex-1">
            Подтвердить
          </Button>
          <Button variant="outline" onClick={() => setShowRescheduleDialog(true)} disabled={mutation.isPending} className="flex-1">
            Перенести
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={mutation.isPending} className="flex-1">
            Отказаться
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перенос встречи</DialogTitle>
            <DialogDescription>
              Выберите новую дату и время, а также оставьте комментарий (необязательно).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDate">Новая дата</Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newTime">Новое время</Label>
              <Input
                id="newTime"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Комментарий</Label>
              <Textarea
                id="comment"
                placeholder="Например, причина переноса"
                value={rescheduleComment}
                onChange={(e) => setRescheduleComment(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleReschedule} disabled={mutation.isPending}>
              Отправить запрос
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}