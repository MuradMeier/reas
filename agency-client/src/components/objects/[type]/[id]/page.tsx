'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { useState } from 'react';
import SellRentForm from '@/components/forms/SellRentForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const getEndpoint = (type: string, id: string) => {
  const endpoints: Record<string, string> = {
    flat: `/flats/${id}/`,
    detachedhouse: `/detachedhouses/${id}/`,
    landplot: `/landplots/${id}/`,
  };
  return endpoints[type] || null;
};

const getObjectTypeName = (type: string): string => {
  const map: Record<string, string> = {
    flat: 'Квартира',
    detachedhouse: 'Дом',
    landplot: 'Участок',
  };
  return map[type] || type;
};

export default function ObjectPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;
  const [showRequestForm, setShowRequestForm] = useState(false);

  const endpoint = getEndpoint(type, id);

  const { data: object, isLoading, error } = useQuery({
    queryKey: ['object', type, id],
    queryFn: async () => {
      if (!endpoint) throw new Error('Invalid object type');
      const res = await api.get(endpoint);
      return res.data;
    },
    enabled: !!endpoint,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">← Назад</Button>
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !object) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">← Назад</Button>
        <p className="text-center text-muted-foreground">Объект не найден</p>
      </div>
    );
  }

  const renderDetails = () => {
    switch (type) {
      case 'flat':
        return (
          <>
            <p><strong>Количество комнат:</strong> {object.quantity_rooms}</p>
            <p><strong>Площадь:</strong> {object.home_area} кв.м</p>
            <p><strong>Этаж:</strong> {object.floor}</p>
            <p><strong>Тип комнат:</strong> {object.rooms_type === 'separate' ? 'Раздельные' : 'Смежные'}</p>
            <p><strong>Ремонт:</strong> {object.renovation}</p>
            {object.bathroom_quantity && <p><strong>Санузлов:</strong> {object.bathroom_quantity}</p>}
          </>
        );
      case 'detachedhouse':
        return (
          <>
            <p><strong>Количество комнат:</strong> {object.quantity_rooms}</p>
            <p><strong>Площадь дома:</strong> {object.home_area} кв.м</p>
            <p><strong>Площадь участка:</strong> {object.land_area} соток</p>
            <p><strong>Этажность:</strong> {object.floor_in_house}</p>
            <p><strong>Год постройки:</strong> {object.year_construction}</p>
          </>
        );
      case 'landplot':
        return (
          <>
            <p><strong>Площадь:</strong> {object.land_area} соток</p>
            <p><strong>Кадастровый номер:</strong> {object.cadastral_number}</p>
            <p><strong>Тип:</strong> {object.land_type}</p>
            <p><strong>Вода:</strong> {object.is_water ? 'Есть' : 'Нет'}</p>
            <p><strong>Газ:</strong> {object.is_gas ? 'Есть' : 'Нет'}</p>
            <p><strong>Канализация:</strong> {object.is_severage ? 'Есть' : 'Нет'}</p>
          </>
        );
      default:
        return null;
    }
  };

  // Формируем адрес для отображения
  const address = `${object.city}, ${object.street} ${object.house_number || ''} ${object.apartment_number ? `кв.${object.apartment_number}` : ''}`.trim();

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">← Назад</Button>

      <h1 className="text-3xl font-bold mb-4">{getObjectTypeName(type)} в {object.city}</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {object.images && object.images.length > 0 ? (
            <div className="grid gap-2">
              {object.images.map((img: any, idx: number) => (
                <div key={idx} className="relative h-64 w-full">
                  <Image src={img.image} alt={`Фото ${idx+1}`} fill className="object-cover rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted h-64 flex items-center justify-center rounded-lg">Нет фото</div>
          )}
        </div>

        <div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Характеристики</h2>
              <p><strong>Адрес:</strong> {address}</p>
              {renderDetails()}
              <div className="pt-4">
                <Button size="lg" onClick={() => setShowRequestForm(true)}>Оставить заявку</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Заявка на объект</DialogTitle>
          </DialogHeader>
          <SellRentForm
            action="Купить"
            objectType={getObjectTypeName(type)}
            // TODO: передать ID объекта в форму
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}