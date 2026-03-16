'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { FlatForm } from '@/components/forms/objects/FlatForm';
import api from '@repo/api-client';
import { Button } from '@/components/ui/button';

export default function EditObjectPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;

  const { data: object, isLoading } = useQuery({
    queryKey: ['object', type, id],
    queryFn: async () => {
      const endpoint = type === 'flat' ? `/flats/${id}/` : ''; // пока только квартира
      const res = await api.get(endpoint);
      return res.data;
    },
    enabled: type === 'flat', // только для квартиры
  });

  if (type !== 'flat') {
    return <div>Редактирование для этого типа пока не реализовано</div>;
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Редактирование квартиры #{id}</h1>
      <FlatForm initialData={object} />
      <Button variant="outline" onClick={() => router.back()}>Назад</Button>
    </div>
  );
}