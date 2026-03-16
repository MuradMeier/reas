import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { MapPin } from 'lucide-react';
import { useDebounce } from '@repo/hooks';

interface AddressSuggestProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (val: string, data?: any) => void;
  placeholder?: string;
}

export function AddressSuggest({ value, onChange, onSelect, placeholder }: AddressSuggestProps) {
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
          body: JSON.stringify({ query: debouncedQuery, count: 10 }),
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

  const handleSelect = (suggestion: any) => {
    onSelect(suggestion.value, suggestion.data);
    setShowSuggestions(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        placeholder={placeholder || "Введите адрес дома"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value && suggestions.length > 0 && setShowSuggestions(true)}
        className="w-full"
      />
      {loading && <div className="absolute right-2 top-2 text-sm">Загрузка...</div>}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto mt-1">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
              onClick={() => handleSelect(suggestion)}
            >
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{suggestion.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}