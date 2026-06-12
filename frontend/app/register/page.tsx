'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/logo';

interface RegisterFormData {
  name: string;
  companyName: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>();

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/register', data);
      setAuth(response.data.access_token, response.data.user);
      toast.success('¡Cuenta creada! Bienvenido a Citas Pro');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={44} withText={false} />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
            Citas<span className="text-blue-600">Pro</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Crea la cuenta de tu negocio en segundos</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="companyName">Nombre del negocio</Label>
            <Input id="companyName" {...register('companyName', { required: true })} placeholder="Barbería El Corte" />
            {errors.companyName && <span className="text-sm text-red-500">Requerido</span>}
          </div>
          <div>
            <Label htmlFor="name">Tu nombre</Label>
            <Input id="name" {...register('name', { required: true })} placeholder="María Pérez" />
            {errors.name && <span className="text-sm text-red-500">Requerido</span>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...register('email', { required: true })} type="email" placeholder="tu@email.com" />
            {errors.email && <span className="text-sm text-red-500">Email requerido</span>}
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" {...register('password', { required: true, minLength: 6 })} type="password" placeholder="Mín. 6 caracteres" />
            {errors.password && <span className="text-sm text-red-500">Mínimo 6 caracteres</span>}
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="font-medium text-blue-600 hover:underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}
