'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Plus } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

interface ObjectItem {
  id: number;
  type: 'landplot' | 'apartment' | 'detachedhouse' | 'flat';
  title: string;
  address: string;
  price?: number;
  area?: number;
  rooms?: number;
  image?: string;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  flat: 'Квартира',
  detachedhouse: 'Дом',
  landplot: 'Участок',
};

export default function ObjectsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000000]);
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 1000]);

  const { data: objects, isLoading } = useQuery<ObjectItem[]>({
    queryKey: ['objects', search, typeFilter, priceRange, areaRange],
    queryFn: async () => {
      // Здесь нужно объединить данные из разных эндпоинтов с фильтрацией
      // Для примера загружаем все типы
      const types = typeFilter === 'all' ? ['flat', 'detachedhouse', 'landplot'] : [typeFilter];
      let allObjects: ObjectItem[] = [];

      for (const t of types) {
        let endpoint = '';
        if (t === 'flat') endpoint = '/flats/';
        else if (t === 'detachedhouse') endpoint = '/detachedhouses/';
        else if (t === 'landplot') endpoint = '/landplots/';
        else continue;

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (priceRange[0] > 0) params.append('price_min', priceRange[0].toString());
        if (priceRange[1] < 100000000) params.append('price_max', priceRange[1].toString());
        if (areaRange[0] > 0) params.append('area_min', areaRange[0].toString());
        if (areaRange[1] < 1000) params.append('area_max', areaRange[1].toString());

        const res = await api.get(`${endpoint}?${params.toString()}`);
        const items = (res.data.results || res.data).map((item: any) => ({
          id: item.id,
          type: t,
          title: t === 'flat' ? `Квартира ${item.quantity_rooms}-комнатная` :
                 t === 'detachedhouse' ? `Дом ${item.quantity_rooms}-комнатный` :
                 `Участок ${item.land_area} соток`,
          address: `${item.city}, ${item.street} ${item.house_number || ''}`,
          price: item.price,
          area: item.area || item.land_area || item.home_area,
          rooms: item.quantity_rooms,
          image: item.images?.[0]?.izobrazhenie,
          created_at: item.created_at,
        }));
        allObjects = [...allObjects, ...items];
      }
      return allObjects;
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Объекты недвижимости</h1>
        <Link href="/objects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить объект
          </Button>
        </Link>
      </div>

      {/* Фильтры */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted p-4 rounded-lg">
        <div className="space-y-2">
          <label className="text-sm font-medium">Поиск</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Адрес, название..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Тип объекта</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Все типы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="flat">Квартиры</SelectItem>
              <SelectItem value="detachedhouse">Дома</SelectItem>
              <SelectItem value="landplot">Участки</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Цена, млн ₽</label>
          <Slider
            min={0}
            max={100}
            step={0.5}
            value={[priceRange[0] / 1000000, priceRange[1] / 1000000]}
            onValueChange={(value) => setPriceRange([value[0] * 1000000, value[1] * 1000000])}
            className="mt-2"
          />
          <div className="flex justify-between text-xs">
            <span>{priceRange[0] / 1000000} млн</span>
            <span>{priceRange[1] / 1000000} млн</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Площадь, м²</label>
          <Slider
            min={0}
            max={500}
            step={5}
            value={areaRange}
            onValueChange={setAreaRange}
            className="mt-2"
          />
          <div className="flex justify-between text-xs">
            <span>{areaRange[0]} м²</span>
            <span>{areaRange[1]} м²</span>
          </div>
        </div>
      </div>

      {/* Результаты */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {objects?.map((obj) => (
            <Link key={`${obj.type}-${obj.id}`} href={`/objects/${obj.type}/${obj.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-video relative bg-muted">
                  {obj.image ? (
                    <Image src={obj.image} alt={obj.title} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Нет фото
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{obj.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{obj.address}</p>
                    </div>
                    <Badge variant="outline">{typeLabels[obj.type]}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {obj.price && <p className="text-lg font-bold">{obj.price.toLocaleString()} ₽</p>}
                    <p className="text-sm">Площадь: {obj.area} м²</p>
                    {obj.rooms && <p className="text-sm">Комнат: {obj.rooms}</p>}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
                  Добавлено: {new Date(obj.created_at).toLocaleDateString()}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}