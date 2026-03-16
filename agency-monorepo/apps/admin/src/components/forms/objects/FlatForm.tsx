'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import api from '@repo/api-client';
import toast from 'react-hot-toast';
import { AddressSuggest } from '@repo/ui';
import { useHouseLookup, AddressParts } from '@/hooks/useHouseLookup';
import { Region } from '@repo/types';

const flatSchema = z.object({
  mnogoetazhka: z.string().min(1, 'Выберите дом'),
  nomer_kvartiry: z.string().min(1, 'Укажите номер квартиры'),
  kolichestvo_komnat: z.coerce.number().min(1, 'Количество комнат должно быть не менее 1'),
  zhilaya_ploshad: z.coerce.number().min(1, 'Площадь должна быть положительной'),
  etazh: z.coerce.number().min(1, 'Этаж должен быть не менее 1'),
  kolichestvo_sanuzlov: z.coerce.number().min(1, 'Число санузлов должно быть не менее 1'),
  tip_komnat: z.string().min(1, 'Выберите тип комнат'),
  remont: z.string().optional(),
});

const houseSchema = z.object({
  gorod_tekst: z.string().min(1, 'Город обязателен'),
  ulitsa: z.string().min(1, 'Улица обязательна'),
  nomer_doma: z.string().min(1, 'Номер дома обязателен'),
  korpus: z.string().optional(),
  stroenie: z.string().optional(),
  region: z.string().min(1, 'Выберите регион'),
  gorod: z.string().min(1, 'Выберите город'),
  god_postroiki: z.coerce.number().min(1900, 'Введите корректный год').max(new Date().getFullYear()),
  tip_doma: z.enum(['brick', 'monolith', 'panel']),
  etazhnost: z.coerce.number().min(1, 'Этажность должна быть не менее 1'),
  lift: z.boolean().default(false),
});

type FlatFormData = z.infer<typeof flatSchema>;
type HouseFormData = z.infer<typeof houseSchema>;

function parseAddressData(data: any): AddressParts & { regionName?: string; cityName?: string } {
  return {
    city: data.city || data.settlement || '',
    street: data.street || '',
    house: data.house || '',
    korpus: data.block || '',
    stroenie: '',
    regionName: data.region || '',
    cityName: data.city || data.settlement || '',
  };
}

interface FlatFormProps {
  initialData?: any; // можно типизировать точнее
}

