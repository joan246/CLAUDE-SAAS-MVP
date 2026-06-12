'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const response = await apiClient.post('/auth/login', data);
      setAuth(response.data.access_token, response.data.user);
      
      // Delay before redirecting for a smoother transition experience
      setTimeout(() => {
        router.push('/dashboard');
      }, 300);
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || 'Credenciales inválidas');
      triggerShake();
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full transition-transform ${isShaking ? 'animate-[shake_0.4s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Iniciar sesión</h2>
        <p className="text-sm text-zinc-500">Bienvenido de vuelta. Ingresa a tu panel de control.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2 relative">
          <Label htmlFor="email" className="text-zinc-700 font-medium">Correo electrónico</Label>
          <Input 
            id="email" 
            {...register('email', { required: 'El correo es requerido' })} 
            type="email" 
            placeholder="tu@empresa.com" 
            className={`h-11 shadow-sm transition-all duration-200 ${errors.email ? 'border-red-300 focus-visible:ring-red-200' : 'focus-visible:border-blue-600 focus-visible:ring-blue-100'}`}
          />
          {errors.email && (
            <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in slide-in-from-top-1">
              {errors.email.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2 relative">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-zinc-700 font-medium">Contraseña</Label>
            <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
          <Input 
            id="password" 
            {...register('password', { required: 'La contraseña es requerida' })} 
            type="password" 
            placeholder="••••••••" 
            className={`h-11 shadow-sm transition-all duration-200 ${errors.password ? 'border-red-300 focus-visible:ring-red-200' : 'focus-visible:border-blue-600 focus-visible:ring-blue-100'}`}
          />
          {errors.password && (
            <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in slide-in-from-top-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {globalError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg animate-in fade-in">
            <p className="text-sm text-red-600 font-medium text-center">{globalError}</p>
          </div>
        )}

        <Button 
          type="submit" 
          disabled={isLoading} 
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            'Iniciar sesión'
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500">
        ¿No tienes una cuenta?{' '}
        <a href="/register" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
          Crea tu cuenta aquí
        </a>
      </p>

      <div className="mt-8 rounded-xl bg-zinc-50 border border-zinc-100 p-4 text-center">
        <p className="text-xs text-zinc-500 font-medium mb-1">Credenciales de Demo</p>
        <p className="text-sm font-mono text-zinc-800">test@example.com / password123</p>
      </div>
    </div>
  );
}
