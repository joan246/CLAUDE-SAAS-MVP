import { ReactNode } from 'react';
import { Logo } from '@/components/ui/logo';
import { LayoutDashboard, MessageSquare } from 'lucide-react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Column - Emotional/Brand Side (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] bg-zinc-50 border-r border-zinc-100 relative overflow-hidden flex-col">
        {/* Top left Logo */}
        <div className="absolute top-10 left-12">
          <Logo size={36} />
        </div>
        
        {/* Main Emotional Content */}
        <div className="flex-1 flex flex-col justify-center px-12 xl:px-24">
          <div className="max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-[2.75rem] leading-[1.1] font-bold tracking-tight text-zinc-900 mb-5">
              Tu negocio siempre organizado.
            </h1>
            <p className="text-lg text-zinc-500 mb-14 leading-relaxed max-w-md">
              Gestiona citas, clientes y conversaciones desde un solo lugar. Toma el control operativo de tu empresa de forma intuitiva.
            </p>
            
            {/* Minimalist Dashboard Preview Abstract */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-lg">
              <div className="bg-white p-5 rounded-2xl shadow-soft border border-zinc-100 flex items-start gap-4 transition-transform hover:-translate-y-1 duration-300">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-0.5">Gestión visual</h3>
                  <p className="text-sm text-zinc-500">Calendario interactivo</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-soft border border-zinc-100 flex items-start gap-4 transition-transform hover:-translate-y-1 duration-300 delay-100">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-0.5">Chats integrados</h3>
                  <p className="text-sm text-zinc-500">WhatsApp CRM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Functional Login Side */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 bg-white relative">
        {/* Mobile Logo (only visible on mobile) */}
        <div className="lg:hidden flex justify-center mb-10">
          <Logo size={44} />
        </div>
        
        <div className="w-full max-w-[380px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 fill-mode-both">
          {children}
        </div>
      </div>
    </div>
  );
}
