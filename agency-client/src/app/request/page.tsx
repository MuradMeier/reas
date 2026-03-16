'use client';

import { useSearchParams } from 'next/navigation';
import SellRentForm from '@/components/forms/SellRentForm';

export default function RequestPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  // Здесь нужно преобразовать type в objectType ('Квартира', 'Дом', 'Участок')
  const objectTypeMap: Record<string, string> = {
    flat: 'Квартира',
    detachedhouse: 'Дом',
    landplot: 'Участок',
    apartment: 'Дом', // если нужно
  };

  const objectType = type ? objectTypeMap[type] : '';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Оставить заявку</h1>
      <SellRentForm action="Купить" objectType={objectType} />
      {/* ID объекта можно передать через контекст или скрытое поле; пока не реализовано */}
    </div>
  );
}