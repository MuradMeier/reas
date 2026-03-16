'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PhoneInputComponent } from '@/components/ui/phone-input';
import ExtendedSellRentForm from './ExtendedSellRentForm';
import toast from 'react-hot-toast';
import {Checkbox} from '@/components/ui/checkbox';
import Link from 'next/link';


const baseSchema = z.object({
  name: z.string().min(2, 'Имя обязательно'),
  phone: z.string().min(10, 'Введите корректный телефон'),
  email: z.string().email('Неверный email').optional().or(z.literal('')),
  agreement: z.boolean().refine(val => val === true, {
    message: 'Необходимо согласие на обработку персональных данных',
  }),
});

type BaseFormData = z.infer<typeof baseSchema>;

interface SellRentFormProps {
  action: string;
  objectType: string;
  objectId?: string; // ID объекта (из URL)
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const mapPurpose = (action: string): string => {
  const map: Record<string, string> = {
    'Продать': 'sell',
    'Сдать': 'lease',
    'Купить': 'buy',
    'Снять': 'rent',
  };
  return map[action] || 'buy';
};

const mapPropertyType = (type: string): string => {
  const map: Record<string, string> = {
    'Квартира': 'flat',
    'Дом': 'house',
    'Участок': 'land',
    'Комната': 'room',
  };
  return map[type] || 'flat';
};

export default function SellRentForm({ action, objectType, objectId}: SellRentFormProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [showExtended, setShowExtended] = useState(false);
  const [baseData, setBaseData] = useState<BaseFormData | null>(null);

  const form = useForm<BaseFormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: { name: '', phone: '', email: '', agreement: false },
  });
  const { reset } = form;
  const onSubmit = (data: BaseFormData) => {
  setBaseData(data);
  if (objectId) {
    // Если заявка с конкретного объекта — сразу открываем расширенную форму
    setShowExtended(true);
  } else {
    setShowDialog(true);
  }
};

  const handleSendAsIs = async () => {
  try {
    const extendedData = {
      object_id: objectId,
      object_type: mapPropertyType(objectType),
    };
          const response = await fetch(`${API_URL}/requests/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({
        imya: baseData?.name,
        telefon: baseData?.phone,
        email: baseData?.email,                     // добавлено
        purpose: mapPurpose(action),
        property_type: mapPropertyType(objectType),
        status: 'new',
        extended_data: extendedData,
        agreed_to_pd: true,
      }),
});

      if (!response.ok) throw new Error('Ошибка отправки');
      toast.success('Заявка отправлена');
      setShowDialog(false);
      form.reset();
    } catch (error) {
      toast.error('Ошибка при отправке');
      console.error(error);
    }
  };

  const handleFillDetails = () => {
    setShowDialog(false);
    setShowExtended(true);
  };

  const handleExtendedSubmit = async (data: any) => {
  try {
    const extendedData = {
      object_id: objectId,
      object_type: mapPropertyType(objectType),
      ...data,
    };
          const response = await fetch(`${API_URL}/requests/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({
        imya: baseData?.name,
        telefon: baseData?.phone,
        email: baseData?.email,
        purpose: mapPurpose(action),
        property_type: mapPropertyType(objectType),
        status: 'new',
        extended_data: extendedData,
        agreed_to_pd: true,                          // добавлено
      }),
    });
      if (!response.ok) throw new Error('Ошибка отправки');
      toast.success('Заявка отправлена');
      setShowExtended(false);
      form.reset();
    } catch (error) {
      toast.error('Ошибка при отправке');
      console.error(error);
    }
  };

  return (
    <div>
      {!showExtended ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Как к вам обращаться?</FormLabel>
                  <FormControl>
                    <Input placeholder="Иван Иванов" {...field} />
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
                  <FormLabel>Номер телефона</FormLabel>
                  <FormControl>
                    <PhoneInputComponent field={field} placeholder="+7 (999) 999-99-99" />
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
                  <FormLabel>Email (необязательно)</FormLabel>
                  <FormControl>
                    <Input placeholder="ivan@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
  control={form.control}
  name="agreement"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel className="text-sm font-normal">
          Нажимая кнопку «Отправить», я даю свое согласие на обработку моих персональных данных, в соответствии с Федеральным законом №152-ФЗ «О персональных данных» на условиях и для целей, определенных в{' '}
          <Link href="/privacy" target="_blank" className="text-primary underline">
            Политике конфиденциальности
          </Link>{' '}
          и{' '}
          <Link href="/privacy#consent" target="_blank" className="text-primary underline">
            Согласии на обработку персональных данных
          </Link>.
        </FormLabel>
      </div>
    </FormItem>
  )}
/>
            <Button type="submit">Отправить заявку</Button>
          </form>
        </Form>
      ) : (
        <ExtendedSellRentForm
          action={action}
          objectType={objectType}
          baseData={baseData!}
          onCancel={() => setShowExtended(false)}
          onSubmit={handleExtendedSubmit}
        />
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Заполнить подробности?</DialogTitle>
            <DialogDescription>
              Вы можете указать больше информации об объекте, чтобы риэлтор быстрее обработал заявку.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSendAsIs}>Отправить как есть</Button>
            <Button onClick={handleFillDetails}>Заполнить подробно</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
