'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  CalendarDaysIcon,
  MessageSquareIcon,
  UsersIcon,
  TrendingUpIcon,
  SettingsIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { Logo } from '@/components/ui/logo';

// ── Desktop Navigation ────────────────────────────────────────────────────────
const desktopNav = [
  { name: 'Inicio', href: '/dashboard', icon: HomeIcon },
  { name: 'Agenda', href: '/calendar', icon: CalendarDaysIcon },
  { name: 'Conversaciones', href: '/chat', icon: MessageSquareIcon },
  { name: 'Clientes', href: '/customers', icon: UsersIcon },
  { name: 'Negocio', href: '/analytics', icon: TrendingUpIcon },
  { name: 'Configuración', href: '/settings', icon: SettingsIcon },
];

// ── Mobile Navigation ────────────────────────────────────────────────────────
const mobileNav = [
  { name: 'Inicio', href: '/dashboard', icon: HomeIcon },
  { name: 'Agenda', href: '/calendar', icon: CalendarDaysIcon },
  { name: 'Chats', href: '/chat', icon: MessageSquareIcon },
  { name: 'Clientes', href: '/customers', icon: UsersIcon },
  { name: 'Más', href: '/settings', icon: MoreHorizontalIcon },
];

const SIDEBAR_KEY = 'citaspro_sidebar_collapsed';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);
  const [collapsed, setCollapsed] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Restore user preference from localStorage
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const userName = mounted && user ? user.name || 'Usuario' : 'Cargando...';
  const userRole = mounted && user && user.role === 'ADMIN' ? 'Administrador' : 'Staff';

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      
      {/* ── Desktop Sidebar (Hidden on Mobile) ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-slate-950 text-slate-300 z-20 transition-all duration-300 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Logo & Toggle */}
        <div className={cn('h-16 flex items-center', collapsed ? 'justify-center px-0' : 'px-4 gap-2')}>
          {/* Logo: only icon when collapsed */}
          <div className="flex-1 flex items-center overflow-hidden">
            {collapsed
              ? <Logo theme="dark" size={26} withText={false} />
              : <Logo theme="dark" size={26} />
            }
          </div>
          {/* Toggle button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0',
              collapsed && 'mx-auto'
            )}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed
              ? <PanelLeftOpenIcon className="w-4 h-4" />
              : <PanelLeftCloseIcon className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {desktopNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors group',
                  collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.name}</span>
                    {item.name === 'Conversaciones' && (
                      <span className="ml-auto bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">8</span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className={cn('p-3 border-t border-slate-800', collapsed && 'flex flex-col items-center gap-2')}>
          {collapsed ? (
            <>
              <div
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-white"
                title={userName}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Cerrar sesión"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-white shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-slate-400 truncate">{userRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Cerrar sesión"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 pb-[60px] md:pb-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation (Hidden on Desktop) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 pb-safe">
        <div className="flex justify-around items-center h-[60px]">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full space-y-1',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
