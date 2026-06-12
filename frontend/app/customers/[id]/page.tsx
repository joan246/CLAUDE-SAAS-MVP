'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon, StarIcon, PhoneIcon, MailIcon, CalendarIcon,
  DollarSignIcon, XCircleIcon, RepeatIcon, AlertTriangleIcon,
} from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatCurrency, formatDateTime, statusLabel, statusColor, formatDateShort } from '@/lib/utils';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!token) { router.push('/login'); return; } load(); }, [token]);
  const load = async () => {
    setLoading(true);
    try { setData((await apiClient.get(`/customers/${id}/profile`)).data); }
    catch { toast.error('Error al cargar perfil'); } finally { setLoading(false); }
  };

  const toggleVip = async () => {
    try { await apiClient.patch(`/customers/${id}`, { vip: !data.customer.vip }); load(); }
    catch { toast.error('Error'); }
  };

  if (loading || !data) {
    return <DashboardLayout><div className="py-20 text-center text-gray-400">Cargando…</div></DashboardLayout>;
  }

  const c = data.customer;
  const s = data.stats;
  const cards = [
    { label: 'Valor generado', value: formatCurrency(s.lifetimeValue), icon: DollarSignIcon, color: 'text-green-600 bg-green-50' },
    { label: 'Citas completadas', value: s.completed, icon: CalendarIcon, color: 'text-blue-600 bg-blue-50' },
    { label: 'No-shows', value: s.noShows, icon: AlertTriangleIcon, color: 'text-red-600 bg-red-50' },
    { label: 'Cancelaciones', value: s.cancelled, icon: XCircleIcon, color: 'text-orange-600 bg-orange-50' },
    { label: 'Frecuencia', value: s.frequencyDays ? `cada ${s.frequencyDays} días` : '—', icon: RepeatIcon, color: 'text-purple-600 bg-purple-50' },
    { label: 'Próximas', value: s.upcoming, icon: CalendarIcon, color: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeftIcon className="h-4 w-4" />Volver a clientes</Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
              {c.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
                {c.vip && <Badge className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-200"><StarIcon className="h-3 w-3 fill-current" />VIP</Badge>}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1"><PhoneIcon className="h-3.5 w-3.5" />{c.phone}</span>
                {c.email && <span className="flex items-center gap-1"><MailIcon className="h-3.5 w-3.5" />{c.email}</span>}
                <span>Cliente desde {formatDateShort(c.createdAt)}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={toggleVip}>
            <StarIcon className="mr-2 h-4 w-4" />{c.vip ? 'Quitar VIP' : 'Marcar VIP'}
          </Button>
        </div>

        {s.lateCancellations > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Este cliente tiene {s.lateCancellations} cancelación(es) tardía(s) registrada(s).</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardContent className="p-4">
                  <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}><Icon className="h-4 w-4" /></span>
                  <p className="text-lg font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {c.notes && (
          <Card><CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-600">{c.notes}</p></CardContent></Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Historial ({data.history.length})</CardTitle></CardHeader>
          <CardContent>
            {data.history.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">Sin citas registradas</p> : (
              <div className="space-y-2">
                {data.history.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.service?.name ?? 'Cita'}{a.staff ? ` · ${a.staff.name}` : ''}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(a.startTime)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.price != null && <span className="text-sm text-gray-600">{formatCurrency(a.price)}</span>}
                      <Badge className={statusColor(a.status)}>{statusLabel(a.status)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
