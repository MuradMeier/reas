// apps/client/src/app/page.tsx
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SellRentForm from '@/components/forms/SellRentForm';
import BuyRentForm from '@/components/forms/BuyRentForm';
import { Building2, Home, Search } from 'lucide-react';

const actionOptions = ['Продать', 'Сдать', 'Купить', 'Снять'];
const objectOptions = ['Комната', 'Квартира', 'Дом', 'Участок'];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilterValues = useMemo(() => ({
    region: searchParams.get('region') || '',
    city: searchParams.get('city') || '',
    cityRadius: searchParams.get('cityRadius') || '',
    district: searchParams.get('district') || '',
    microdistrict: searchParams.get('microdistrict') || '',
    metro: searchParams.get('metro') || '',
    exactAddress: searchParams.get('exactAddress') || '',
    addressRadius: searchParams.get('addressRadius') || '',
    priceFrom: searchParams.get('priceFrom') || '',
    priceTo: searchParams.get('priceTo') || '',
    areaFrom: searchParams.get('areaFrom') || '',
    areaTo: searchParams.get('areaTo') || '',
    rooms: searchParams.get('rooms') || '',
    floorNotFirst: searchParams.get('floorNotFirst') === 'true',
    floorNotLast: searchParams.get('floorNotLast') === 'true',
    renovation: searchParams.get('renovation') || '',
    withChildren: searchParams.get('withChildren') === 'true',
    withPets: searchParams.get('withPets') === 'true',
    smoking: searchParams.get('smoking') === 'true',
    sleepingPlaces: searchParams.get('sleepingPlaces') || '',
    houseType: searchParams.get('houseType') || '',
    yearBuiltFrom: searchParams.get('yearBuiltFrom') || '',
    landAreaFrom: searchParams.get('landAreaFrom') || '',
    landAreaTo: searchParams.get('landAreaTo') || '',
    water: searchParams.get('water') === 'true',
    gas: searchParams.get('gas') === 'true',
    sewerage: searchParams.get('sewerage') === 'true',
    landType: searchParams.get('landType') || '',
  }), [searchParams]);

  const [action, setAction] = useState(searchParams.get('action') || '');
  const [objectType, setObjectType] = useState(searchParams.get('objectType') || '');

  // Обновление URL при изменении action/objectType
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (action) params.set('action', action);
    else params.delete('action');
    if (objectType) params.set('objectType', objectType);
    else params.delete('objectType');
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [action, objectType, searchParams, router]);

  // Функция для обновления URL всеми параметрами формы при нажатии «Найти»
  const onSearchParamsChange = useCallback((values: any) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });
    // action и objectType тоже должны остаться
    if (action) params.set('action', action);
    else params.delete('action');
    if (objectType) params.set('objectType', objectType);
    else params.delete('objectType');
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, action, objectType, router]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Найти недвижимость в Московской и Калужской областях
          </h1>
          <p className="text-xl text-gray-600">
            Квартиры, дома, участки — проверенные варианты от агентства «АН САБР»
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Select onValueChange={setAction} value={action}>
                <SelectTrigger className="w-full h-12 text-base border-2 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Что хотите сделать?" />
                </SelectTrigger>
                <SelectContent>
                  {actionOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select onValueChange={setObjectType} value={objectType}>
                <SelectTrigger className="w-full h-12 text-base border-2 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Какой объект?" />
                </SelectTrigger>
                <SelectContent>
                  {objectOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {action && objectType && (
            <div className="mt-8 animate-fadeIn">
              {action === 'Продать' || action === 'Сдать' ? (
                <SellRentForm action={action} objectType={objectType} />
              ) : (
                <BuyRentForm
                  action={action}
                  objectType={objectType}
                  initialValues={initialFilterValues}
                  onSearch={onSearchParamsChange}
                />
              )}
            </div>
          )}
        </div>

        {/* Блок с преимуществами */}
        <div className="max-w-6xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Удобный поиск</h3>
            <p className="text-gray-600">Фильтруйте объекты по параметрам, находите идеальный вариант</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Проверенные объекты</h3>
            <p className="text-gray-600">Все объекты проходят проверку перед публикацией</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Быстрая заявка</h3>
            <p className="text-gray-600">Оставьте заявку — мы перезвоним в течение 15 минут</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <HomeContent />
    </Suspense>
  );
}