export function FlatForm({ initialData }: FlatFormProps) {
    const [isCityLoading, setIsCityLoading] = useState(false);
      const isEditing = !!initialData;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [houseDialogOpen, setHouseDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressParts | null>(null);
  const [selectedHouseId, setSelectedHouseId] = useState<string>('');
  const [addressInput, setAddressInput] = useState('');
  const [foundRegionId, setFoundRegionId] = useState<string | null>(null);
  const [foundCityId, setFoundCityId] = useState<string | null>(null);

  const { control, handleSubmit, setValue, reset, formState: { errors } } = useForm<FlatFormData>({
    resolver: zodResolver(flatSchema),
    defaultValues: {
      mnogoetazhka: '',
      nomer_kvartiry: '',
      kolichestvo_komnat: 1,
      zhilaya_ploshad: 30,
      etazh: 1,
      kolichestvo_sanuzlov: 1,
      tip_komnat: 'separate',
      remont: '',
    },
  });
  // Заполнение формы при наличии initialData
  useEffect(() => {
  if (initialData) {
    reset({
      mnogoetazhka: String(initialData.mnogoetazhka),
      nomer_kvartiry: initialData.nomer_kvartiry,
      kolichestvo_komnat: initialData.kolichestvo_komnat,
      zhilaya_ploshad: initialData.zhilaya_ploshad,
      etazh: initialData.etazh,
      kolichestvo_sanuzlov: initialData.kolichestvo_sanuzlov,
      tip_komnat: initialData.tip_komnat,
      remont: initialData.remont || '',
    });
    setSelectedHouseId(String(initialData.mnogoetazhka));
    if (initialData.mnogoetazhka_detail) {
      const house = initialData.mnogoetazhka_detail;
      const addr = `${house.gorod_tekst}, ${house.ulitsa} ${house.nomer_doma}`;
      setAddressInput(addr);
    }
  }
}, [initialData, reset]);


  const houseForm = useForm<HouseFormData>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      gorod_tekst: '',
      ulitsa: '',
      nomer_doma: '',
      korpus: '',
      stroenie: '',
      region: '',
      gorod: '',
      god_postroiki: new Date().getFullYear(),
      tip_doma: 'brick',
      etazhnost: 5,
      lift: false,
    },
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await api.get('/regions/');
      return res.data.results || res.data || [];
    },
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities', houseForm.watch('region')],
    queryFn: async () => {
      if (!houseForm.watch('region')) return [];
      const res = await api.get(`/cities/?region=${houseForm.watch('region')}`);
      return res.data.results || res.data || [];
    },
    enabled: !!houseForm.watch('region'),
  });

  const { data: existingHouse, isLoading: checkingHouse } = useHouseLookup(selectedAddress);

  useEffect(() => {
    if (existingHouse && !selectedHouseId) {
      setSelectedHouseId(String(existingHouse.id));
      setValue('mnogoetazhka', String(existingHouse.id));
    }
  }, [existingHouse, selectedHouseId, setValue]);

  const createHouseMutation = useMutation({
    mutationFn: async (data: HouseFormData) => {
      const payload = {
        ...data,
        region: parseInt(data.region),
        gorod: parseInt(data.gorod),
      };
      const res = await api.post('/apartments/', payload);
      return res.data;
    },
    onSuccess: (newHouse) => {
      setSelectedHouseId(String(newHouse.id));
      setValue('mnogoetazhka', String(newHouse.id));
      setHouseDialogOpen(false);
      houseForm.reset();
      toast.success('Дом создан');
      queryClient.invalidateQueries({ queryKey: ['objects'] });
    },
    onError: (error: any) => {
      toast.error('Ошибка при создании дома');
      console.error(error);
    },
  });

  const handleAddressSelect = (fullAddress: string, data: any) => {
  setAddressInput(fullAddress);
  const parts = parseAddressData(data);
  setSelectedAddress(parts);
  setSelectedHouseId('');
  setFoundRegionId(null);
  setFoundCityId(null);

    // Заполняем текстовые поля
    houseForm.setValue('gorod_tekst', parts.city || '');
    houseForm.setValue('ulitsa', parts.street || '');
    houseForm.setValue('nomer_doma', parts.house || '');
    houseForm.setValue('korpus', parts.korpus || '');
  };

    useEffect(() => {
  if (!selectedAddress?.cityName) return;
  setIsCityLoading(true);
  const fetchCity = async () => {
    try {
      const res = await api.get(`/cities/?search=${encodeURIComponent(selectedAddress.cityName!)}`);
      const citiesData = res.data.results || res.data;
      // Ищем город с точным совпадением названия (без учёта регистра)
      const exactCity = citiesData.find(
        (c: any) => c.nazvanie.toLowerCase() === selectedAddress.cityName!.toLowerCase()
      );
      if (exactCity) {
        setFoundCityId(String(exactCity.id));
        houseForm.setValue('gorod', String(exactCity.id));
        setFoundRegionId(String(exactCity.region));
        houseForm.setValue('region', String(exactCity.region));
      } else {
        console.warn('Город не найден в справочнике:', selectedAddress.cityName);
        // Можно оставить поля пустыми для ручного выбора
      }
    } catch (error) {
      console.error('Ошибка поиска города', error);
    } finally {
      setIsCityLoading(false);
    }
  };
  fetchCity();
}, [selectedAddress?.cityName]);

  const onSubmit = async (data: FlatFormData) => {
    try {
      const payload = {
        ...data,
        tip_sanuzla: [],
        balkon_ili_loggia: [],
        tekhnika: [],
        mebel: [],
      };
      if (isEditing) {
        await api.patch(`/flats/${initialData.id}/`, payload);
        toast.success('Квартира обновлена');
      } else {
        await api.post('/flats/', payload);
        toast.success('Квартира создана');
      }
      queryClient.invalidateQueries({ queryKey: ['objects'] });
      router.push('/objects');
    } catch (error: any) {
      console.error(error);
      toast.error('Ошибка при сохранении');
    }
  };

  useEffect(() => {
    if (
      selectedAddress &&
      !checkingHouse &&
      !existingHouse &&
      !selectedHouseId &&
      !isCityLoading // ← добавить условие
    ) {
      setHouseDialogOpen(true);
    }
  }, [selectedAddress, checkingHouse, existingHouse, selectedHouseId, isCityLoading]);
  useEffect(() => {
  if (cities.length > 0 && foundCityId) {
    const cityExists = cities.some((c: any) => String(c.id) === foundCityId);
    if (cityExists) {
      houseForm.setValue('gorod', foundCityId, { shouldValidate: true });
    }
  }
}, [cities, foundCityId, houseForm]);
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        <div className="space-y-2">
          <Label>Адрес дома *</Label>
          <AddressSuggest
            value={addressInput}
            onChange={setAddressInput}
            onSelect={handleAddressSelect}
            placeholder="Начните вводить адрес дома..."
          />
          {checkingHouse && <p className="text-sm text-gray-500">Проверка наличия дома...</p>}
          {selectedHouseId && (
            <p className="text-sm text-green-600">Дом найден, ID: {selectedHouseId}</p>
          )}
        </div>

        <input type="hidden" {...control.register('mnogoetazhka')} value={selectedHouseId} />

        <div className="space-y-2">
          <Label>Номер квартиры *</Label>
          <Controller
            control={control}
            name="nomer_kvartiry"
            render={({ field }) => <Input {...field} className="bg-white" />}
          />
          {errors.nomer_kvartiry && <p className="text-sm text-red-500">{errors.nomer_kvartiry.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Количество комнат *</Label>
          <Controller
            control={control}
            name="kolichestvo_komnat"
            render={({ field }) => <Input type="number" className="bg-white" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />}
          />
          {errors.kolichestvo_komnat && <p className="text-sm text-red-500">{errors.kolichestvo_komnat.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Жилая площадь (кв.м) *</Label>
          <Controller
            control={control}
            name="zhilaya_ploshad"
            render={({ field }) => <Input type="number" className="bg-white" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />}
          />
          {errors.zhilaya_ploshad && <p className="text-sm text-red-500">{errors.zhilaya_ploshad.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Этаж *</Label>
          <Controller
            control={control}
            name="etazh"
            render={({ field }) => <Input type="number" className="bg-white" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />}
          />
          {errors.etazh && <p className="text-sm text-red-500">{errors.etazh.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Число санузлов *</Label>
          <Controller
            control={control}
            name="kolichestvo_sanuzlov"
            render={({ field }) => <Input type="number" className="bg-white" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />}
          />
          {errors.kolichestvo_sanuzlov && <p className="text-sm text-red-500">{errors.kolichestvo_sanuzlov.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Тип комнат *</Label>
          <Controller
            control={control}
            name="tip_komnat"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="separate">Раздельные</SelectItem>
                  <SelectItem value="adjective">Смежные</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.tip_komnat && <p className="text-sm text-red-500">{errors.tip_komnat.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Ремонт</Label>
          <Controller
            control={control}
            name="remont"
            render={({ field }) => (
              <select
                value={field.value}
                onChange={field.onChange}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Без ремонта</option>
                <option value="euro">Евро</option>
                <option value="cosmetic">Косметический</option>
                <option value="capital">Капитальный</option>
                <option value="designer">Дизайнерский</option>
              </select>
            )}
          />
        </div>

        <Button type="submit" disabled={!selectedHouseId} className="bg-primary text-white">
          Создать
        </Button>
      </form>

      <Dialog open={houseDialogOpen} onOpenChange={setHouseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white z-[10000]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Создать новый дом</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={houseForm.handleSubmit((data) => createHouseMutation.mutate(data))}
            className="space-y-4 bg-white p-4 rounded-lg"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Регион *</Label>
                <select
                  {...houseForm.register('region')}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onChange={(e) => {
                    houseForm.setValue('region', e.target.value);
                    houseForm.setValue('gorod', ''); // сбрасываем город при смене региона
                  }}
                >
                  <option value="">Выберите регион</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.nazvanie}</option>
                  ))}
                </select>
                {houseForm.formState.errors.region && (
                  <p className="text-sm text-red-500">{houseForm.formState.errors.region.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Город *</Label>
                <select
                  {...houseForm.register('gorod')}
                  disabled={!houseForm.watch('region') || citiesLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  <option value="">
                    {citiesLoading ? 'Загрузка...' : 'Выберите город'}
                  </option>
                  {cities.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nazvanie}</option>
                  ))}
                </select>
                {houseForm.formState.errors.gorod && (
                  <p className="text-sm text-red-500">{houseForm.formState.errors.gorod.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Улица *</Label>
              <Input {...houseForm.register('ulitsa')} className="bg-white" />
              {houseForm.formState.errors.ulitsa && (
                <p className="text-sm text-red-500">{houseForm.formState.errors.ulitsa.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>Номер дома *</Label>
                <Input {...houseForm.register('nomer_doma')} className="bg-white" />
                {houseForm.formState.errors.nomer_doma && (
                  <p className="text-sm text-red-500">{houseForm.formState.errors.nomer_doma.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Корпус</Label>
                <Input {...houseForm.register('korpus')} className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Строение</Label>
                <Input {...houseForm.register('stroenie')} className="bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Год постройки *</Label>
                <Input type="number" {...houseForm.register('god_postroiki', { valueAsNumber: true })} className="bg-white" />
                {houseForm.formState.errors.god_postroiki && (
                  <p className="text-sm text-red-500">{houseForm.formState.errors.god_postroiki.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Этажность *</Label>
                <Input type="number" {...houseForm.register('etazhnost', { valueAsNumber: true })} className="bg-white" />
                {houseForm.formState.errors.etazhnost && (
                  <p className="text-sm text-red-500">{houseForm.formState.errors.etazhnost.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Тип дома *</Label>
              <select
                {...houseForm.register('tip_doma')}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="brick">Кирпичный</option>
                <option value="monolith">Монолитный</option>
                <option value="panel">Панельный</option>
              </select>
              {houseForm.formState.errors.tip_doma && (
                <p className="text-sm text-red-500">{houseForm.formState.errors.tip_doma.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="lift"
                {...houseForm.register('lift')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="lift" className="text-foreground">Лифт</Label>
            </div>

            <Button type="submit" disabled={createHouseMutation.isPending} className="bg-primary text-white">
              {createHouseMutation.isPending ? 'Создание...' : 'Создать дом'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}