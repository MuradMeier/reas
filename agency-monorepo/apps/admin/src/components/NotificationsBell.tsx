'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '@repo/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

interface Notification {
  id: number;
  tip: string;
  soobshchenie: string;
  ssylka: string;
  prochitano: boolean;
  sozdano: string;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Проверяем наличие токена (только на клиенте)
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications/?prochitano=false');
      return res.data.results || res.data;
    },
    refetchInterval: 30000, // обновление каждые 30 секунд
    enabled: hasToken, // не выполняем запрос, если пользователь не авторизован
  });

  const unreadCount = notifications.filter(n => !n.prochitano).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/notifications/${id}/mark_read/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleMarkAllRead = async () => {
    // можно добавить отдельный эндпоинт для массового прочтения, пока просто по одному
    const unreadIds = notifications.filter(n => !n.prochitano).map(n => n.id);
    await Promise.all(unreadIds.map(id => markAsReadMutation.mutateAsync(id)));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h4 className="font-semibold">Уведомления</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Прочитать все
            </Button>
          )}
        </div>
        <Separator />
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Загрузка...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">Нет уведомлений</div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-2 rounded-md hover:bg-accent cursor-pointer ${
                    !notification.prochitano ? 'bg-accent/50' : ''
                  }`}
                  onClick={() => {
                    if (!notification.prochitano) {
                      markAsReadMutation.mutate(notification.id);
                    }
                    if (notification.ssylka) {
                      window.location.href = notification.ssylka;
                    }
                  }}
                >
                  <p className="text-sm">{notification.soobshchenie}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(notification.sozdano), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}