'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BuyRentPreferencesFormProps {
  action: string;       // 'Купить' или 'Снять'
  objectType: string;   // 'Квартира', 'Дом', 'Участок', 'Комната'
  baseData: any;        // имя, телефон, согласие
  onCancel: () => void;
  onSubmit: (data: any) => void;
}

export default function BuyRentPreferencesForm({
  action,
  objectType,
  baseData,
  onCancel,
  onSubmit
}: BuyRentPreferencesFormProps) {
  // Схема валидации
  const schema = useMemo(() => {
    const baseSchema = z.object({
      region: z.string().optional(),
      city: z.string().optional(),
      district: z.string().optional(),
      microdistrict: z.string().optional(),
      metro: z.string().optional(),
      priceFrom: z.number().optional(),
      priceTo: z.number().optional(),
      areaFrom: z.number().optional(),
      areaTo: z.number().optional(),
      rooms: z.string().optional(),
      floorNotFirst: z.boolean().optional(),
      floorNotLast: z.boolean().optional(),
      renovation: z.string().optional(),
      houseType: z.string().optional(),
      yearBuiltFrom: z.number().optional(),
      landAreaFrom: z.number().optional(),
      landAreaTo: z.number().optional(),
      water: z.boolean().optional(),
      gas: z.boolean().optional(),
      sewerage: z.boolean().optional(),
      landType: z.string().optional(),
      // Для аренды
      withChildren: z.boolean().optional(),
      withPets: z.boolean().optional(),
      smoking: z.boolean().optional(),
      sleepingPlaces: z.number().optional(),
    });
    return baseSchema;
  }, []);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      region: '',
      city: '',
      district: '',
      microdistrict: '',
      metro: '',
      priceFrom: undefined,
      priceTo: undefined,
      areaFrom: undefined,
      areaTo: undefined,
      rooms: 'any',
      floorNotFirst: false,
      floorNotLast: false,
      renovation: 'any',
      houseType: 'any',
      yearBuiltFrom: undefined,
      landAreaFrom: undefined,
      landAreaTo: undefined,
      water: false,
      gas: false,
      sewerage: false,
      landType: 'any',
      withChildren: false,
      withPets: false,
      smoking: false,
      sleepingPlaces: undefined,
    },
  });

  const handleFormSubmit = (data: any) => {
    const fullData = { ...baseData, action, objectType, ...data };
    onSubmit(fullData);
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Параметры поиска</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <ScrollArea className="h-[60vh] pr-4">
            {/* Местоположение */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Местоположение</h3>
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Регион</FormLabel>
                    <FormControl>
                      <Input placeholder="Например, Московская область" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Город</FormLabel>
                    <FormControl>
                      <Input placeholder="Например, Москва" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Район</FormLabel>
                    <FormControl>
                      <Input placeholder="Район" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="microdistrict"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Микрорайон</FormLabel>
                    <FormControl>
                      <Input placeholder="Микрорайон" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Станция метро</FormLabel>
                    <FormControl>
                      <Input placeholder="Например, Площадь Восстания" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />

            {/* Цена и площадь */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Цена и площадь</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priceFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Цена от</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Цена до</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="areaFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Площадь от</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="areaTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Площадь до</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Параметры в зависимости от типа объекта */}
            {(objectType === 'Квартира' || objectType === 'Комната') && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Параметры квартиры/комнаты</h3>
                  <FormField
                    control={form.control}
                    name="rooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Количество комнат</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Любое" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">Любое</SelectItem>
                            <SelectItem value="studio">Студия</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4+">4+</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center space-x-4">
                    <FormField
                      control={form.control}
                      name="floorNotFirst"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">Не первый</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="floorNotLast"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">Не последний</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="renovation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ремонт</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Любой" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">Любой</SelectItem>
                            <SelectItem value="euro">Евро</SelectItem>
                            <SelectItem value="cosmetic">Косметический</SelectItem>
                            <SelectItem value="capital">Капитальный</SelectItem>
                            <SelectItem value="designer">Дизайнерский</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {objectType === 'Дом' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Параметры дома</h3>
                  <FormField
                    control={form.control}
                    name="rooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Количество комнат</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Любое" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">Любое</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4+">4+</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="houseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип дома</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Любой" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">Любой</SelectItem>
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
                    name="yearBuiltFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Год постройки не старше</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="landAreaFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Участок от (сотки)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="landAreaTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Участок до</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {objectType === 'Участок' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Параметры участка</h3>
                  <FormField
                    control={form.control}
                    name="landType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип участка</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Любой" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">Любой</SelectItem>
                            <SelectItem value="ИЖС">ИЖС</SelectItem>
                            <SelectItem value="СНТ">СНТ</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="water"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">Вода</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gas"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">Газ</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sewerage"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">Канализация</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Условия аренды (только для 'Снять') */}
            {action === 'Снять' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Условия аренды</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="withChildren"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">Можно с детьми</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="withPets"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">Можно с животными</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="smoking"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">Можно курить</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sleepingPlaces"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Спальных мест не менее</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>Назад</Button>
            <Button type="submit">Создать заявку</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}