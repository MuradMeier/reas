import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './ui/command';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { cn } from './lib/utils';
import api from '@repo/api-client';
import { useDebounce } from '@repo/hooks';
import { Region, City, District, MetroStation, Microdistrict } from '@repo/types';

interface LocationFieldsProps {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  onAddressSelect?: (fullAddress: string, data: any) => void;
}

// Компонент для подсказок адреса
const AddressSuggest = ({ value, onChange, onSelect }: { value: string; onChange: (val: string) => void; onSelect: (fullAddress: string, data: any) => void; }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(value, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_DADATA_API_KEY;

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery || debouncedQuery.length < 3 || !apiKey) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${apiKey}`,
          },
          body: JSON.stringify({ query: debouncedQuery, count: 5 }),
        });
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Ошибка загрузки подсказок', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [debouncedQuery, apiKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        placeholder="Улица, дом"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value && suggestions.length > 0 && setShowSuggestions(true)}
        className="w-full"
      />
      {loading && <div className="absolute right-2 top-2 text-sm">Загрузка...</div>}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto mt-1">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
              onClick={() => {
                onSelect(suggestion.value, suggestion.data);
                setShowSuggestions(false);
              }}
            >
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{suggestion.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export function LocationFields({ register, watch, setValue, onAddressSelect }: LocationFieldsProps) {
  const [citySearch, setCitySearch] = useState('');
  const [cityId, setCityId] = useState<string | null>(null);
  const [districtSearch, setDistrictSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');
  const [regionOpen, setRegionOpen] = useState(false);
  const [microdistrictSearch, setMicrodistrictSearch] = useState('');
  const [metroSearch, setMetroSearch] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [microdistrictOpen, setMicrodistrictOpen] = useState(false);
  const [metroOpen, setMetroOpen] = useState(false);

  const region = watch('region');
  useEffect(() => {
  const currentCity = watch('city');
  if (currentCity) setCityId(currentCity);
}, [watch('city')]);
  const districtId = watch('district');
  const microdistrictId = watch('microdistrict');
  const metroId = watch('metro');
  const exactAddress = watch('exactAddress');

  const debouncedCitySearch = useDebounce(citySearch, 300);
  const debouncedDistrictSearch = useDebounce(districtSearch, 300);
  const debouncedMicrodistrictSearch = useDebounce(microdistrictSearch, 300);
  const debouncedMetroSearch = useDebounce(metroSearch, 300);

  // Запрос регионов
  const { data: regions = [], isLoading: regionsLoading } = useQuery({
      queryKey: ['regions'],
      queryFn: async () => {
        const res = await api.get('/regions/');
        return res.data.results || res.data || [];
      },
    });
  // Запрос городов
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
const [isCityLoading, setIsCityLoading] = useState(false);

// Эффект для поиска городов через DaData при изменении citySearch или region
useEffect(() => {
  const fetchCities = async () => {
    if (!citySearch || citySearch.length < 2) {
      setCitySuggestions([]);
      return;
    }

    // Получаем название региона по ID
    let regionName = '';
    if (region) {
      const selectedRegion = regions.find((r: Region) => String(r.id) === region);
      regionName = selectedRegion?.nazvanie || '';
    }

    setIsCityLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_DADATA_API_KEY;
      if (!apiKey) throw new Error('No DaData key');

      const requestBody: any = {
        query: citySearch,
        count: 10,
        from_bound: { value: 'city' },
        to_bound: { value: 'city' },
      };
      // Добавляем фильтр по региону, если выбран
      if (regionName) {
        requestBody.locations = [{ region: regionName }];
      }

      const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      // Преобразуем в формат, похожий на наш City
      const suggestions = (data.suggestions || []).map((s: any) => ({
        id: null, // у DaData нет нашего ID
        nazvanie: s.data.city || s.value.split(',')[0],
        // можно сохранить и другие данные
      }));
      setCitySuggestions(suggestions);
    } catch (error) {
      console.error('DaData error', error);
      setCitySuggestions([]);
    } finally {
      setIsCityLoading(false);
    }
  };

  const debounceTimer = setTimeout(fetchCities, 300);
  return () => clearTimeout(debounceTimer);
}, [citySearch, region, regions])

  // Запрос районов
  const { data: districts = [], isLoading: districtsLoading } = useQuery({
    queryKey: ['districts', cityId, debouncedDistrictSearch],
    queryFn: async () => {
      if (!cityId && !debouncedDistrictSearch) return [];
      const params = new URLSearchParams();
      if (cityId) params.append('city', Number(cityId));
      if (debouncedDistrictSearch) params.append('search', debouncedDistrictSearch);
      const res = await api.get(`/districts/?${params.toString()}`);
      return res.data.results || res.data || [];
    },
    enabled: !!(cityId || debouncedDistrictSearch),
  });

  // Запрос микрорайонов
  const { data: microdistricts = [], isLoading: microdistrictsLoading } = useQuery({
    queryKey: ['microdistricts', districtId, debouncedMicrodistrictSearch],
    queryFn: async () => {
      if (!districtId && !debouncedMicrodistrictSearch) return [];
      const params = new URLSearchParams();
      if (districtId) params.append('raion', Number(districtId));
      if (debouncedMicrodistrictSearch) params.append('search', debouncedMicrodistrictSearch);
      const res = await api.get(`/microdistricts/?${params.toString()}`);
      return res.data.results || res.data || [];
    },
    enabled: !!(districtId || debouncedMicrodistrictSearch),
  });

  // Запрос станций метро
  const { data: metroStations = [], isLoading: metroLoading } = useQuery({
    queryKey: ['metro', cityId, debouncedMetroSearch],
    queryFn: async () => {
      if (!cityId && !debouncedMetroSearch) return [];
      const params = new URLSearchParams();
      if (cityId) params.append('gorod', Number(cityId));
      if (debouncedMetroSearch) params.append('search', debouncedMetroSearch);
      const res = await api.get(`/metro-stations/?${params.toString()}`);
      return res.data.results || res.data || [];
    },
    enabled: !!(cityId || debouncedMetroSearch),
  });

  // Сброс зависимых полей
  React.useEffect(() => {
    setValue('city', '');
    setValue('district', '');
    setValue('microdistrict', '');
    setValue('metro', '');
  }, [region, setValue]);

  React.useEffect(() => {
    setValue('district', '');
    setValue('microdistrict', '');
    setValue('metro', '');
  }, [cityId, setValue]);

  React.useEffect(() => {
    setValue('microdistrict', '');
  }, [districtId, setValue]);

  return (
    <div className="space-y-4 border p-4 rounded-lg">
      <h3 className="text-lg font-medium">Где ищем?</h3>

      {/* Регион с поиском */}
      <div className="space-y-2">
        <Label>Область/регион</Label>
        <Popover open={regionOpen} onOpenChange={setRegionOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={regionOpen} className="w-full justify-between">
            {region ? regions.find((r: Region) => String(r.id) === region)?.nazvanie : 'Введите или выберите регион...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Поиск региона..." value={regionSearch} onValueChange={setRegionSearch} />
            {regionsLoading && <CommandEmpty>Загрузка...</CommandEmpty>}
            {!regionsLoading && regions.length === 0 && <CommandEmpty>Регионы не найдены</CommandEmpty>}
            <CommandGroup>
              {regions
                .filter((r: Region) =>
                  !regionSearch || r.nazvanie.toLowerCase().includes(regionSearch.toLowerCase())
                )
                .map((r: Region) => (
                  <CommandItem
                    key={r.id}
                    value={String(r.id)}
                    onSelect={(currentValue) => {
                      setValue('region', currentValue);
                      setRegionOpen(false);
                      setRegionSearch('');
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', region === String(r.id) ? 'opacity-100' : 'opacity-0')} />
                    {r.nazvanie}
                  </CommandItem>
                ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
        </Popover>
        </div>

     {/* Город */}
<div className="space-y-2">
  <Label>Город</Label>
  <Popover open={cityOpen} onOpenChange={setCityOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" role="combobox" aria-expanded={cityOpen} className="w-full justify-between">
        {cityId ? citySuggestions.find(c => String(c.id) === cityId)?.nazvanie : 'Введите или выберите город...'}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-full p-0">
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Поиск города..."
          value={citySearch}
          onValueChange={setCitySearch}
        />
        {isCityLoading && <CommandEmpty>Загрузка...</CommandEmpty>}
        {!isCityLoading && citySuggestions.length === 0 && citySearch && <CommandEmpty>Города не найдены</CommandEmpty>}
        {!isCityLoading && !citySearch && <CommandEmpty>Начните вводить название города</CommandEmpty>}
        <CommandGroup>
          {citySuggestions.map((c: any, idx: number) => (
            <CommandItem
              key={idx}
              value={c.nazvanie}
              onSelect={() => {
                // При выборе города сохраняем его название, ID пока нет
                setValue('city', c.nazvanie);
                setCityId(c.nazvanie); // если нужно хранить отдельно
                setCityOpen(false);
                setCitySearch('');
              }}
            >
              <Check className={cn('mr-2 h-4 w-4', cityId === c.nazvanie ? 'opacity-100' : 'opacity-0')} />
              {c.nazvanie}
            </CommandItem>
          ))}
        </CommandGroup>
      </Command>
    </PopoverContent>
  </Popover>
</div>\

      {cityId && (
        <div className="space-y-2">
          <Label>Радиус от города (км)</Label>
          <Input type="number" placeholder="Например: 10" {...register('cityRadius')} />
        </div>
      )}

      {/* Район */}
      {(cityId || districtSearch) && (
        <div className="space-y-2">
          <Label>Район</Label>
          <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={districtOpen} className="w-full justify-between">
                {districtId ? districts.find((d: District) => String(d.id) === districtId)?.nazvanie : 'Введите или выберите район...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Поиск района..." value={districtSearch} onValueChange={setDistrictSearch} />
                {districtsLoading && <CommandEmpty>Загрузка...</CommandEmpty>}
                {!districtsLoading && districts.length === 0 && <CommandEmpty>Районы не найдены</CommandEmpty>}
                <CommandGroup>
                  {districts.map((d: District) => (
                    <CommandItem
                      key={d.id}
                      value={String(d.id)}
                      onSelect={(currentValue) => {
                        setValue('district', currentValue);
                        setDistrictOpen(false);
                        setDistrictSearch('');
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', districtId === String(d.id) ? 'opacity-100' : 'opacity-0')} />
                      {d.nazvanie}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Микрорайон */}
      {(districtId || microdistrictSearch) && (
        <div className="space-y-2">
          <Label>Микрорайон</Label>
          <Popover open={microdistrictOpen} onOpenChange={setMicrodistrictOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={microdistrictOpen} className="w-full justify-between">
                {microdistrictId ? microdistricts.find((m: Microdistrict) => String(m.id) === microdistrictId)?.nazvanie : 'Введите или выберите микрорайон...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Поиск микрорайона..." value={microdistrictSearch} onValueChange={setMicrodistrictSearch} />
                {microdistrictsLoading && <CommandEmpty>Загрузка...</CommandEmpty>}
                {!microdistrictsLoading && microdistricts.length === 0 && <CommandEmpty>Микрорайоны не найдены</CommandEmpty>}
                <CommandGroup>
                  {microdistricts.map((m: Microdistrict) => (
                    <CommandItem
                      key={m.id}
                      value={String(m.id)}
                      onSelect={(currentValue) => {
                        setValue('microdistrict', currentValue);
                        setMicrodistrictOpen(false);
                        setMicrodistrictSearch('');
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', microdistrictId === String(m.id) ? 'opacity-100' : 'opacity-0')} />
                      {m.nazvanie}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Метро */}
      {(cityId || metroSearch) && (
        <div className="space-y-2">
          <Label>Метро</Label>
          <Popover open={metroOpen} onOpenChange={setMetroOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={metroOpen} className="w-full justify-between">
                {metroId ? metroStations.find((m: MetroStation) => String(m.id) === metroId)?.nazvanie : 'Введите или выберите станцию...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Поиск станции..." value={metroSearch} onValueChange={setMetroSearch} />
                {metroLoading && <CommandEmpty>Загрузка...</CommandEmpty>}
                {!metroLoading && metroStations.length === 0 && <CommandEmpty>Станции не найдены</CommandEmpty>}
                <CommandGroup>
                  {metroStations.map((m: MetroStation) => (
                    <CommandItem
                      key={m.id}
                      value={String(m.id)}
                      onSelect={(currentValue) => {
                        setValue('metro', currentValue);
                        setMetroOpen(false);
                        setMetroSearch('');
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', metroId === String(m.id) ? 'opacity-100' : 'opacity-0')} />
                      {m.nazvanie}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Точный адрес с подсказками */}
        <div className="space-y-2">
    <Label>Точный адрес</Label>
    <AddressSuggest
      value={exactAddress}
      onChange={(val) => setValue('exactAddress', val)}
      onSelect={(val, data) => {
        if (onAddressSelect) {
          onAddressSelect(val, data); // вызываем внешний обработчик, если передан
        } else {
          setValue('exactAddress', val); // поведение по умолчанию
        }
      }}
    />
      </div>

      {exactAddress && (
        <div className="space-y-2">
          <Label>Радиус от адреса (км)</Label>
          <Input type="number" placeholder="Например: 5" {...register('addressRadius')} />
        </div>
      )}
    </div>
  );
}