'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Plus, Trash2 } from 'lucide-react';
import api from '@repo/api-client';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Region } from '@repo/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  room: 'Комната',
};

export default function ObjectsPage() {
    const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000000]);
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 1000]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [deleteId, setDeleteId] = useState<{ type: string; id: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Загрузка регионов
  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await api.get('/regions/');
      return res.data.results || res.data || [];
    },
  });

  // Загрузка городов (зависит от выбранного региона)
  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities', selectedRegion],
    queryFn: async () => {
      if (!selectedRegion) return [];
      const res = await api.get(`/cities/?region=${selectedRegion}`);
      return res.data.results || res.data || [];
    },
    enabled: !!selectedRegion,
  });

  const { data: objects, isLoading, refetch } = useQuery<ObjectItem[]>({
    queryKey: ['objects', search, typeFilter, priceRange, areaRange, selectedRegion, selectedCity, statusFilter],
    queryFn: async () => {
      const types = typeFilter === 'all' ? ['flat', 'detachedhouse', 'landplot', 'room'] : [typeFilter];
      let allObjects: ObjectItem[] = [];

      for (const t of types) {
        let endpoint = '';
        if (t === 'flat') endpoint = '/flats/';
        else if (t === 'detachedhouse') endpoint = '/detachedhouses/';
        else if (t === 'landplot') endpoint = '/landplots/';
        else if (t === 'room') endpoint = '/rooms/';
        else continue;

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (selectedRegion) params.append('region', selectedRegion);
        if (selectedCity) params.append('gorod', selectedCity);
        if (priceRange[0] > 0) params.append('price_min', priceRange[0].toString());
        if (priceRange[1] < 100000000) params.append('price_max', priceRange[1].toString());
        if (areaRange[0] > 0) params.append('area_min', areaRange[0].toString());
        if (areaRange[1] < 1000) params.append('area_max', areaRange[1].toString());
        if (statusFilter !== 'all') {
  params.append('opublikovano', statusFilter === 'published' ? 'true' : 'false');
}
        params.append('page_size', '1000');

        const res = await api.get(`${endpoint}?${params.toString()}`);
        const items = (res.data.results || res.data).map((item: any) => ({
          id: item.id,
          type: t,
          title: t === 'flat' ? `Квартира ${item.quantity_rooms}-комнатная` :
       t === 'detachedhouse' ? `Дом ${item.quantity_rooms}-комнатный` :
       t === 'landplot' ? `Участок ${item.land_area} соток` :
       `Комната ${item.ploshad_komnaty} м²`,
          address: t === 'room' ? (item.parent_detail?.address || '—') : `${item.city}, ${item.street} ${item.house_number || ''}`,
          price: item.price,
          area: t === 'room' ? item.ploshad_komnaty : (item.area || item.land_area || item.home_area),
          rooms: t === 'flat' || t === 'detachedhouse' ? item.quantity_rooms : undefined,
          image: item.images?.[0]?.izobrazhenie,
          created_at: item.created_at,
        }));
        allObjects = [...allObjects, ...items];
      }
      return allObjects;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: { type: string; id: number }) => {
      let endpoint = '';
      if (payload.type === 'flat') endpoint = `/flats/${payload.id}/`;
      else if (payload.type === 'detachedhouse') endpoint = `/detachedhouses/${payload.id}/`;
      else if (payload.type === 'landplot') endpoint = `/landplots/${payload.id}/`;
      else throw new Error('Неизвестный тип');
      await api.delete(endpoint);
    },
    onSuccess: () => {
      toast.success('Объект удалён');
      queryClient.invalidateQueries({ queryKey: ['objects'] });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error('Ошибка при удалении');
      setDeleteDialogOpen(false);
    },
  });

  const handleDeleteClick = (type: string, id: number) => {
    setDeleteId({ type, id });
    setDeleteDialogOpen(true);
  };

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
              <SelectItem value="room">Комната</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Регион</label>
          <Select value={selectedRegion} onValueChange={(val) => { setSelectedRegion(val); setSelectedCity(''); }}>
            <SelectTrigger>
              <SelectValue placeholder="Любой регион" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.nazvanie}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Город</label>
          <Select
            value={selectedCity}
            onValueChange={setSelectedCity}
            disabled={!selectedRegion || selectedRegion === 'all'}
          >
            <SelectTrigger>
              <SelectValue placeholder={citiesLoading ? 'Загрузка...' : 'Выберите город'} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nazvanie}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
  <label className="text-sm font-medium">Статус</label>
  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
    <SelectTrigger>
      <SelectValue placeholder="Все" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Все</SelectItem>
      <SelectItem value="published">Опубликовано</SelectItem>
      <SelectItem value="draft">Черновик</SelectItem>
    </SelectContent>
  </Select>
</div>
        <div className="space-y-2">
  <label className="text-sm font-medium">Цена, ₽</label>
  <div className="flex gap-2">
    <Input
      type="number"
      placeholder="от"
      value={priceRange[0] || ''}
      onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
      min={0}
    />
    <Input
      type="number"
      placeholder="до"
      value={priceRange[1] || ''}
      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 0])}
      min={0}
    />
  </div>
</div>

        <div className="space-y-2">
  <label className="text-sm font-medium">Площадь, м²</label>
  <div className="flex gap-2">
    <Input
      type="number"
      placeholder="от"
      value={areaRange[0] || ''}
      onChange={(e) => setAreaRange([Number(e.target.value) || 0, areaRange[1]])}
      min={0}
    />
    <Input
      type="number"
      placeholder="до"
      value={areaRange[1] || ''}
      onChange={(e) => setAreaRange([areaRange[0], Number(e.target.value) || 0])}
      min={0}
    />
  </div>
</div>
      </div>

            {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {objects?.map((obj) => (
            <div key={`${obj.type}-${obj.id}`} className="relative group">
              <Link href={`/objects/${obj.type}/${obj.id}`}>
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

              {/* Кнопка удаления поверх карточки */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white shadow-sm"
                onClick={() => handleDeleteClick(obj.type, obj.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId!)}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}