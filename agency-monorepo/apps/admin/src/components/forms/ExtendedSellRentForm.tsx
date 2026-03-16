'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/contexts/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@repo/api-client';
import { useQuery } from '@tanstack/react-query';
import { AddressSuggest } from '@repo/ui';

// Вспомогательные хуки для загрузки справочников
const useBathroomTypes = () => useQuery({
  queryKey: ['bathroomTypes'],
  queryFn: async () => {
    const res = await api.get('/bathroom-types/');
    return res.data;
  }
});

const useBalconyTypes = () => useQuery({
  queryKey: ['balconyTypes'],
  queryFn: async () => {
    const res = await api.get('/balcony-types/');
    return res.data;
  }
});

const useTechnicChoices = () => useQuery({
  queryKey: ['technicChoices'],
  queryFn: async () => {
    const res = await api.get('/technic-choices/');
    return res.data;
  }
});

const useFurnitureChoices = () => useQuery({
  queryKey: ['furnitureChoices'],
  queryFn: async () => {
    const res = await api.get('/furniture-choices/');
    return res.data;
  }
});

const useCommunicationTypes = () => useQuery({
  queryKey: ['communicationTypes'],
  queryFn: async () => {
    const res = await api.get('/communication-types/');
    return res.data;
  }
});

const useWaterSupplyTypes = () => useQuery({
  queryKey: ['waterSupplyTypes'],
  queryFn: async () => {
    const res = await api.get('/water-supply-types/');
    return res.data;
  }
});

const useSeverageTypes = () => useQuery({
  queryKey: ['severageTypes'],
  queryFn: async () => {
    const res = await api.get('/severage-types/');
    return res.data;
  }
});

const useBathroomLocations = () => useQuery({
  queryKey: ['bathroomLocations'],
  queryFn: async () => {
    const res = await api.get('/bathroom-locations/');
    return res.data;
  }
});

interface AddressParts {
  city: string;
  street: string;
  house: string;
  korpus: string;
  stroenie: string;
  apartment?: string;
  regionName?: string;
  cityName?: string;
}

interface ExtendedSellRentFormProps {
  action: string;
  objectType: string;
  baseData: any; // данные из первой формы (имя, телефон, согласие)
  initialData?: any;
  onCancel: () => void;
  onSubmit: (data: any) => void;
}

