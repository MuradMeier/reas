'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { RequestForm } from '@/components/forms/requests/RequestForm';
import api from '@repo/api-client';
import { Button } from '@/components/ui/button';

export default function EditRequestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const res = await api.get(`/requests/${id}/`);
      return res.data;
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full m-6" />;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Редактирование заявки #{id}</h1>
      <RequestForm initialData={request} isEdit />
      <Button variant="outline" onClick={() => router.back()}>Назад</Button>
    </div>
  );
}