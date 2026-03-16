'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea'; // добавить импорт
import { AddressSuggest } from '@repo/ui';
import api from '@repo/api-client';
import toast from 'react-hot-toast';

// Хуки для загрузки справочников (оставляем как есть)
const useBathroomTypes = () => useQuery({ queryKey: ['bathroomTypes'], queryFn: async () => { const res = await api.get('/bathroom-types/'); return res.data; } });
const useBalconyTypes = () => useQuery({ queryKey: ['balconyTypes'], queryFn: async () => { const res = await api.get('/balcony-types/'); return res.data; } });
const useTechnicChoices = () => useQuery({ queryKey: ['technicChoices'], queryFn: async () => { const res = await api.get('/technic-choices/'); return res.data; } });
const useFurnitureChoices = () => useQuery({ queryKey: ['furnitureChoices'], queryFn: async () => { const res = await api.get('/furniture-choices/'); return res.data; } });
const useCommunicationTypes = () => useQuery({ queryKey: ['communicationTypes'], queryFn: async () => { const res = await api.get('/communication-types/'); return res.data; } });
const useWaterSupplyTypes = () => useQuery({ queryKey: ['waterSupplyTypes'], queryFn: async () => { const res = await api.get('/water-supply-types/'); return res.data; } });
const useSeverageTypes = () => useQuery({ queryKey: ['severageTypes'], queryFn: async () => { const res = await api.get('/severage-types/'); return res.data; } });
const useBathroomLocations = () => useQuery({ queryKey: ['bathroomLocations'], queryFn: async () => { const res = await api.get('/bathroom-locations/'); return res.data; } });

interface AddressParts {
  city: string; street: string; house: string; korpus: string; stroenie: string; apartment?: string; regionName?: string; cityName?: string;
}

