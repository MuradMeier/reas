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

const baseSchema = z.object({
  name: z.string().min(2, 'Имя обязательно'),
  phone: z.string().min(10, 'Введите корректный телефон'),
});

type BaseFormData = z.infer<typeof baseSchema>;

interface SellRentFormProps {
  action: string;
  objectType: string;
}

export default function SellRentForm({ action, objectType }: SellRentFormProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [showExtended, setShowExtended] = useState(false);
  const [baseData, setBaseData] = useState<BaseFormData | null>(null);

  const form = useForm<BaseFormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: { name: '', phone: '' },
  });

  const onSubmit = (data: BaseFormData) => {
    setBaseData(data);
    setShowDialog(true);
  };

  const handleSendAsIs = async () => {
    // TODO: отправка на API
    console.log('Отправка базовой заявки', baseData, { action, objectType });
    toast.success('Заявка отправлена');
    setShowDialog(false);
    form.reset();
  };

  const handleFillDetails = () => {
    setShowDialog(false);
    setShowExtended(true);
  };

  const handleExtendedSubmit = async (data: any) => {
  console.log('Отправка расширенной заявки', data);
  toast.success('Заявка отправлена');
  setShowExtended(false);
  form.reset(); // добавить эту строку
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
        <DialogContent>
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