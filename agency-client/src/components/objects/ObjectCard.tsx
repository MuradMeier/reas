import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchResult } from '@/components/forms/BuyRentForm';

interface ObjectCardProps {
  item: SearchResult;
}

export default function ObjectCard({ item }: ObjectCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video relative bg-muted">
        {item.image ? (
          <Image src={item.image} alt={item.title} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Нет фото
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold">{item.title}</h3>
        <p className="text-sm text-muted-foreground">{item.address}</p>
        <p className="mt-2">
          {item.price ? `${item.price.toLocaleString()} ₽` : 'Цена не указана'}
        </p>
        {item.area && <p className="text-sm">Площадь: {item.area} кв.м</p>}
        {item.rooms && <p className="text-sm">Комнат: {item.rooms}</p>}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Link href={`/objects/${item.type}/${item.id}`} passHref>
          <Button variant="outline" className="w-full">Подробнее</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}