interface AdminObjectFormProps {
  objectType: string; // 'Квартира', 'Дом', 'Участок', 'Комната'
  initialData?: any;
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function AdminObjectForm({ objectType, initialData, onCancel, onSuccess }: AdminObjectFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!initialData?.id;

  const [addressInput, setAddressInput] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressParts | null>(null);
  const [selectedHouseId, setSelectedHouseId] = useState<string>(''); // для квартиры
  const settings = useSettings();

if (!settings) {
  return <Skeleton className="h-96 w-full" />;
}

  // Состояния для комнаты
  const [parentType, setParentType] = useState<'none' | 'kvartira' | 'dom'>('none');
  const [selectedKvartiraId, setSelectedKvartiraId] = useState<string>('');
  const [selectedDomId, setSelectedDomId] = useState<string>('');

  // Загрузка списка квартир для привязки комнаты
  const { data: kvartiry } = useQuery({
    queryKey: ['kvartiry'],
    queryFn: async () => {
      const res = await api.get('/flats/?page_size=1000');
      return res.data.results || res.data || [];
    },
    enabled: objectType === 'Комната' && parentType === 'kvartira',
  });

  // Загрузка списка домов для привязки комнаты
  const { data: domy } = useQuery({
    queryKey: ['domy'],
    queryFn: async () => {
      const res = await api.get('/detachedhouses/?page_size=1000');
      return res.data.results || res.data || [];
    },
    enabled: objectType === 'Комната' && parentType === 'dom',
  });

  // Схема валидации в зависимости от типа объекта
  const schema = useMemo(() => {
    const base = z.object({
      address: z.string().optional(),
      city: z.string().optional(),
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      apartmentNumber: z.string().optional(),
      korpus: z.string().optional(),
      stroenie: z.string().optional(),
      area: z.number().optional(),
      price: z.number().optional(),
      opublikovano: z.boolean().optional().default(false),
    });

    if (objectType === 'Квартира') {
      return base.extend({
        kolichestvo_komnat: z.number().optional(),
        floor: z.number().optional(),
        totalFloors: z.number().optional(),
        houseType: z.string().optional(),
        yearBuilt: z.number().optional(),
        elevator: z.boolean().optional(),
        renovation: z.string().optional(),
        technic: z.array(z.string()).optional(),
        furniture: z.array(z.string()).optional(),
        tip_sanuzla: z.array(z.string()).optional(),
        balkon_ili_loggia: z.array(z.string()).optional(),
      });
    } else if (objectType === 'Дом') {
      return base.extend({
        kolichestvo_komnat: z.number().optional(),
        houseArea: z.number().optional(),
        landArea: z.number().optional(),
        floors: z.number().optional(),
        houseType: z.string().optional(),
        yearBuilt: z.number().optional(),
        communications: z.array(z.string()).optional(),
        tip_vody: z.array(z.string()).optional(),
        tip_kanalizatsii: z.array(z.string()).optional(),
        mestopolozhenie_sanuzla: z.array(z.string()).optional(),
      });
    } else if (objectType === 'Участок') {
      return base.extend({
        cadastralNumber: z.string().optional(),
        landType: z.string().optional(),
        water: z.boolean().optional(),
        gas: z.boolean().optional(),
        sewerage: z.boolean().optional(),
      });
    } else if (objectType === 'Комната') {
      return base.extend({
        ploshad_komnaty: z.number().optional(),
        etazh: z.number().optional(),
        opisanie: z.string().optional(),
        // Поля для привязки к родительскому объекту
        // (не включаем в схему, будем обрабатывать отдельно)
      });
    } else {
      return base;
    }
  }, [objectType]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      address: '', city: '', street: '', houseNumber: '', apartmentNumber: '', korpus: '', stroenie: '', area: undefined, price: undefined, opublikovano: false,
      kolichestvo_komnat: undefined, floor: undefined, totalFloors: undefined, houseType: '', yearBuilt: undefined, elevator: false, renovation: '',
      technic: [], furniture: [], tip_sanuzla: [], balkon_ili_loggia: [],
      houseArea: undefined, landArea: undefined, floors: undefined, communications: [], tip_vody: [], tip_kanalizatsii: [], mestopolozhenie_sanuzla: [],
      cadastralNumber: '', landType: '', water: false, gas: false, sewerage: false,
      // Для комнаты
      ploshad_komnaty: undefined,
      etazh: undefined,
      opisanie: '',
    },
  });

  const { reset, setValue } = form;

  // Загружаем справочники
  const { data: bathroomTypes } = useBathroomTypes();
  const { data: balconyTypes } = useBalconyTypes();
  const { data: technicChoices } = useTechnicChoices();
  const { data: furnitureChoices } = useFurnitureChoices();
  const { data: communicationTypes } = useCommunicationTypes();
  const { data: waterSupplyTypes } = useWaterSupplyTypes();
  const { data: severageTypes } = useSeverageTypes();
  const { data: bathroomLocations } = useBathroomLocations();

  const createHouseMutation = useMutation({
    mutationFn: async (houseData: any) => {
      const payload = {
        gorod_tekst: houseData.city,
        ulitsa: houseData.street,
        nomer_doma: houseData.houseNumber,
        korpus: houseData.korpus || '',
        stroenie: houseData.stroenie || '',
        region: null,
        gorod: null,
        god_postroiki: houseData.yearBuilt || new Date().getFullYear(),
        tip_doma: houseData.houseType || 'brick',
        etazhnost: houseData.totalFloors || 5,
        lift: houseData.elevator || false,
      };
      const res = await api.post('/apartments/', payload);
      return res.data;
    },
    onSuccess: (newHouse) => {
      setSelectedHouseId(String(newHouse.id));
      setValue('mnogoetazhka', String(newHouse.id));
      toast.success('Дом создан автоматически');
    },
    onError: (error) => {
      toast.error('Ошибка при создании дома');
      console.error(error);
    },
  });

  // Стабилизируем initialData
  const prevInitialDataRef = useRef<any>(null);

  useEffect(() => {
    if (initialData && initialData !== prevInitialDataRef.current) {
      prevInitialDataRef.current = initialData;
      reset(initialData);

      const addressParts = [
        initialData.city,
        initialData.street,
        initialData.houseNumber,
        initialData.korpus,
        initialData.stroenie,
        initialData.apartmentNumber ? 'кв.' + initialData.apartmentNumber : ''
      ].filter(Boolean).join(', ');
      if (addressParts) setAddressInput(addressParts);
      else if (initialData.address) setAddressInput(initialData.address);

      // Для квартиры - автоматическое создание дома, если есть адрес
      if (objectType === 'Квартира' && !selectedHouseId && initialData.city && initialData.street && initialData.houseNumber) {
        createHouseMutation.mutate(initialData);
      }

      // Для комнаты - восстановить parentType и выбранный объект, если есть
      if (objectType === 'Комната') {
        if (initialData.kvartira) {
          setParentType('kvartira');
          setSelectedKvartiraId(String(initialData.kvartira));
        } else if (initialData.dom) {
          setParentType('dom');
          setSelectedDomId(String(initialData.dom));
        } else {
          setParentType('none');
        }
      }
    }
  }, [initialData, reset, objectType, selectedHouseId]);

  const handleAddressSelect = (fullAddress: string, data: any) => {
  // Проверка региона
  const regionCode = data.region_kladr_id?.substring(0, 2);
  if (regionCode && !settings.allowed_region_codes.includes(regionCode)) {
    toast.error('К сожалению, агентство не работает в данном регионе');
    setAddressInput('');
    setSelectedAddress(null);
    // Очищаем поля формы
    setValue('city', '');
    setValue('street', '');
    setValue('houseNumber', '');
    setValue('korpus', '');
    setValue('stroenie', '');
    setValue('apartmentNumber', '');
    return;
  }

  setAddressInput(fullAddress);
  const parts = parseAddressData(data);
  setSelectedAddress(parts);

  setValue('city', parts.city || '');
  setValue('street', parts.street || '');
  setValue('houseNumber', parts.house || '');
  setValue('korpus', parts.korpus || '');
  setValue('stroenie', parts.stroenie || '');
  if (parts.apartment) setValue('apartmentNumber', parts.apartment);
};

  function parseAddressData(data: any): AddressParts & { regionName?: string; cityName?: string } {
    return {
      city: data.city || data.settlement || '',
      street: data.street || '',
      house: data.house || '',
      korpus: data.block || '',
      stroenie: '',
      apartment: data.flat || '',
      regionName: data.region || '',
      cityName: data.city || data.settlement || '',
    };
  }

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let endpoint = '';
      let payload: any = { ...data };

      // Определяем endpoint и обрабатываем специфические поля
      if (objectType === 'Квартира') {
        endpoint = '/flats/';
        payload.mnogoetazhka = data.mnogoetazhka || selectedHouseId;
        payload.nomer_kvartiry = data.apartmentNumber || data.nomer_kvartiry || '';
        payload.zhilaya_ploshad = data.area || data.zhilaya_ploshad;
        payload.etazh = data.floor || data.etazh;
      } else if (objectType === 'Дом') {
        endpoint = '/detachedhouses/';
      } else if (objectType === 'Участок') {
        endpoint = '/landplots/';
      } else if (objectType === 'Комната') {
        endpoint = '/rooms/';
        // Для комнаты передаём связь с родителем, если выбрано
        if (parentType === 'kvartira' && selectedKvartiraId) {
          // В модели Komnata есть GenericForeignKey, поэтому нужно передать тип и id
          payload.tip_obekta = 'flat';  // или получить ContentType
          payload.id_obekta = Number(selectedKvartiraId);
        } else if (parentType === 'dom' && selectedDomId) {
          payload.tip_obekta = 'detachedhouse';
          payload.id_obekta = Number(selectedDomId);
        }
        // Убираем лишние поля, которые могут быть в data из-за общей формы
        delete payload.kolichestvo_komnat;
        delete payload.totalFloors;
        delete payload.houseType;
        delete payload.yearBuilt;
        delete payload.elevator;
        delete payload.renovation;
        delete payload.technic;
        delete payload.furniture;
        delete payload.tip_sanuzla;
        delete payload.balkon_ili_loggia;
        delete payload.communications;
        delete payload.tip_vody;
        delete payload.tip_kanalizatsii;
        delete payload.mestopolozhenie_sanuzla;
        delete payload.cadastralNumber;
        delete payload.landType;
        delete payload.water;
        delete payload.gas;
        delete payload.sewerage;
        // Оставляем только нужные поля
        payload = {
          ploshad_komnaty: data.ploshad_komnaty,
          etazh: data.etazh,
          opisanie: data.opisanie,
          opublikovano: data.opublikovano,
          ...(payload.tip_obekta ? { tip_obekta: payload.tip_obekta, id_obekta: payload.id_obekta } : {}),
        };
      } else {
        throw new Error('Неизвестный тип объекта');
      }

      // Добавляем массивы many-to-many, если есть
      if (objectType !== 'Комната') {
        payload = {
          ...payload,
          tekhnika: data.tekhnika || [],
          mebel: data.mebel || [],
          tip_sanuzla: data.tip_sanuzla || [],
          balkon_ili_loggia: data.balkon_ili_loggia || [],
          communications: data.communications || [],
          tip_vody: data.tip_vody || [],
          tip_kanalizatsii: data.tip_kanalizatsii || [],
          mestopolozhenie_sanuzla: data.mestopolozhenie_sanuzla || [],
        };
      }

      const url = isEditing ? `${endpoint}${initialData.id}/` : endpoint;
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await api({ method, url, data: payload });
      return response.data;
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Объект обновлён' : 'Объект создан');
      queryClient.invalidateQueries({ queryKey: ['objects'] });
      if (onSuccess) onSuccess();
      onCancel();
    },
    onError: (error: any) => {
      toast.error('Ошибка при сохранении');
      console.error(error);
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Редактирование' : 'Создание'} {objectType}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ScrollArea className="h-[60vh] pr-4">
            {/* Общие поля для всех типов */}
            <div className="space-y-4">
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Адрес объекта</FormLabel><FormControl>
                  <AddressSuggest value={addressInput} onChange={setAddressInput} onSelect={handleAddressSelect} placeholder="Начните вводить адрес..." />
                </FormControl></FormItem>
              )} />
              {objectType !== 'Комната' && (
                <>
                  <FormField control={form.control} name="area" render={({ field }) => (
                    <FormItem><FormLabel>Площадь {objectType === 'Участок' ? '(сотки)' : '(кв.м)'}</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel>Цена (руб)</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                </>
              )}
              <FormField control={form.control} name="opublikovano" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2"><FormControl>
                  <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                </FormControl><FormLabel>Опубликовано на сайте</FormLabel></FormItem>
              )} />
            </div>

            {/* Поля, специфичные для типа объекта */}
            {objectType === 'Квартира' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Характеристики квартиры</h3>
                  <FormField control={form.control} name="kolichestvo_komnat" render={({ field }) => (
                    <FormItem><FormLabel>Количество комнат</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="floor" render={({ field }) => (
                    <FormItem><FormLabel>Этаж</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="totalFloors" render={({ field }) => (
                    <FormItem><FormLabel>Этажность дома</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="houseType" render={({ field }) => (
                    <FormItem><FormLabel>Тип дома</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="brick">Кирпичный</SelectItem><SelectItem value="monolith">Монолитный</SelectItem><SelectItem value="panel">Панельный</SelectItem></SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="yearBuilt" render={({ field }) => (
                    <FormItem><FormLabel>Год постройки</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="elevator" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl><FormLabel>Лифт</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="renovation" render={({ field }) => (
                    <FormItem><FormLabel>Ремонт</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Выберите тип ремонта" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="euro">Евро</SelectItem><SelectItem value="cosmetic">Косметический</SelectItem><SelectItem value="capital">Капитальный</SelectItem><SelectItem value="designer">Дизайнерский</SelectItem></SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  {/* Many-to-many поля */}
                  <FormField control={form.control} name="technic" render={({ field }) => (
                    <FormItem><FormLabel>Техника</FormLabel><div className="grid grid-cols-2 gap-2">
                      {technicChoices?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={`technic-${item.id}`} checked={field.value?.includes(String(item.id)) ?? false}
                            onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), String(item.id)] : field.value?.filter((id: string) => id !== String(item.id)))} />
                          <Label htmlFor={`technic-${item.id}`}>{item.vybor}</Label>
                        </div>
                      ))}
                    </div></FormItem>
                  )} />
                  <FormField control={form.control} name="furniture" render={({ field }) => (
                    <FormItem><FormLabel>Мебель</FormLabel><div className="grid grid-cols-2 gap-2">
                      {furnitureChoices?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={`furniture-${item.id}`} checked={field.value?.includes(String(item.id)) ?? false}
                            onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), String(item.id)] : field.value?.filter((id: string) => id !== String(item.id)))} />
                          <Label htmlFor={`furniture-${item.id}`}>{item.vybor}</Label>
                        </div>
                      ))}
                    </div></FormItem>
                  )} />
                  <FormField control={form.control} name="tip_sanuzla" render={({ field }) => (
                    <FormItem><FormLabel>Типы санузлов</FormLabel><div className="grid grid-cols-2 gap-2">
                      {bathroomTypes?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={`bathroom-${item.id}`} checked={field.value?.includes(String(item.id)) ?? false}
                            onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), String(item.id)] : field.value?.filter((id: string) => id !== String(item.id)))} />
                          <Label htmlFor={`bathroom-${item.id}`}>{item.nazvanie}</Label>
                        </div>
                      ))}
                    </div></FormItem>
                  )} />
                  <FormField control={form.control} name="balkon_ili_loggia" render={({ field }) => (
                    <FormItem><FormLabel>Балкон / лоджия</FormLabel><div className="grid grid-cols-2 gap-2">
                      {balconyTypes?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={`balcony-${item.id}`} checked={field.value?.includes(String(item.id)) ?? false}
                            onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), String(item.id)] : field.value?.filter((id: string) => id !== String(item.id)))} />
                          <Label htmlFor={`balcony-${item.id}`}>{item.nazvanie}</Label>
                        </div>
                      ))}
                    </div></FormItem>
                  )} />
                </div>
              </>
            )}

            {objectType === 'Дом' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Характеристики дома</h3>
                  <FormField control={form.control} name="kolichestvo_komnat" render={({ field }) => (
                    <FormItem><FormLabel>Количество комнат</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="houseArea" render={({ field }) => (
                    <FormItem><FormLabel>Площадь дома (кв.м)</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="landArea" render={({ field }) => (
                    <FormItem><FormLabel>Площадь участка (сотки)</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="floors" render={({ field }) => (
                    <FormItem><FormLabel>Этажность</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="houseType" render={({ field }) => (
                    <FormItem><FormLabel>Тип дома</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="brick">Кирпичный</SelectItem><SelectItem value="monolith">Монолитный</SelectItem><SelectItem value="panel">Панельный</SelectItem></SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="yearBuilt" render={({ field }) => (
                    <FormItem><FormLabel>Год постройки</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="communications" render={({ field }) => (
                    <FormItem><FormLabel>Коммуникации</FormLabel><div className="grid grid-cols-2 gap-2">
                      {communicationTypes?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={`comm-${item.id}`} checked={field.value?.includes(String(item.id)) ?? false}
                            onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), String(item.id)] : field.value?.filter((id: string) => id !== String(item.id)))} />
                          <Label htmlFor={`comm-${item.id}`}>{item.nazvanie}</Label>
                        </div>
                      ))}
                    </div></FormItem>
                  )} />
                  <FormField control={form.control} name="tip_vody" render={({ field }) => (
                    <FormItem><FormLabel>Источники воды</FormLabel><div className="grid grid-cols-2 gap-2">
                      {waterSupplyTypes?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={`water-${item.id}`} checked={field.value?.includes(String(item.id)) ?? false}
                            onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), String(item.id)] : field.value?.filter((id: string) => id !== String(item.id)))} />
                          <Label htmlFor={`water-${item.id}`}>{item.nazvanie}</Label>
                        </div>
                      ))}
                    </div></FormItem>
                  )} />
                  <FormField control={form.control} name="tip_kanalizatsii" render={({ field }) => (
                    <FormItem><FormLabel>Типы канализации</FormLabel><div className="grid grid-cols-2 gap-2">
                      {severageTypes?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={`sewer-${item.id}`} checked={field.value?.includes(String(item.id)) ?? false}
                            onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), String(item.id)] : field.value?.filter((id: string) => id !== String(item.id)))} />
                          <Label htmlFor={`sewer-${item.id}`}>{item.nazvanie}</Label>
                        </div>
                      ))}
                    </div></FormItem>
                  )} />
                  <FormField control={form.control} name="mestopolozhenie_sanuzla" render={({ field }) => (
                    <FormItem><FormLabel>Местоположение санузлов</FormLabel><div className="grid grid-cols-2 gap-2">
                      {bathroomLocations?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={`bathloc-${item.id}`} checked={field.value?.includes(String(item.id)) ?? false}
                            onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), String(item.id)] : field.value?.filter((id: string) => id !== String(item.id)))} />
                          <Label htmlFor={`bathloc-${item.id}`}>{item.nazvanie}</Label>
                        </div>
                      ))}
                    </div></FormItem>
                  )} />
                </div>
              </>
            )}

            {objectType === 'Участок' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Характеристики участка</h3>
                  <FormField control={form.control} name="cadastralNumber" render={({ field }) => (
                    <FormItem><FormLabel>Кадастровый номер</FormLabel><FormControl>
                      <Input value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || undefined)} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="landType" render={({ field }) => (
                    <FormItem><FormLabel>Тип участка</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="ИЖС">ИЖС</SelectItem><SelectItem value="СНТ">СНТ</SelectItem></SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="water" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl><FormLabel>Вода</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="gas" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl><FormLabel>Газ</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="sewerage" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl><FormLabel>Канализация</FormLabel></FormItem>
                  )} />
                </div>
              </>
            )}

            {objectType === 'Комната' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Характеристики комнаты</h3>
                  <FormField control={form.control} name="ploshad_komnaty" render={({ field }) => (
                    <FormItem><FormLabel>Площадь комнаты (кв.м)</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="etazh" render={({ field }) => (
                    <FormItem><FormLabel>Этаж</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="opisanie" render={({ field }) => (
                    <FormItem><FormLabel>Описание</FormLabel><FormControl>
                      <Textarea value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} rows={4} />
                    </FormControl></FormItem>
                  )} />

                  {/* Привязка к родительскому объекту */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Привязка к объекту</h4>
                    <Select value={parentType} onValueChange={(v: any) => setParentType(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите, если комната в составе объекта" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не привязана</SelectItem>
                        <SelectItem value="kvartira">В квартире</SelectItem>
                        <SelectItem value="dom">В доме</SelectItem>
                      </SelectContent>
                    </Select>

                    {parentType === 'kvartira' && (
                      <Select value={selectedKvartiraId} onValueChange={setSelectedKvartiraId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите квартиру" />
                        </SelectTrigger>
                        <SelectContent>
                          {kvartiry?.map((k: any) => (
                            <SelectItem key={k.id} value={String(k.id)}>
                              {k.address || `Квартира #${k.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {parentType === 'dom' && (
                      <Select value={selectedDomId} onValueChange={setSelectedDomId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите дом" />
                        </SelectTrigger>
                        <SelectContent>
                          {domy?.map((d: any) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.address || `Дом #${d.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Создать')}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}