'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { PhoneInputComponent } from '@/components/ui/phone-input';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@repo/api-client';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import ExtendedSellRentForm from '@/components/forms/ExtendedSellRentForm'; // путь к существующему компоненту
import BuyRentPreferencesForm from '@/components/forms/BuyRentPreferencesForm'; // создадим

const quickRequestSchema = z.object({
  imya: z.string().min(1, 'Имя обязательно'),
  telefon: z.string().min(1, 'Телефон обязателен'),
  purpose: z.enum(['buy', 'sell', 'rent', 'lease'], { required_error: 'Выберите цель' }),
  propertyType: z.enum(['flat', 'house', 'land', 'room'], { required_error: 'Выберите тип объекта' }),
});

type QuickRequestForm = z.infer<typeof quickRequestSchema>;

interface QuickRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickRequestModal({ open, onOpenChange }: QuickRequestModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'main' | 'extended'>('main');
  const [baseData, setBaseData] = useState<QuickRequestForm | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<QuickRequestForm>({
    resolver: zodResolver(quickRequestSchema),
    defaultValues: {
      imya: '',
      telefon: '',
      purpose: 'buy',
      propertyType: 'flat',
    },
  });

  const onMainSubmit = (data: QuickRequestForm) => {
    setBaseData(data);
    setStep('extended');
  };

  const onExtendedSubmit = async (extendedData: any) => {
    if (!baseData) return;
    setIsSubmitting(true);
    try {
      // 1. Поиск клиента по телефону
      let clientId: number | null = null;
      const searchRes = await api.get(`/clients/?search=${encodeURIComponent(baseData.telefon)}`);
      const clients = searchRes.data.results || searchRes.data;
      if (clients.length > 0) {
        clientId = clients[0].id;
      } else {
        // 2. Создание нового клиента с ответственным
        const newClientPayload: any = {
          imya: baseData.imya,
          familiya: '',
          telefon: baseData.telefon,
          email: '',
          uvedomleniya_vklyucheny: false,
        };
        if (user) {
          newClientPayload.otvetstvennyi = user.id;
        }
        const newClient = await api.post('/clients/', newClientPayload);
        clientId = newClient.data.id;
      }

      // 3. Создание заявки с ответственным
      const requestPayload: any = {
        klient: clientId,
        status: 'call_made',
        purpose: baseData.purpose,
        property_type: baseData.propertyType,
        extended_data: extendedData, // сюда попадут все поля из формы
      };
      if (user) {
        requestPayload.naznachen = user.id;
      }

      await api.post('/requests/', requestPayload);

      toast.success('Заявка создана');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      reset();
      setStep('main');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при создании заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setStep('main');
    onOpenChange(false);
  };

  const actionLabel = baseData?.purpose === 'buy' ? 'Купить' :
                      baseData?.purpose === 'rent' ? 'Снять' :
                      baseData?.purpose === 'sell' ? 'Продать' : 'Сдать';

  const objectTypeLabel = baseData?.propertyType === 'flat' ? 'Квартира' :
                          baseData?.propertyType === 'house' ? 'Дом' :
                          baseData?.propertyType === 'land' ? 'Участок' : 'Комната';

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setStep('main');
        reset();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[500px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'main' ? 'Новая заявка (звонок)' : 'Подробные данные'}
          </DialogTitle>
        </DialogHeader>

        {step === 'main' ? (
          <form onSubmit={handleSubmit(onMainSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="imya">Имя *</Label>
              <Controller
                control={control}
                name="imya"
                render={({ field }) => <Input id="imya" {...field} />}
              />
              {errors.imya && <p className="text-sm text-red-500">{errors.imya.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefon">Телефон *</Label>
              <Controller
                control={control}
                name="telefon"
                render={({ field }) => (
                  <PhoneInputComponent field={field} placeholder="+7 (999) 999-99-99" />
                )}
              />
              {errors.telefon && <p className="text-sm text-red-500">{errors.telefon.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип заявки *</Label>
                <Controller
                  control={control}
                  name="purpose"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Купить</SelectItem>
                        <SelectItem value="sell">Продать</SelectItem>
                        <SelectItem value="rent">Снять</SelectItem>
                        <SelectItem value="lease">Сдать</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.purpose && <p className="text-sm text-red-500">{errors.purpose.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Тип объекта *</Label>
                <Controller
                  control={control}
                  name="propertyType"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Квартира</SelectItem>
                        <SelectItem value="house">Дом</SelectItem>
                        <SelectItem value="land">Участок</SelectItem>
                        <SelectItem value="room">Комната</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.propertyType && <p className="text-sm text-red-500">{errors.propertyType.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit">
                Далее
              </Button>
            </div>
          </form>
        ) : (
          // Второй шаг – расширенная форма
          <>
            {baseData?.purpose === 'buy' || baseData?.purpose === 'rent' ? (
              <BuyRentPreferencesForm
                action={actionLabel}
                objectType={objectTypeLabel}
                baseData={baseData}
                onCancel={() => setStep('main')}
                onSubmit={onExtendedSubmit}
              />
            ) : (
              <ExtendedSellRentForm
                action={actionLabel}
                objectType={objectTypeLabel}
                baseData={baseData}
                onCancel={() => setStep('main')}
                onSubmit={onExtendedSubmit}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}