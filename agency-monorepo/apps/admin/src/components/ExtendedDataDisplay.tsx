// ExtendedDataDisplay.tsx (исправленная версия)

'use client';

import { useQueries } from '@tanstack/react-query';
import api from '@repo/api-client';

const fieldToDictMap = {
  tip_sanuzla: { endpoint: '/bathroom-types/', valueKey: 'nazvanie' },
  balkon_ili_loggia: { endpoint: '/balcony-types/', valueKey: 'nazvanie' },
  tekhnika: { endpoint: '/technic-choices/', valueKey: 'vybor' },
  mebel: { endpoint: '/furniture-choices/', valueKey: 'vybor' },
  tip_vody: { endpoint: '/water-supply-types/', valueKey: 'nazvanie' },
  tip_kanalizatsii: { endpoint: '/severage-types/', valueKey: 'nazvanie' },
  mestopolozhenie_sanuzla: { endpoint: '/bathroom-locations/', valueKey: 'nazvanie' },
  kommunikatsii: { endpoint: '/communication-types/', valueKey: 'nazvanie' },
};

const fetchDict = async (endpoint: string) => {
  const res = await api.get(endpoint);
  return res.data.results || res.data || [];
};

const fieldLabels = {
  area: 'Площадь',
  price: 'Цена',
  address: 'Адрес',
  city: 'Город',
  street: 'Улица',
  houseNumber: 'Номер дома',
  apartmentNumber: 'Номер квартиры',
  plotNumber: 'Номер участка',
  kolichestvo_komnat: 'Количество комнат',
  floor: 'Этаж',
  totalFloors: 'Этажность дома',
  houseType: 'Тип дома',
  yearBuilt: 'Год постройки',
  elevator: 'Лифт',
  renovation: 'Ремонт',
  tip_sanuzla: 'Типы санузлов',
  balkon_ili_loggia: 'Балкон/лоджия',
  houseArea: 'Площадь дома',
  landArea: 'Площадь участка',
  floors: 'Этажность',
  kommunikatsii: 'Коммуникации',
  waterSupply: 'Водоснабжение',
  sewerage: 'Канализация',
  bathroomLocation: 'Расположение санузлов',
  cadastralNumber: 'Кадастровый номер',
  landType: 'Тип участка',
  water: 'Вода',
  gas: 'Газ',
  kanalizatsiya: 'Канализация',
  withChildren: 'С детьми',
  withPets: 'С животными',
  smoking: 'Курение',
  sleepingPlaces: 'Спальных мест',
  tekhnika: 'Техника',
  mebel: 'Мебель',
  tip_vody: 'Источники воды',
  tip_kanalizatsii: 'Типы канализации',
  mestopolozhenie_sanuzla: 'Расположение санузлов',
};

export const ExtendedDataDisplay = ({ data, propertyType, excludeKeys = [] }) => {
  const dictFields = Object.keys(fieldToDictMap).filter(f => data[f] && data[f].length > 0);
  const dictQueries = useQueries({
    queries: dictFields.map(f => ({
      queryKey: [fieldToDictMap[f].endpoint],
      queryFn: () => fetchDict(fieldToDictMap[f].endpoint),
      staleTime: Infinity,
    })),
  });

  const dictMaps = {};
  dictFields.forEach((field, idx) => {
    const q = dictQueries[idx];
    if (q.data) {
      const map = new Map();
      q.data.forEach(item => {
        const key = fieldToDictMap[field].valueKey;
        map.set(item.id, item[key] || item.nazvanie);
      });
      dictMaps[field] = map;
    }
  });

  const renderValue = (field, value) => {
    if (value === undefined || value === null || value === '') return '';
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      const map = dictMaps[field];
      if (map) {
        return value.map(id => map.get(Number(id)) || id).join(', ');
      }
      return value.join(', ');
    }
    if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
    return String(value);
  };

  const skipFields = [
    'imya', 'familiya', 'telefon', 'email', 'uvedomleniya_vklyucheny',
    'klient', 'id', 'object_id', 'object_type',
    ...(excludeKeys || [])
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(data).map(([key, value]) => {
        if (skipFields.includes(key)) return null;
        if (value === undefined || value === null || value === '') return null;
        const label = fieldLabels[key] || key;
        const display = renderValue(key, value);
        if (!display) return null;
        return (
          <div key={key}>
            <span className="text-sm font-medium">{label}:</span>{' '}
            <span className="text-sm">{display}</span>
          </div>
        );
      })}
    </div>
  );
};