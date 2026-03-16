 'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const typeLabels = {
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
  return endpoints[type];
};

export default function ObjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;

  const { data: object, isLoading } = useQuery({
    queryKey: ['object', type, id],
    queryFn: async () => {
      const res = await api.get(getEndpoint(type, id));
      return res.data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!object) {
    return <div>Объект не найден</div>;
  }

  const renderDetails = () => {
    switch (type) {
      case 'flat':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div><strong>Количество комнат:</strong> {object.quantity_rooms}</div>
            <div><strong>Площадь:</strong> {object.home_area} кв.м</div>
            <div><strong>Этаж:</strong> {object.floor}</div>
            <div><strong>Тип комнат:</strong> {object.rooms_type === 'separate' ? 'Раздельные' : 'Смежные'}</div>
            <div><strong>Ремонт:</strong> {object.renovation}</div>
            <div><strong>Санузлов:</strong> {object.bathroom_quantity}</div>
          </div>
        );
      case 'detachedhouse':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div><strong>Комнат:</strong> {object.quantity_rooms}</div>
            <div><strong>Площадь дома:</strong> {object.home_area} кв.м</div>
            <div><strong>Площадь участка:</strong> {object.land_area} соток</div>
            <div><strong>Этажность:</strong> {object.floor_in_house}</div>
            <div><strong>Год постройки:</strong> {object.year_construction}</div>
          </div>
        );
      case 'landplot':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div><strong>Площадь:</strong> {object.land_area} соток</div>
            <div><strong>Кадастровый номер:</strong> {object.cadastral_number}</div>
            <div><strong>Тип участка:</strong> {object.land_type}</div>
            <div><strong>Вода:</strong> {object.is_water ? 'Есть' : 'Нет'}</div>
            <div><strong>Газ:</strong> {object.is_gas ? 'Есть' : 'Нет'}</div>
            <div><strong>Канализация:</strong> {object.is_severage ? 'Есть' : 'Нет'}</div>
          </div>
        );
      default:
        return null;
    }
  };

  const address = `${object.city}, ${object.street} ${object.house_number || ''} ${object.apartment_number ? `кв.${object.apartment_number}` : ''}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {typeLabels[type]} #{object.id}
        </h1>
        <div className="flex gap-2">
          <Link href={`/objects/${type}/${id}/edit`}>
            <Button variant="outline">Редактировать</Button>
          </Link>
          <Button variant="outline" onClick={() => router.back()}>Назад</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Фотографии</CardTitle>
            </CardHeader>
            <CardContent>
              {object.images
      .filter((img: any) => img?.izobrazhenie) // фильтруем только с реальными фото
      .map((img: any, idx: number) => (
        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
          <Image
            src={img.izobrazhenie} // было img.image – исправлено
            alt={`Фото ${idx + 1}`}
            fill
            className="object-cover"
          />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Нет фотографий</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Характеристики</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p><strong>Адрес:</strong> {address}</p>
                {renderDetails()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Описание</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{object.description || 'Нет описания'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Предложения</CardTitle>
            </CardHeader>
            <CardContent>
              {object.rental_offers?.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Аренда</h3>
                  {object.rental_offers.map((offer: any) => (
                    <div key={offer.id} className="mb-2">
                      <p>Цена: {offer.price} ₽/мес</p>
                    </div>
                  ))}
                </div>
              )}
              {object.sale_offers?.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Продажа</h3>
                  {object.sale_offers.map((offer: any) => (
                    <div key={offer.id}>
                      <p>Цена: {offer.price} ₽</p>
                    </div>
                  ))}
                </div>
              )}
              {!object.rental_offers?.length && !object.sale_offers?.length && (
                <p className="text-muted-foreground">Нет предложений</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}