'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarIcon, UsersIcon, DollarSignIcon, HeartPulseIcon,
  ClockIcon, ArrowRightIcon, TrendingUpIcon, XCircleIcon,
  UserPlusIcon, PercentIcon, InfoIcon
} from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatTime, formatCurrency, statusLabel, statusColor, toDateInputValue } from '@/lib/utils';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Tooltip component (no extra library needed) ─────────────────────────────
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-gray-300 hover:text-gray-400 transition-colors"
        aria-label="Más información"
      >
        <InfoIcon className="w-3.5 h-3.5" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl bg-gray-900 px-3 py-2 text-xs text-gray-100 shadow-lg z-50 pointer-events-none leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  description: string;
  tooltip: string;
  icon: React.ElementType;
  color: string;        // icon bg+text color classes
  href?: string;        // if present, card is clickable
  trend?: string;       // optional trend label e.g. "+5% vs mes anterior"
  trendPositive?: boolean;
}

function StatCard({ label, value, description, tooltip, icon: Icon, color, href, trend, trendPositive }: StatCardProps) {
  const inner = (
    <Card className={`border-0 shadow-sm transition-all duration-200 hover:shadow-md group ${href ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}>
      <CardContent className="p-5 flex flex-col gap-3">
        {/* Top row: icon + info tooltip */}
        <div className="flex items-start justify-between">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </span>
          <Tooltip text={tooltip} />
        </div>

        {/* Value */}
        <div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
        </div>

        {/* Description + link arrow */}
        <div className="flex items-end justify-between pt-1 border-t border-gray-50">
          <p className="text-xs text-gray-400 leading-snug max-w-[80%]">{description}</p>
          {href && (
            <ArrowRightIcon className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
          )}
        </div>

        {/* Trend badge */}
        {trend && (
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${trendPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {trend}
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{inner}</Link>;
  }
  return inner;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [metrics, setMetrics] = useState<any>(null);
  const [today, setToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { if (!token) { router.push('/login'); return; } }, [token]);
  useEffect(() => { if (token) load(); }, [token]);
  useEffect(() => { setMounted(true); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const [m, t] = await Promise.all([
        apiClient.get('/analytics/dashboard', { params: { startDate: toDateInputValue(first), endDate: toDateInputValue(last) } }),
        apiClient.get('/appointments/today'),
      ]);
      setMetrics(m.data.overview);
      setToday(t.data);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const stats: StatCardProps[] = metrics ? [
    {
      label: 'Ingresos del mes',
      value: formatCurrency(metrics.revenue),
      description: 'Total facturado en citas completadas este mes.',
      tooltip: 'Suma de ingresos de todas las citas marcadas como "Completadas" durante el período seleccionado.',
      icon: DollarSignIcon,
      color: 'text-emerald-600 bg-emerald-50',
      href: '/analytics',
    },
    {
      label: 'Citas totales',
      value: metrics.totalAppointments,
      description: 'Citas agendadas en el mes. Toca para ver el calendario completo.',
      tooltip: 'Incluye citas en todos los estados: pendientes, confirmadas, completadas, canceladas y no presentadas.',
      icon: CalendarIcon,
      color: 'text-blue-600 bg-blue-50',
      href: '/calendar',
    },
    {
      label: 'Conversión',
      value: `${metrics.conversionRate}%`,
      description: 'Porcentaje de citas agendadas que se completaron exitosamente.',
      tooltip: 'Se calcula como (Citas completadas ÷ Total citas) × 100. Un valor alto indica que los clientes asisten a sus citas.',
      icon: PercentIcon,
      color: 'text-purple-600 bg-purple-50',
      href: '/analytics',
      trend: metrics.conversionRate >= 70 ? 'Buen rendimiento' : metrics.conversionRate >= 40 ? 'Puede mejorar' : 'Atención requerida',
      trendPositive: metrics.conversionRate >= 70,
    },
    {
      label: 'Salud del negocio',
      value: `${metrics.healthScore}/100`,
      description: 'Índice global del estado operativo de tu negocio. Ver detalles →',
      tooltip: 'Combina tu tasa de conversión (50%), retención de clientes (30%) y penaliza por cancelaciones (20%). Un puntaje por encima de 70 es excelente.',
      icon: HeartPulseIcon,
      color: metrics.healthScore >= 70 ? 'text-emerald-600 bg-emerald-50' : metrics.healthScore >= 40 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50',
      href: '/analytics',
      trend: metrics.healthScore >= 70 ? '✓ Negocio saludable' : metrics.healthScore >= 40 ? '⚠ Revisar métricas' : '⛔ Acción urgente',
      trendPositive: metrics.healthScore >= 70,
    },
    {
      label: 'Clientes nuevos',
      value: metrics.newCustomers,
      description: 'Nuevos clientes registrados este mes.',
      tooltip: 'Cuenta los clientes cuyo registro se creó dentro del período actual. Refleja el crecimiento de tu base de clientes.',
      icon: UserPlusIcon,
      color: 'text-sky-600 bg-sky-50',
      href: '/customers',
    },
    {
      label: 'Retención',
      value: `${metrics.retentionRate}%`,
      description: 'Porcentaje de clientes que han regresado más de una vez.',
      tooltip: 'Clientes con más de 1 cita en total ÷ total de clientes. Una alta retención indica que tu servicio fideliza a los clientes.',
      icon: TrendingUpIcon,
      color: 'text-indigo-600 bg-indigo-50',
      href: '/analytics',
      trend: metrics.retentionRate >= 50 ? 'Alta fidelización' : 'Mejorar retención',
      trendPositive: metrics.retentionRate >= 50,
    },
    {
      label: 'Cancelaciones',
      value: `${metrics.cancellationRate}%`,
      description: 'Porcentaje de citas canceladas sobre el total del mes.',
      tooltip: 'Citas canceladas ÷ total de citas agendadas. Valores altos pueden indicar problemas de confirmación o disponibilidad.',
      icon: XCircleIcon,
      color: metrics.cancellationRate <= 10 ? 'text-emerald-600 bg-emerald-50' : metrics.cancellationRate <= 25 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50',
      href: '/analytics',
      trend: metrics.cancellationRate <= 10 ? 'Bajo — excelente' : metrics.cancellationRate <= 25 ? 'Moderado' : 'Alto — revisar',
      trendPositive: metrics.cancellationRate <= 10,
    },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Hola{mounted && user?.name ? `, ${user.name}` : ''} 👋
          </h1>
          <p className="text-gray-500">
            {mounted
              ? new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : 'Cargando fecha...'}
          </p>
        </div>

        {loading || !metrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-sm animate-pulse">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gray-100" />
                  <div className="h-7 w-24 rounded bg-gray-100" />
                  <div className="h-3 w-full rounded bg-gray-50" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Indicadores del mes</h2>
                <Link href="/analytics" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                  Ver panel completo <ArrowRightIcon className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => <StatCard key={s.label} {...s} />)}
              </div>
            </div>

            {/* Widgets row */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Agenda del día */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Agenda de hoy</CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">Citas programadas para el día de hoy</p>
                  </div>
                  <Link href="/calendar" className="text-sm text-primary hover:underline flex items-center gap-1">
                    Ver calendario <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </CardHeader>
                <CardContent>
                  {today.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
                        <CalendarIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">Tu día está libre</p>
                      <p className="text-sm text-gray-500 mt-1">No hay citas programadas para hoy.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {today.map((a) => (
                        <div key={a.id} className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-primary/20 hover:shadow-sm">
                          <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-gray-100 pr-4">
                            <span className="text-sm font-bold text-gray-900">{formatTime(a.startTime)}</span>
                            <span className="text-xs text-gray-500">{formatTime(a.endTime)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-base font-semibold text-gray-900">{a.customer.name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              {a.service?.name ?? 'Cita general'}
                              {a.staff && <span className="text-gray-300">•</span>}
                              {a.staff && <span className="text-gray-600">{a.staff.name}</span>}
                            </p>
                          </div>
                          <Badge className={statusColor(a.status)}>{statusLabel(a.status)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumen rápido */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Resumen rápido</CardTitle>
                  <p className="text-xs text-gray-400">Estado general del mes</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Citas completadas', value: `${metrics.conversionRate}%`, description: 'Del total agendado', ok: metrics.conversionRate >= 60 },
                    { label: 'Clientes recurrentes', value: `${metrics.retentionRate}%`, description: 'Volvieron a reservar', ok: metrics.retentionRate >= 40 },
                    { label: 'Tasa de cancelación', value: `${metrics.cancellationRate}%`, description: 'Del total agendado', ok: metrics.cancellationRate <= 20 },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{row.label}</p>
                        <p className="text-xs text-gray-400">{row.description}</p>
                      </div>
                      <span className={`text-sm font-bold ${row.ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                  <Link
                    href="/analytics"
                    className="flex items-center justify-center gap-1.5 mt-2 w-full py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-600 font-medium transition-colors"
                  >
                    Ver panel de negocio <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
