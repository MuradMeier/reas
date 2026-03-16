'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const router = useRouter();
  const { isHeadRealtor, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isHeadRealtor) {
        router.replace('/dashboard');
      } else {
        router.replace('/requests');
      }
    }
  }, [isLoading, isHeadRealtor, router]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return null;
}