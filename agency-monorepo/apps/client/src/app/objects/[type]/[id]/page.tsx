'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SellRentForm from '@/components/forms/SellRentForm';
import { ExtendedDataDisplay } from '@/components/forms/ExtendedDataDisplay'; // путь к вашему скопированному файлу
import api from '@repo/api-client';

const typeLabels: Record<string, string> = {
  flat: 'Квартира',
  detachedhouse: 'Дом',
  landplot: 'Участок',
};

const getEndpoint = (type: string, id: string) => {
  const endpoints: Record<string, string> = {
    flat: `/flats/${id}/`,
    detachedhouse: `/detachedhouses/${id}/`,
    landplot: `/landplots/${id}/`,
  };
  return endpoints[type] || null;
};

// Поля, которые уже показаны в блоке "Характеристики" и не должны дублироваться
const getExcludeFields = (type: string) => {
  const common = [
    'mnogoetazhka', 'nomer_kvartiry', 'koordinaty',
    'kolichestvo_komnat', 'zhilaya_ploshad', 'etazh',
    'kolichestvo_sanuzlov', 'tip_komnat', 'sozdano', 'obnovleno',
    'region', 'gorod', 'city', 'street', 'house_number', 'apartment_number',
    'quantity_rooms', 'home_area', 'floor', 'rooms_type', 'bathroom_quantity',
    'mnogoetazhka_detail'
  ];
  if (type === 'flat') {
    return [...common, 'totalFloors', 'elevator'];
  }
  if (type === 'detachedhouse') {
    return [...common, 'floor_in_house', 'year_construction', 'land_area'];
  }
  if (type === 'landplot') {
    return [...common, 'land_area', 'cadastral_number', 'land_type', 'is_water', 'is_gas', 'is_severage'];
  }
  return common;
};

export default function ObjectDetailPage() {
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

  const address = `${object.city || ''}, ${object.street || ''} ${object.house_number || ''} ${object.apartment_number ? `кв.${object.apartment_number}` : ''}`.trim().replace(/^, |, $/g, '');

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">← Назад</Button>

      <h1 className="text-3xl font-bold mb-4">{typeLabels[type] || type} в {object.city || ''}</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {object.images && object.images.length > 0 ? (
            <div className="grid gap-2">
              {object.images.map((img: any, idx: number) => (
                <div key={idx} className="relative h-64 w-full">
                  <Image src={img.izobrazhenie} alt={`Фото ${idx+1}`} fill className="object-cover rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted h-64 flex items-center justify-center rounded-lg">Нет фото</div>
          )}
        </div>

        <div>
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="text-2xl font-semibold border-b pb-2">Характеристики</h2>
              <p className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                <span><strong>Адрес:</strong> {address}</span>
              </p>

              <div className="grid grid-cols-2 gap-4">
                {type === 'flat' && (
                  <>
                    {object.quantity_rooms && <div><strong>Количество комнат:</strong> {object.quantity_rooms}</div>}
                    {object.home_area && <div><strong>Площадь:</strong> {object.home_area} м²</div>}
                    {object.floor && <div><strong>Этаж:</strong> {object.floor}</div>}
                    {object.totalFloors && <div><strong>Этажность дома:</strong> {object.totalFloors}</div>}
                    {object.rooms_type && <div><strong>Тип комнат:</strong> {object.rooms_type === 'separate' ? 'Раздельные' : 'Смежные'}</div>}
                    {object.renovation && <div><strong>Ремонт:</strong> {object.renovation}</div>}
                    {object.bathroom_quantity && <div><strong>Санузлов:</strong> {object.bathroom_quantity}</div>}
                  </>
                )}
                {type === 'detachedhouse' && (
                  <>
                    {object.quantity_rooms && <div><strong>Количество комнат:</strong> {object.quantity_rooms}</div>}
                    {object.home_area && <div><strong>Площадь дома:</strong> {object.home_area} м²</div>}
                    {object.land_area && <div><strong>Площадь участка:</strong> {object.land_area} соток</div>}
                    {object.floor_in_house && <div><strong>Этажность:</strong> {object.floor_in_house}</div>}
                    {object.year_construction && <div><strong>Год постройки:</strong> {object.year_construction}</div>}
                  </>
                )}
                {type === 'landplot' && (
                  <>
                    {object.land_area && <div><strong>Площадь:</strong> {object.land_area} соток</div>}
                    {object.cadastral_number && <div><strong>Кадастровый номер:</strong> {object.cadastral_number}</div>}
                    {object.land_type && <div><strong>Тип:</strong> {object.land_type}</div>}
                    {object.is_water !== undefined && <div><strong>Вода:</strong> {object.is_water ? 'Есть' : 'Нет'}</div>}
                    {object.is_gas !== undefined && <div><strong>Газ:</strong> {object.is_gas ? 'Есть' : 'Нет'}</div>}
                    {object.is_severage !== undefined && <div><strong>Канализация:</strong> {object.is_severage ? 'Есть' : 'Нет'}</div>}
                  </>
                )}
              </div>

              <div className="mt-4 border-t pt-4">
                <h3 className="text-lg font-medium mb-2">Дополнительные характеристики</h3>
                <ExtendedDataDisplay
                  data={object}
                  propertyType={type}
                  excludeKeys={getExcludeFields(type)}
                />
              </div>

              <div className="pt-4">
                <Button size="lg" className="w-full" onClick={() => setShowRequestForm(true)}>
                  Оставить заявку
                </Button>
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
            objectType={typeLabels[type] || type}
            objectId={id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}