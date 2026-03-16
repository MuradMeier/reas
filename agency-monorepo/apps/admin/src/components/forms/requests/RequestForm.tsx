'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@repo/api-client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const requestSchema = z.object({
  status: z.string().min(1, 'Выберите статус'),
  naznachen: z.string().optional(),
  byudzhet_ot: z.coerce.number().optional(),
  byudzhet_do: z.coerce.number().optional(),
  kommentariy_klienta: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

const statusOptions = [
  { value: 'new', label: 'Новая' },
  { value: 'viewed', label: 'Просмотрена' },
  { value: 'call_made', label: 'Совершён звонок' },
  { value: 'no_answer', label: 'Не дозвонился' },
  { value: 'callback', label: 'Перезвонить позже' },
  { value: 'contacted', label: 'Контакт установлен' },
  { value: 'meeting_scheduled', label: 'Встреча назначена' },
  { value: 'contract_signed', label: 'Договор подписан' },
  { value: 'rejected', label: 'Отказ' },
];

interface RequestFormProps {
  initialData?: any;
  onSuccess?: () => void;
  isEdit?: boolean;
}

export function RequestForm({ initialData, onSuccess, isEdit = false }: RequestFormProps) {
  const router = useRouter();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      status: '',
      naznachen: 'none',
      byudzhet_ot: undefined,
      byudzhet_do: undefined,
      kommentariy_klienta: '',
    },
  });

  // Загрузка списка пользователей
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users/?limit=100');
      return res.data.results || res.data || [];
    },
  });

  // Заполнение формы при редактировании
  useEffect(() => {
    if (initialData) {
      reset({
        status: initialData.status || '',
        naznachen: initialData.naznachen ? String(initialData.naznachen) : 'none',
        byudzhet_ot: initialData.byudzhet_ot,
        byudzhet_do: initialData.byudzhet_do,
        kommentariy_klienta: initialData.kommentariy_klienta || '',
      });
    }
  }, [initialData, reset]);

  const mutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      const payload = {
        ...data,
        naznachen: data.naznachen === 'none' ? null : parseInt(data.naznachen),
      };
      if (isEdit && initialData) {
        return api.patch(`/requests/${initialData.id}/`, payload);
      } else {
        return api.post('/requests/', payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Заявка обновлена' : 'Заявка создана');
      if (onSuccess) onSuccess();
      router.push('/requests');
    },
    onError: (error: any) => {
      toast.error('Ошибка при сохранении');
      console.error(error);
    },
  });

  const onSubmit = (data: RequestFormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      {initialData && (
        <div className="space-y-2">
          <Label>Клиент</Label>
          <div className="p-2 bg-muted rounded">
            {initialData.klient_detail?.familiya} {initialData.klient_detail?.imya} {initialData.klient_detail?.otchestvo} ({initialData.klient_detail?.telefon})
          </div>
        </div>
      )}

      {initialData?.nedvizhimost && (
        <div className="space-y-2">
          <Label>Объект</Label>
          <div className="p-2 bg-muted rounded">{initialData.nedvizhimost}</div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Статус *</Label>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
      </div>

      {/* Поле ответственного показываем только при создании */}
      {!isEdit && (
        <div className="space-y-2">
          <Label>Ответственный</Label>
          <Controller
            control={control}
            name="naznachen"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите ответственного" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначен</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.first_name} {user.last_name} ({user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Бюджет от</Label>
          <Controller
            control={control}
            name="byudzhet_ot"
            render={({ field }) => <Input type="number" {...field} value={field.value ?? ''} />}
          />
        </div>
        <div className="space-y-2">
          <Label>Бюджет до</Label>
          <Controller
            control={control}
            name="byudzhet_do"
            render={({ field }) => <Input type="number" {...field} value={field.value ?? ''} />}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Комментарий клиента</Label>
        <Controller
          control={control}
          name="kommentariy_klienta"
          render={({ field }) => <Textarea {...field} value={field.value ?? ''} rows={4} />}
        />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Сохранение...' : (isEdit ? 'Сохранить' : 'Создать')}
      </Button>
    </form>
  );
}