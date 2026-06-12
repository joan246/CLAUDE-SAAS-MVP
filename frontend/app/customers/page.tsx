'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  AlertTriangleIcon,
} from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatDateTime, statusLabel, statusColor } from '@/lib/utils';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

interface AppointmentHistory {
  id: string;
  startTime: string;
  status: string;
  notes?: string;
}

interface CustomerFormData {
  name: string;
  phone: string;
  email?: string;
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // History
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<AppointmentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Search
  const [search, setSearch] = useState('');

  // ─── Auth guard ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    loadCustomers();
  }, [token]);

  // ─── Data ──────────────────────────────────────────────────────────────
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/customers');
      setCustomers(res.data);
    } catch {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (customer: Customer) => {
    setHistoryCustomer(customer);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get(`/customers/${customer.id}/history`);
      setHistory(res.data);
    } catch {
      toast.error('Error al cargar historial');
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─── Derived ───────────────────────────────────────────────────────────
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()),
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500">{customers.length} clientes registrados</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Buscar por nombre, teléfono o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {/* Table */}
        {loading ? (
          <div className="py-20 text-center text-gray-400">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            {search ? 'Sin resultados' : 'Aún no hay clientes. ¡Agrega el primero!'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Registrado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <UserIcon className="h-4 w-4" />
                        </span>
                        <Link href={`/customers/${c.id}`} className="font-medium text-blue-700 hover:underline">
                          {c.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => loadHistory(c)}
                          className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Ver historial"
                        >
                          <ClockIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditTarget(c)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {/* Create */}
      <CustomerFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); loadCustomers(); }}
        title="Nuevo cliente"
      />

      {/* Edit */}
      <CustomerFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); loadCustomers(); }}
        title="Editar cliente"
        customer={editTarget ?? undefined}
      />

      {/* Delete */}
      <DeleteCustomerModal
        customer={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); loadCustomers(); }}
      />

      {/* History */}
      <CustomerCRMModal
        customer={historyCustomer}
        onClose={() => setHistoryCustomer(null)}
      />
    </DashboardLayout>
  );
}

// ─── Customer Form Modal ──────────────────────────────────────────────────────
function CustomerFormModal({
  open,
  onClose,
  onSaved,
  title,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  title: string;
  customer?: Customer;
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CustomerFormData>({
      defaultValues: customer
        ? { name: customer.name, phone: customer.phone, email: customer.email }
        : {},
    });

  // Reset form when customer changes (edit → create, etc.)
  useEffect(() => {
    reset(
      customer
        ? { name: customer.name, phone: customer.phone, email: customer.email ?? '' }
        : { name: '', phone: '', email: '' },
    );
  }, [customer, open]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (customer) {
        await apiClient.patch(`/customers/${customer.id}`, data);
        toast.success('Cliente actualizado');
      } else {
        await apiClient.post('/customers', data);
        toast.success('Cliente creado');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            placeholder="Juan García"
            {...register('name', { required: 'El nombre es obligatorio' })}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">Teléfono *</Label>
          <Input
            id="phone"
            placeholder="+52 55 1234 5678"
            {...register('phone', { required: 'El teléfono es obligatorio' })}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email">Email (opcional)</Label>
          <Input
            id="email"
            type="email"
            placeholder="juan@email.com"
            {...register('email')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : customer ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteCustomerModal({
  customer,
  onClose,
  onDeleted,
}: {
  customer: Customer | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      await apiClient.delete(`/customers/${customer.id}`);
      toast.success('Cliente eliminado');
      onDeleted();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={!!customer} onClose={onClose} title="Eliminar cliente">
      <div className="space-y-4">
        <p className="text-gray-600">
          ¿Seguro que deseas eliminar a{' '}
          <span className="font-semibold text-gray-900">{customer?.name}</span>? Esta
          acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Customer CRM Modal (360 View) ────────────────────────────────────────────
function CustomerCRMModal({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    apiClient.get(`/customers/${customer.id}/profile`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Error al cargar perfil 360'))
      .finally(() => setLoading(false));
  }, [customer]);

  const toggleVip = async () => {
    if (!data) return;
    try {
      await apiClient.patch(`/customers/${customer!.id}`, { vip: !data.customer.vip });
      const res = await apiClient.get(`/customers/${customer!.id}/profile`);
      setData(res.data);
      toast.success(data.customer.vip ? 'VIP removido' : 'Cliente VIP marcado');
    } catch {
      toast.error('Error al actualizar VIP');
    }
  };

  if (!customer) return null;

  return (
    <Modal
      open={!!customer}
      onClose={onClose}
      title="Perfil 360 del Cliente"
      size="xl"
    >
      {loading || !data ? (
        <div className="py-12 flex justify-center items-center">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                {data.customer.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{data.customer.name}</h2>
                  {data.customer.vip && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">VIP</Badge>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{data.customer.phone} {data.customer.email ? `• ${data.customer.email}` : ''}</p>
                <p className="text-xs text-gray-400 mt-0.5">Cliente desde {new Date(data.customer.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleVip}>
              {data.customer.vip ? 'Quitar VIP' : 'Marcar VIP'}
            </Button>
          </div>

          {data.stats.lateCancellations > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
              <AlertTriangleIcon className="h-4 w-4" />
              <span>Este cliente tiene {data.stats.lateCancellations} cancelación(es) tardía(s).</span>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Valor Generado (LTV)</p>
              <p className="text-lg font-bold text-emerald-600">${data.stats.lifetimeValue}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Citas Totales</p>
              <p className="text-lg font-bold text-blue-600">{data.stats.totalAppointments}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Inasistencias</p>
              <p className="text-lg font-bold text-red-600">{data.stats.noShows}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Frecuencia</p>
              <p className="text-lg font-bold text-purple-600">{data.stats.frequencyDays ? `${data.stats.frequencyDays} días` : 'N/A'}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Últimas Interacciones</h3>
            {data.history.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400 border rounded-lg border-dashed">Sin interacciones registradas</p>
            ) : (
              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2">
                {data.history.map((apt: any) => (
                  <div key={apt.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm hover:border-gray-200 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{apt.service?.name ?? 'Cita general'}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <ClockIcon className="h-3 w-3" />
                        {formatDateTime(apt.startTime)}
                      </p>
                    </div>
                    <Badge className={statusColor(apt.status)}>
                      {statusLabel(apt.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
