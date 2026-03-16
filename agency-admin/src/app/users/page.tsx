'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  groups: number[];
}

export default function UsersPage() {
  const { isHeadRealtor, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users/');
      return res.data.results || res.data;
    },
    enabled: isHeadRealtor,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<User>) => api.post('/users/', data),
    onSuccess: () => {
      toast.success('Пользователь создан');
      refetch();
      setOpen(false);
    },
    onError: () => toast.error('Ошибка'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; updates: Partial<User> }) =>
      api.patch(`/users/${data.id}/`, data.updates),
    onSuccess: () => {
      toast.success('Пользователь обновлён');
      refetch();
      setEditingUser(null);
    },
    onError: () => toast.error('Ошибка'),
  });

  useEffect(() => {
    if (!authLoading && !isHeadRealtor) {
      router.push('/dashboard');
    }
  }, [authLoading, isHeadRealtor, router]);

  const handleSave = (formData: any) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (authLoading || !isHeadRealtor) return null;
  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Пользователи</h1>
        <Button onClick={() => setOpen(true)}>Добавить пользователя</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>Логин</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Группы</TableHead>
                <TableHead>Активен</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell>#{user.id}</TableCell>
                  <TableCell>{user.last_name} {user.first_name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.groups?.join(', ')}</TableCell>
                  <TableCell>{user.is_active ? 'Да' : 'Нет'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingUser(user)}
                    >
                      Редактировать
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDialog
        open={open || !!editingUser}
        onOpenChange={(val) => {
          if (!val) {
            setOpen(false);
            setEditingUser(null);
          }
        }}
        user={editingUser}
        onSave={handleSave}
      />
    </div>
  );
}

function UserDialog({ open, onOpenChange, user, onSave }: any) {
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    groups: [],
    is_active: true,
  });

  useEffect(() => {
    if (user) {
      setFormData(user);
    } else {
      setFormData({ username: '', email: '', first_name: '', last_name: '', password: '', groups: [], is_active: true });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Редактировать' : 'Создать'} пользователя</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Логин</Label>
            <Input
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Имя</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Фамилия</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>
          {!user && (
            <div className="space-y-2">
              <Label>Пароль</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Группы</Label>
            <Select
              value={formData.groups?.[0]?.toString()}
              onValueChange={(val) => setFormData({ ...formData, groups: [parseInt(val)] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Главный риэлтор</SelectItem>
                <SelectItem value="2">Риэлтор</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
            />
            <Label htmlFor="is_active">Активен</Label>
          </div>
          <DialogFooter>
            <Button type="submit">Сохранить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}