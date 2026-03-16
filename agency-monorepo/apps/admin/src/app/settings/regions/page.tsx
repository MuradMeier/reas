'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import api from '@repo/api-client';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RegionSettingsPage() {
  const { isHeadRealtor, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [codes, setCodes] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['region-settings'],
    queryFn: async () => {
      const res = await api.get('/region-settings/1/');
      return res.data;
    },
    enabled: isHeadRealtor,
  });

  useEffect(() => {
    if (data) {
      setCodes(data.allowed_region_codes);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (newCodes: string[]) => {
      await api.patch('/region-settings/1/', { allowed_region_codes: newCodes });
    },
    onSuccess: () => {
      toast.success('Настройки сохранены');
      queryClient.invalidateQueries({ queryKey: ['region-settings'] });
    },
    onError: () => toast.error('Ошибка при сохранении'),
  });

  const handleAdd = () => {
    setCodes([...codes, '']);
  };

  const handleChange = (index: number, value: string) => {
    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);
  };

  const handleRemove = (index: number) => {
    setCodes(codes.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const filtered = codes.filter(c => c.trim() !== '').map(c => c.trim());
    mutation.mutate(filtered);
  };

  useEffect(() => {
    if (!authLoading && !isHeadRealtor) {
      router.push('/');
    }
  }, [authLoading, isHeadRealtor, router]);

  if (authLoading || !isHeadRealtor) return null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Настройки регионов</h1>

      <Card>
        <CardHeader>
          <CardTitle>Коды разрешенных регионов (КЛАДР)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p>Загрузка...</p>
          ) : (
            <>
              {codes.map((code, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={code}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    placeholder="Например, 77"
                    maxLength={2}
                    className="w-20"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={handleAdd} className="mt-2">
                <Plus className="h-4 w-4 mr-2" /> Добавить код
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={mutation.isPending}>
          Сохранить
        </Button>
      </div>
    </div>
  );
}