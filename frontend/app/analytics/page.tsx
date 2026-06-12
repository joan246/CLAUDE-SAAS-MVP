'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUpIcon, HeartPulseIcon, UsersIcon, DollarSignIcon, CalendarIcon, XCircleIcon
} from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatCurrency, toDateInputValue } from '@/lib/utils';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Period = 'last7' | 'last30' | 'month' | 'year';

export default function AnalyticsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [period, setPeriod] = useState<Period>('last30');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!token) router.push('/login'); }, [token, router]);
  useEffect(() => { if (token) loadData(); }, [token, period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let start = new Date();
      let end = now;
      if (period === 'last7') start = new Date(now.getTime() - 7 * 86400000);
      if (period === 'last30') start = new Date(now.getTime() - 30 * 86400000);
      if (period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
      if (period === 'year') start = new Date(now.getFullYear(), 0, 1);

      const res = await apiClient.get('/analytics/dashboard', {
        params: { startDate: toDateInputValue(start), endDate: toDateInputValue(end) }
      });
      setData(res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const overview = data?.overview;
  const charts = data?.charts;

  const kpis = overview ? [
    { label: 'Salud del negocio', value: `${overview.healthScore}/100`, icon: HeartPulseIcon, color: 'text-rose-600 bg-rose-50' },
    { label: 'Conversión', value: `${overview.conversionRate}%`, icon: TrendingUpIcon, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Retención', value: `${overview.retentionRate}%`, icon: UsersIcon, color: 'text-blue-600 bg-blue-50' },
    { label: 'Cancelaciones', value: `${overview.cancellationRate}%`, icon: XCircleIcon, color: 'text-red-600 bg-red-50' },
    { label: 'Clientes Nuevos', value: overview.newCustomers, icon: UsersIcon, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Ingresos', value: formatCurrency(overview.revenue), icon: DollarSignIcon, color: 'text-green-600 bg-green-50' },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inteligencia de Negocio</h1>
            <p className="text-sm text-gray-500 mt-1">Métricas y análisis de rendimiento</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {[
              { id: 'last7', label: 'Últimos 7 días' },
              { id: 'last30', label: 'Últimos 30 días' },
              { id: 'month', label: 'Este mes' },
              { id: 'year', label: 'Este año' }
            ].map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id as Period)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${period === p.id ? 'bg-primary text-primary-foreground shadow' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="py-32 flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>Calculando métricas...</p>
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpis.map(kpi => {
                const Icon = kpi.icon;
                return (
                  <Card key={kpi.label} className="border-0 shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-5 flex flex-col gap-3">
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${kpi.color}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                        <p className="text-xs font-medium text-gray-500 mt-1">{kpi.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Line chart: Appointments over time */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Citas por Día</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.appointmentsByDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={(l) => `Fecha: ${l}`} 
                      />
                      <Line type="monotone" dataKey="count" name="Citas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pie chart: Status */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Estado de las Citas</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.appointmentsByStatus}
                        cx="50%" cy="50%"
                        innerRadius={80} outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {charts.appointmentsByStatus.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Bar Chart: Top Services */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Servicios más Solicitados</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.topServices} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="count" name="Citas" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bar Chart: Top Staff */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Empleados Destacados</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.topStaff} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="count" name="Citas" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