export default function ExtendedSellRentForm({
  action,
  objectType,
  baseData,
  initialData,
  onCancel,
  onSubmit
}: ExtendedSellRentFormProps) {
  // Динамически создаём схему в зависимости от action и objectType
  const schema = useMemo(() => {
    const baseExtendedSchema = z.object({
      address: z.string().optional(),
      city: z.string().optional(),
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      apartmentNumber: z.string().optional(),
      korpus: z.string().optional(),
      stroenie: z.string().optional(),
      area: z.number().optional(),
      price: z.number().optional(),
      photos: z.any().optional(),
    });

    if (objectType === 'Квартира' || objectType === 'Комната') {
      let flatSchema = baseExtendedSchema.extend({
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
      if (action === 'Сдать') {
        flatSchema = flatSchema.extend({
          withChildren: z.boolean().optional(),
          withPets: z.boolean().optional(),
          smoking: z.boolean().optional(),
          sleepingPlaces: z.number().optional(),
        });
      }
      return flatSchema;
    } else if (objectType === 'Дом') {
      let houseSchema = baseExtendedSchema.extend({
        kolichestvo_komnat: z.number().optional(),
        houseArea: z.number().optional(),
        landArea: z.number().optional(),
        floors: z.number().optional(),
        houseType: z.string().optional(),
        yearBuilt: z.number().optional(),
        communications: z.array(z.string()).optional(),
        waterSupply: z.string().optional(),
        sewerage: z.string().optional(),
        bathroomLocation: z.string().optional(),
        tip_vody: z.array(z.string()).optional(),
        tip_kanalizatsii: z.array(z.string()).optional(),
        mestopolozhenie_sanuzla: z.array(z.string()).optional(),
      });
      if (action === 'Сдать') {
        houseSchema = houseSchema.extend({
          withChildren: z.boolean().optional(),
          withPets: z.boolean().optional(),
          smoking: z.boolean().optional(),
          sleepingPlaces: z.number().optional(),
        });
      }
      return houseSchema;
    } else {
      // Участок
      let landSchema = baseExtendedSchema.extend({
        cadastralNumber: z.string().optional(),
        landType: z.string().optional(),
        water: z.boolean().optional(),
        gas: z.boolean().optional(),
        sewerage: z.boolean().optional(),
      });
      if (action === 'Сдать') {
        landSchema = landSchema.extend({
          withChildren: z.boolean().optional(),
          withPets: z.boolean().optional(),
          smoking: z.boolean().optional(),
          sleepingPlaces: z.number().optional(),
        });
      }
      return landSchema;
    }
  }, [action, objectType]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      address: '',
      city: '',
      street: '',
      houseNumber: '',
      apartmentNumber: '',
      korpus: '',
      stroenie: '',
      area: undefined,
      price: undefined,
      photos: undefined,
      // Для квартиры/комнаты
      kolichestvo_komnat: undefined,
      floor: undefined,
      totalFloors: undefined,
      houseType: '',
      yearBuilt: undefined,
      elevator: false,
      renovation: '',
      technic: [],
      furniture: [],
      tip_sanuzla: [],
      balkon_ili_loggia: [],
      // Для дома
      houseArea: undefined,
      landArea: undefined,
      floors: undefined,
      communications: [],
      waterSupply: '',
      sewerage: '',
      bathroomLocation: '',
      tip_vody: [],
      tip_kanalizatsii: [],
      mestopolozhenie_sanuzla: [],
      // Для участка
      cadastralNumber: '',
      landType: '',
      water: false,
      gas: false,
      sewerage: false,
      // Для аренды
      withChildren: false,
      withPets: false,
      smoking: false,
      sleepingPlaces: undefined,
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  console.log('Form errors:', form.formState.errors);

  const [addressInput, setAddressInput] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressParts | null>(null);
  const settings = useSettings();
    const handleAddressSelect = (fullAddress: string, data: any) => {
    // Проверка региона
    const regionCode = data.region_kladr_id?.substring(0, 2);
    if (regionCode && !settings?.allowed_region_codes.includes(regionCode)) {
      toast.error('К сожалению, мы не работаем в данном регионе');
      setAddressInput('');
      setSelectedAddress(null);
      // Очищаем поля формы
      form.setValue('city', '');
      form.setValue('street', '');
      form.setValue('houseNumber', '');
      form.setValue('korpus', '');
      form.setValue('stroenie', '');
      form.setValue('apartmentNumber', '');
      return;
    }

    setAddressInput(fullAddress);
    const parts = parseAddressData(data);
    setSelectedAddress(parts);

    // Заполняем поля формы
    form.setValue('city', parts.city || '');
    form.setValue('street', parts.street || '');
    form.setValue('houseNumber', parts.house || '');
    form.setValue('korpus', parts.korpus || '');
    form.setValue('stroenie', parts.stroenie || '');
    if (parts.apartment) {
      form.setValue('apartmentNumber', parts.apartment);
    }
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

  // Загружаем справочники
  const { data: bathroomTypes } = useBathroomTypes();
  const { data: balconyTypes } = useBalconyTypes();
  const { data: technicChoices } = useTechnicChoices();
  const { data: furnitureChoices } = useFurnitureChoices();
  const { data: communicationTypes } = useCommunicationTypes();
  const { data: waterSupplyTypes } = useWaterSupplyTypes();
  const { data: severageTypes } = useSeverageTypes();
  const { data: bathroomLocations } = useBathroomLocations();

  const handleFormSubmit = (data: any) => {
    console.log('handleFormSubmit called with data:', data);
    const fullData = { ...baseData, action, objectType, ...data };
    onSubmit(fullData);
  };
    if (!settings) {
    return <Skeleton className="h-96 w-full" />;
  }
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Подробная информация об объекте</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <ScrollArea className="h-[60vh] pr-4">
            {/* Общие поля для всех типов */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Адрес объекта</FormLabel>
                    <FormControl>
                      <AddressSuggest
                        value={addressInput}
                        onChange={setAddressInput}
                        onSelect={handleAddressSelect}
                        placeholder="Начните вводить адрес..."
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Площадь {objectType === 'Участок' ? '(сотки)' : '(кв.м)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : Number(val));
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена (руб)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : Number(val));
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="photos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Фотографии</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          field.onChange(files);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Условные поля для номера квартиры/участка */}
            {(objectType === 'Квартира' || objectType === 'Комната') && (
              <FormField
                control={form.control}
                name="apartmentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер квартиры</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="42"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            {objectType === 'Участок' && (
              <FormField
                control={form.control}
                name="plotNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер участка</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <Separator className="my-4" />

            {/* Поля для квартиры/комнаты */}
            {(objectType === 'Квартира' || objectType === 'Комната') && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Характеристики {objectType === 'Комната' ? 'комнаты' : 'квартиры'}</h3>

                {objectType === 'Квартира' && (
                  <FormField
                    control={form.control}
                    name="kolichestvo_komnat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Количество комнат</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? undefined : Number(val));
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {/* Общие для квартиры и комнаты поля */}
                <FormField
                  control={form.control}
                  name="floor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Этаж</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalFloors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Этажность дома</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="houseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип дома</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="brick">Кирпичный</SelectItem>
                          <SelectItem value="monolith">Монолитный</SelectItem>
                          <SelectItem value="panel">Панельный</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearBuilt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Год постройки</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="elevator"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Лифт</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="renovation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ремонт</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип ремонта" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="euro">Евро</SelectItem>
                          <SelectItem value="cosmetic">Косметический</SelectItem>
                          <SelectItem value="capital">Капитальный</SelectItem>
                          <SelectItem value="designer">Дизайнерский</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="technic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Техника</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {technicChoices?.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`technic-${item.id}`}
                              checked={field.value?.includes(String(item.id)) ?? false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), String(item.id)]
                                  : field.value?.filter((id: string) => id !== String(item.id));
                                field.onChange(newValue);
                              }}
                            />
                            <Label htmlFor={`technic-${item.id}`}>{item.vybor}</Label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="furniture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Мебель</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {furnitureChoices?.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`furniture-${item.id}`}
                              checked={field.value?.includes(String(item.id)) ?? false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), String(item.id)]
                                  : field.value?.filter((id: string) => id !== String(item.id));
                                field.onChange(newValue);
                              }}
                            />
                            <Label htmlFor={`furniture-${item.id}`}>{item.vybor}</Label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                {/* Типы санузлов */}
                <FormField
                  control={form.control}
                  name="tip_sanuzla"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Типы санузлов</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {bathroomTypes?.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bathroom-${item.id}`}
                              checked={field.value?.includes(String(item.id)) ?? false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), String(item.id)]
                                  : field.value?.filter((id: string) => id !== String(item.id));
                                field.onChange(newValue);
                              }}
                            />
                            <Label htmlFor={`bathroom-${item.id}`}>{item.nazvanie}</Label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                {/* Типы балконов/лоджий */}
                <FormField
                  control={form.control}
                  name="balkon_ili_loggia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Балкон / лоджия</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {balconyTypes?.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`balcony-${item.id}`}
                              checked={field.value?.includes(String(item.id)) ?? false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), String(item.id)]
                                  : field.value?.filter((id: string) => id !== String(item.id));
                                field.onChange(newValue);
                              }}
                            />
                            <Label htmlFor={`balcony-${item.id}`}>{item.nazvanie}</Label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Поля для дома */}
            {objectType === 'Дом' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Характеристики дома</h3>
                <FormField
                  control={form.control}
                  name="kolichestvo_komnat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Количество комнат</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="houseArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Площадь дома (кв.м)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="landArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Площадь участка (сотки)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="floors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Этажность</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="houseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип дома</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="brick">Кирпичный</SelectItem>
                          <SelectItem value="monolith">Монолитный</SelectItem>
                          <SelectItem value="panel">Панельный</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearBuilt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Год постройки</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="communications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Коммуникации</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {communicationTypes?.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`comm-${item.id}`}
                              checked={field.value?.includes(String(item.id)) ?? false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), String(item.id)]
                                  : field.value?.filter((id: string) => id !== String(item.id));
                                field.onChange(newValue);
                              }}
                            />
                            <Label htmlFor={`comm-${item.id}`}>{item.nazvanie}</Label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
                {/* Источники воды (множественный выбор) */}
                <FormField
                  control={form.control}
                  name="tip_vody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Источники воды</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {waterSupplyTypes?.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`water-${item.id}`}
                              checked={field.value?.includes(String(item.id)) ?? false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), String(item.id)]
                                  : field.value?.filter((id: string) => id !== String(item.id));
                                field.onChange(newValue);
                              }}
                            />
                            <Label htmlFor={`water-${item.id}`}>{item.nazvanie}</Label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
                {/* Типы канализации (множественный выбор) */}
                <FormField
                  control={form.control}
                  name="tip_kanalizatsii"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Типы канализации</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {severageTypes?.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`sewer-${item.id}`}
                              checked={field.value?.includes(String(item.id)) ?? false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), String(item.id)]
                                  : field.value?.filter((id: string) => id !== String(item.id));
                                field.onChange(newValue);
                              }}
                            />
                            <Label htmlFor={`sewer-${item.id}`}>{item.nazvanie}</Label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
                {/* Местоположения санузлов (множественный выбор) */}
                <FormField
                  control={form.control}
                  name="mestopolozhenie_sanuzla"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Местоположение санузлов</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {bathroomLocations?.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bathloc-${item.id}`}
                              checked={field.value?.includes(String(item.id)) ?? false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), String(item.id)]
                                  : field.value?.filter((id: string) => id !== String(item.id));
                                field.onChange(newValue);
                              }}
                            />
                            <Label htmlFor={`bathloc-${item.id}`}>{item.nazvanie}</Label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Поля для участка */}
            {objectType === 'Участок' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Характеристики участка</h3>
                <FormField
                  control={form.control}
                  name="cadastralNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Кадастровый номер</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="landType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип участка</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ИЖС">ИЖС</SelectItem>
                          <SelectItem value="СНТ">СНТ</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="water"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Вода</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gas"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Газ</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sewerage"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Канализация</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Дополнительные поля для аренды (кроме участка) */}
            {action === 'Сдать' && objectType !== 'Участок' && (
              <div className="space-y-4 mt-4">
                <h3 className="text-lg font-medium">Условия аренды</h3>
                <FormField
                  control={form.control}
                  name="withChildren"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Можно с детьми</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="withPets"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Можно с животными</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smoking"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Можно курить</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sleepingPlaces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Количество спальных мест</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>Назад</Button>
            <Button type="submit">Отправить заявку</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}