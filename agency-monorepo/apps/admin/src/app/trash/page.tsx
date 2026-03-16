'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@repo/api-client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export default function TrashPage() {
  const { isHeadRealtor, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const { data: trash, isLoading, refetch } = useQuery({
    queryKey: ['trash'],
    queryFn: async () => {
      const res = await api.get('/trash/');
      return res.data.results || res.data;
    },
    enabled: isHeadRealtor,
  });

  const typeMapping: Record<string, string> = {
  'Заявка': 'request',
  'Клиент': 'client',
  'Встреча': 'meeting',
  'Квартира': 'flat',
  'Дом': 'detachedhouse',
  'Участок': 'landplot',
  'Комната': 'room',
};

const handleRestore = async (type: string, id: number) => {
  try {
    const typeKey = typeMapping[type];
    if (!typeKey) {
      toast.error('Неизвестный тип объекта');
      return;
    }
    await api.post(`/trash/restore/${typeKey}/${id}/`);
    toast.success('Восстановлено');
    refetch();
  } catch {
    toast.error('Ошибка при восстановлении');
  }
};

const handleHardDelete = async (type: string, id: number) => {
  if (!confirm('Удалить навсегда? Это действие нельзя отменить.')) return;
  try {
    const typeKey = typeMapping[type];
    if (!typeKey) {
      toast.error('Неизвестный тип объекта');
      return;
    }
    await api.post(`/trash/hard-delete/${typeKey}/${id}/`);
    toast.success('Удалено навсегда');
    refetch();
  } catch {
    toast.error('Ошибка при удалении');
  }
};

  useEffect(() => {
    if (!authLoading && !isHeadRealtor) {
      router.push('/dashboard');
    }
  }, [authLoading, isHeadRealtor, router]);

  if (authLoading || !isHeadRealtor) return null;
  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Корзина</h1>
      <Card>
        <CardHeader>
          <CardTitle>Удалённые объекты</CardTitle>
        </CardHeader>
        <CardContent>
          {trash?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Объект</TableHead>
                  <TableHead>Дата удаления</TableHead>
                  <TableHead>Удалил</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trash.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>#{item.id}</TableCell>
                    <TableCell>{item.tip_obekta}</TableCell>
                    <TableCell>{item.predstavlenie}</TableCell>
                    <TableCell>{format(new Date(item.data_udaleniya), 'dd.MM.yyyy HH:mm', { locale: ru })}</TableCell>
                    <TableCell>{item.udalil || '—'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(item.tip_obekta, item.id)}
                      >
                        Восстановить
                      </Button>
                      <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleHardDelete(item.tip_obekta, item.id)}
                    >
                      Удалить навсегда
                    </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Корзина пуста</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}