'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { YMaps } from '@pbe/react-yandex-maps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSettings } from '@/contexts/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressSuggest } from '@repo/ui';
import toast from 'react-hot-toast';
import api from '@repo/api-client';
import { SearchResult } from '@repo/types';
import { ObjectCard, LocationFields } from '@repo/ui';

interface BuyRentFormProps {
  action: string;
  objectType: string;
}

export default function BuyRentForm({ action, objectType }: BuyRentFormProps) {
  const { register, watch, setValue, getValues } = useForm({
    defaultValues: {
      region: '',
      city: '',
      cityRadius: '',
      district: '',
      microdistrict: '',
      metro: '',
      exactAddress: '',
      addressRadius: '',
      priceFrom: '',
      priceTo: '',
      areaFrom: '',
      areaTo: '',
      rooms: '',
      floorNotFirst: false,
      floorNotLast: false,
      renovation: '',
      withChildren: false,
      withPets: false,
      smoking: false,
      sleepingPlaces: '',
      houseType: '',
      yearBuiltFrom: '',
      landAreaFrom: '',
      landAreaTo: '',
      water: false,
      gas: false,
      sewerage: false,
      landType: '',
    },
  });

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  const settings = useSettings();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const isSearchEnabled = () => {
    const values = getValues();
    return !!(
      values.region ||
      values.city ||
      values.cityRadius ||
      values.district ||
      values.microdistrict ||
      values.metro ||
      values.exactAddress ||
      values.addressRadius
    );
  };

  const handleAddressSelect = (fullAddress: string, data: any) => {
    // Проверка региона
    const regionCode = data.region_kladr_id?.substring(0, 2);
    if (regionCode && !settings?.allowed_region_codes.includes(regionCode)) {
      toast.error('К сожалению, мы не работаем в данном регионе');
      setAddressInput('');
      setSelectedAddress(null);
      setValue('exactAddress', '');
      return;
    }
    setAddressInput(fullAddress);
    setSelectedAddress(data);
    setValue('exactAddress', fullAddress);
  };

  const handleSearch = async () => {
    const values = getValues();
    setIsSearching(true);
    const params = new URLSearchParams();
    if (action === 'Купить') params.append('purpose', 'sale');
    if (action === 'Снять') params.append('purpose', 'rent');
    if (values.region) params.append('region', values.region);
    if (values.city) params.append('gorod', values.city);
    if (values.district) params.append('raion', values.district);
    if (values.metro) params.append('metro_stations', values.metro);
    if (values.microdistrict) params.append('mikroraion', values.microdistrict);
    if (values.priceFrom) params.append('price_min', values.priceFrom);
    if (values.priceTo) params.append('price_max', values.priceTo);
    if (values.areaFrom) params.append('area_min', values.areaFrom);
    if (values.areaTo) params.append('area_max', values.areaTo);
    if (values.rooms && values.rooms !== 'any') params.append('rooms', values.rooms);
    if (values.renovation) params.append('renovation', values.renovation);
    if (values.houseType) params.append('house_type', values.houseType);
    if (values.yearBuiltFrom) params.append('year_min', values.yearBuiltFrom);
    if (values.landAreaFrom) params.append('land_area_min', values.landAreaFrom);
    if (values.landAreaTo) params.append('land_area_max', values.landAreaTo);
    if (values.landType) params.append('land_type', values.landType);
    if (values.water) params.append('water', 'true');
    if (values.gas) params.append('gas', 'true');
    if (values.sewerage) params.append('sewerage', 'true');
    if (action === 'Снять') {
      if (values.withChildren) params.append('with_children', 'true');
      if (values.withPets) params.append('with_pets', 'true');
      if (values.smoking) params.append('smoking', 'true');
      if (values.sleepingPlaces) params.append('sleeping_places_min', values.sleepingPlaces);
    }

    try {
      let results: SearchResult[] = [];
      if (objectType === 'Квартира' || objectType === 'Комната') {
        const res = await api.get(`/flats/?${params.toString()}`);
        results = (res.data.results || res.data || []).map((item: any) => ({
          id: item.id,
          type: 'flat',
          title: `Квартира ${item.quantity_rooms}-комнатная`,
          price: action === 'Купить' ? item.predlozheniya_prodazhi?.[0]?.tsena : item.predlozheniya_arendy?.[0]?.tsena,
          area: item.home_area,
          rooms: item.quantity_rooms,
          address: `${item.city}, ${item.street} ${item.house_number}`,
          image: item.images?.[0]?.izobrazhenie,
        }));
      } else if (objectType === 'Дом') {
        const res = await api.get(`/detachedhouses/?${params.toString()}`);
        results = (res.data.results || res.data || []).map((item: any) => ({
          id: item.id,
          type: 'detachedhouse',
          title: `Дом ${item.quantity_rooms}-комнатный`,
          price: action === 'Купить' ? item.predlozheniya_prodazhi?.[0]?.tsena : item.predlozheniya_arendy?.[0]?.tsena,
          area: item.home_area,
          rooms: item.quantity_rooms,
          address: `${item.city}, ${item.street} ${item.house_number}`,
          image: item.images?.[0]?.izobrazhenie,
        }));
      } else if (objectType === 'Участок') {
        const res = await api.get(`/landplots/?${params.toString()}`);
        results = (res.data.results || res.data || []).map((item: any) => ({
          id: item.id,
          type: 'landplot',
          title: `Участок ${item.land_area} соток`,
          price: action === 'Купить' ? item.predlozheniya_prodazhi?.[0]?.tsena : item.predlozheniya_arendy?.[0]?.tsena,
          area: item.land_area,
          address: `${item.city}, ${item.street} ${item.house_number || ''}`,
          image: item.images?.[0]?.izobrazheniesu,
        }));
      }
      if (isMounted.current) {
        setResults(results);
      }
    } catch (error) {
      if (isMounted.current) {
        console.error('Search error:', error);
      }
    } finally {
      if (isMounted.current) {
        setIsSearching(false);
      }
    }
  };

  if (!settings) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <YMaps query={{ apikey: process.env.NEXT_PUBLIC_YANDEX_API_KEY || '' }}>
      <div className="space-y-8 relative pb-20">
        <LocationFields register={register} watch={watch} setValue={setValue} />

        {/* Поле точного адреса с проверкой региона */}
        <div className="space-y-2">
          <Label>Точный адрес</Label>
          <AddressSuggest
            value={addressInput}
            onChange={setAddressInput}
            onSelect={handleAddressSelect}
            placeholder="Начните вводить адрес..."
          />
          <p className="text-xs text-muted-foreground">Выберите адрес из подсказок – мы проверим, работаем ли в этом регионе</p>
        </div>

        {/* Блок "Параметры объекта" */}
        <div className="space-y-4 border p-4 rounded-lg">
          <h3 className="text-lg font-medium">Параметры объекта</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Цена */}
            <div>
              <Label>Цена от</Label>
              <Input type="number" {...register('priceFrom')} />
            </div>
            <div>
              <Label>Цена до</Label>
              <Input type="number" {...register('priceTo')} />
            </div>

            {/* Площадь */}
            <div>
              <Label>Площадь от</Label>
              <Input type="number" {...register('areaFrom')} />
            </div>
            <div>
              <Label>Площадь до</Label>
              <Input type="number" {...register('areaTo')} />
            </div>

            {/* Количество комнат (для квартир/домов/комнат) */}
            {(objectType === 'Квартира' || objectType === 'Комната' || objectType === 'Дом') && (
              <div>
                <Label>Комнат</Label>
                <Select onValueChange={(value) => setValue('rooms', value)} value={watch('rooms')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Любое" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любое</SelectItem>
                    <SelectItem value="studio">Студия</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4+">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Этаж (для квартир/комнат) */}
            {(objectType === 'Квартира' || objectType === 'Комната') && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox id="floorNotFirst" {...register('floorNotFirst')} />
                  <Label htmlFor="floorNotFirst">Не первый</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="floorNotLast" {...register('floorNotLast')} />
                  <Label htmlFor="floorNotLast">Не последний</Label>
                </div>
              </>
            )}

            {/* Ремонт (для квартир/комнат) */}
            {(objectType === 'Квартира' || objectType === 'Комната') && (
              <div>
                <Label>Ремонт</Label>
                <Select onValueChange={(value) => setValue('renovation', value)} value={watch('renovation')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Любой" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любой</SelectItem>
                    <SelectItem value="euro">Евро</SelectItem>
                    <SelectItem value="cosmetic">Косметический</SelectItem>
                    <SelectItem value="capital">Капитальный</SelectItem>
                    <SelectItem value="designer">Дизайнерский</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Тип дома (для квартир/домов) */}
            {(objectType === 'Квартира' || objectType === 'Дом') && (
              <div>
                <Label>Тип дома</Label>
                <Select onValueChange={(value) => setValue('houseType', value)} value={watch('houseType')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Любой" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любой</SelectItem>
                    <SelectItem value="brick">Кирпичный</SelectItem>
                    <SelectItem value="monolith">Монолитный</SelectItem>
                    <SelectItem value="panel">Панельный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Год постройки не старше (для квартир/домов) */}
            {(objectType === 'Квартира' || objectType === 'Дом') && (
              <div>
                <Label>Год постройки не старше</Label>
                <Input type="number" {...register('yearBuiltFrom')} />
              </div>
            )}

            {/* Для дома: площадь участка */}
            {objectType === 'Дом' && (
              <>
                <div>
                  <Label>Участок от (сотки)</Label>
                  <Input type="number" {...register('landAreaFrom')} />
                </div>
                <div>
                  <Label>Участок до</Label>
                  <Input type="number" {...register('landAreaTo')} />
                </div>
              </>
            )}

            {/* Для участка */}
            {objectType === 'Участок' && (
              <>
                <div>
                  <Label>Тип участка</Label>
                  <Select onValueChange={(value) => setValue('landType', value)} value={watch('landType')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Любой" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Любой</SelectItem>
                      <SelectItem value="ИЖС">ИЖС</SelectItem>
                      <SelectItem value="СНТ">СНТ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="water" {...register('water')} />
                  <Label htmlFor="water">Вода</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="gas" {...register('gas')} />
                  <Label htmlFor="gas">Газ</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="sewerage" {...register('sewerage')} />
                  <Label htmlFor="sewerage">Канализация</Label>
                </div>
              </>
            )}

            {/* Для аренды (доп. поля) */}
            {action === 'Снять' && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox id="withChildren" {...register('withChildren')} />
                  <Label htmlFor="withChildren">Можно с детьми</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="withPets" {...register('withPets')} />
                  <Label htmlFor="withPets">Можно с животными</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="smoking" {...register('smoking')} />
                  <Label htmlFor="smoking">Можно курить</Label>
                </div>
                <div>
                  <Label>Спальных мест не менее</Label>
                  <Input type="number" {...register('sleepingPlaces')} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Результаты поиска */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {results.map((item) => (
              <ObjectCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {isSearching && <p className="text-center">Поиск...</p>}
        {!isSearching && results.length === 0 && <p className="text-center text-muted-foreground">Ничего не найдено</p>}

        {/* Плавающая кнопка "Найти" */}
        <div className="fixed bottom-4 right-4 z-10">
          <Button
            onClick={handleSearch}
            disabled={!isSearchEnabled() || isSearching}
            size="lg"
            className="shadow-lg"
          >
            Найти
          </Button>
        </div>
      </div>
    </YMaps>
  );
}