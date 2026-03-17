'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import AdminObjectForm from '@/components/forms/objects/AdminObjectForm';
import api from '@repo/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const typeToComponent: Record<string, React.ComponentType<any>> = {
  flat: AdminObjectForm,
  detachedhouse: AdminObjectForm,
  landplot: AdminObjectForm,
  room: AdminObjectForm,
};

const typeLabels: Record<string, string> = {
  flat: 'Квартира',
  detachedhouse: 'Дом',
  landplot: 'Участок',
  room: 'Комната',
};

function NewObjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const fromRequest = searchParams.get('fromRequest');

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', fromRequest],
    queryFn: async () => {
      if (!fromRequest) return null;
      const res = await api.get(`/requests/${fromRequest}/`);
      return res.data;
    },
    enabled: !!fromRequest,
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  // Если тип не указан – показываем выбор типа
  if (!type) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Создание объекта</h1>
        <p className="text-muted-foreground mb-4">Выберите тип объекта:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(typeLabels).map(([key, label]) => (
            <Card key={key} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push(`/objects/new?type=${key}`)}>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Создать новый объект типа {label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Назад
        </Button>
      </div>
    );
  }

  // Если тип не поддерживается
  if (!typeToComponent[type]) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Ошибка</h1>
        <p className="text-muted-foreground mb-4">Тип объекта "{type}" не поддерживается.</p>
        <Button onClick={() => router.push('/objects/new')}>Выбрать другой тип</Button>
      </div>
    );
  }

  const Component = typeToComponent[type];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Создание {typeLabels[type]}</h1>
      <Component
        initialData={request?.extended_data || {}}
        objectType={typeLabels[type]}
        onCancel={() => router.back()}
        onSuccess={() => router.push('/objects')}
      />
      <Button variant="outline" onClick={() => router.back()} className="mt-4">
        Назад
      </Button>
    </div>
  );
}

export default function NewObjectPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <NewObjectContent />
    </Suspense>
  );
}