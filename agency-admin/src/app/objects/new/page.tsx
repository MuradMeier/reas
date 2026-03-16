'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Building, MapPin } from 'lucide-react';

export default function NewObjectPage() {
  const router = useRouter();

  const handleSelectType = (type: string) => {
    router.push(`/objects/${type}/new`);
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Выберите тип объекта</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleSelectType('flat')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Квартира
            </CardTitle>
            <CardDescription>Добавить квартиру в многоэтажном доме</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Укажите адрес, количество комнат, площадь, этаж и другие характеристики.
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleSelectType('detachedhouse')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Частный дом
            </CardTitle>
            <CardDescription>Добавить индивидуальный жилой дом</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Укажите адрес, площадь дома, участка, количество комнат, коммуникации.
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleSelectType('landplot')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Земельный участок
            </CardTitle>
            <CardDescription>Добавить земельный участок</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Укажите адрес, площадь, кадастровый номер, наличие коммуникаций.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}