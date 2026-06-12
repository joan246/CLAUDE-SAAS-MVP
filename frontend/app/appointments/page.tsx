'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
} from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  formatDateShort,
  formatTime,
  statusLabel,
  statusColor,
  toDateInputValue,
  AppointmentStatus,
} from '@/lib/utils';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface ServiceLite {
  id: string;
  name: string;
  duration: number;
  active: boolean;
}

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  customer: Customer;
}

interface CreateFormData {
  customerId: string;
  serviceId: string;
  date: string;
  slot: string;
  notes?: string;
}

interface UpdateFormData {
  status: AppointmentStatus;
  notes?: string;
}

const ALL_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    Promise.all([loadAppointments(), loadCustomers(), loadServices()]);
  }, [token]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/appointments');
      setAppointments(res.data);
    } catch {
      toast.error('Error al cargar citas');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await apiClient.get('/customers');
      setCustomers(res.data);
    } catch {
      // silent
    }
  };

  const loadServices = async () => {
    try {
      const res = await apiClient.get('/services');
      setServices(res.data.filter((s: ServiceLite) => s.active));
    } catch {
      // silent
    }
  };

  const filtered = appointments.filter(
    (a) => filterStatus === 'ALL' || a.status === filterStatus,
  );

  // Group by date
  const grouped = filtered.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const key = formatDateShort(apt.startTime);
    if (!acc[key]) acc[key] = [];
    acc[key].push(apt);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    const parse = (s: string) => {
      const [d, m, y] = s.split('/');
      return new Date(`${y}-${m}-${d}`).getTime();
    };
    return parse(a) - parse(b);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
            <p className="text-sm text-gray-500">{appointments.length} citas en total</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Nueva cita
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          {['ALL', ...ALL_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${filterStatus === s
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              {s === 'ALL' ? 'Todas' : statusLabel(s)}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-20 text-center text-gray-400">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            No hay citas{filterStatus !== 'ALL' ? ` con estado "${statusLabel(filterStatus)}"` : ''}.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                <div className="mb-2 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    {date}
                  </h2>
                </div>
                <div className="space-y-2">
                  {grouped[date].map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onEdit={() => setEditTarget(apt)}
                      onDelete={() => setDeleteTarget(apt)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateAppointmentModal
        open={createOpen}
        customers={customers}
        services={services}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); loadAppointments(); }}
      />

      <EditAppointmentModal
        appointment={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); loadAppointments(); }}
      />

      <DeleteAppointmentModal
        appointment={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); loadAppointments(); }}
      />
    </DashboardLayout>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────
function AppointmentCard({
  appointment: apt,
  onEdit,
  onDelete,
}: {
  appointment: Appointment;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Time */}
      <div className="w-16 text-center">
        <p className="text-lg font-bold text-gray-900">{formatTime(apt.startTime)}</p>
        <p className="text-xs text-gray-400">{formatTime(apt.endTime)}</p>
      </div>

      {/* Divider */}
      <div className="h-12 w-px bg-gray-200" />

      {/* Info */}
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{apt.customer.name}</p>
        <p className="text-sm text-gray-500">{apt.customer.phone}</p>
        {apt.notes && (
          <p className="mt-0.5 text-xs text-gray-400 italic">{apt.notes}</p>
        )}
      </div>

      {/* Status */}
      <Badge className={statusColor(apt.status)}>{statusLabel(apt.status)}</Badge>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          title="Editar"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          title="Eliminar"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateAppointmentModal({
  open,
  customers,
  services,
  onClose,
  onSaved,
}: {
  open: boolean;
  customers: Customer[];
  services: ServiceLite[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>({
    defaultValues: { date: toDateInputValue(new Date()), slot: '', serviceId: '' },
  });

  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const selectedDate = watch('date');
  const selectedService = watch('serviceId');

  // Reset on open
  useEffect(() => {
    if (open) reset({ date: toDateInputValue(new Date()), slot: '', customerId: '', serviceId: '', notes: '' });
  }, [open]);

  // Load available slots when date or service changes (duration affects slots)
  useEffect(() => {
    if (!selectedDate || !open) return;
    setSlotsLoading(true);
    setSlots([]);
    setValue('slot', '');
    apiClient
      .get('/appointments/available-slots', {
        params: { date: selectedDate, serviceId: selectedService || undefined },
      })
      .then((res) => {
        setSlots(res.data);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedService, open]);

  const onSubmit = async (data: CreateFormData) => {
    if (!data.slot) { toast.error('Selecciona un horario'); return; }
    try {
      await apiClient.post('/appointments', {
        customerId: data.customerId,
        serviceId: data.serviceId || undefined,
        startTime: data.slot,
        notes: data.notes || undefined,
      });
      toast.success('Cita creada');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear cita');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva cita">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Customer */}
        <div>
          <Label htmlFor="customerId">Cliente *</Label>
          <Select
            id="customerId"
            {...register('customerId', { required: 'Selecciona un cliente' })}
          >
            <option value="">Selecciona un cliente…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </Select>
          {errors.customerId && (
            <p className="mt-1 text-xs text-red-500">{errors.customerId.message}</p>
          )}
        </div>

        {/* Service */}
        <div>
          <Label htmlFor="serviceId">Servicio</Label>
          <Select id="serviceId" {...register('serviceId')}>
            <option value="">Sin servicio específico</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration} min)
              </option>
            ))}
          </Select>
        </div>

        {/* Date */}
        <div>
          <Label htmlFor="date">Fecha *</Label>
          <Input
            id="date"
            type="date"
            min={toDateInputValue(new Date())}
            {...register('date', { required: 'Selecciona una fecha' })}
          />
        </div>

        {/* Slot */}
        <div>
          <Label htmlFor="slot">Horario disponible *</Label>
          {slotsLoading ? (
            <p className="text-sm text-gray-400">Cargando horarios…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-400">
              {selectedDate ? 'No hay horarios disponibles para este día.' : 'Selecciona una fecha.'}
            </p>
          ) : (
            <Select id="slot" {...register('slot', { required: 'Selecciona un horario' })}>
              <option value="">Selecciona un horario…</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {formatTime(s)}
                </option>
              ))}
            </Select>
          )}
          {errors.slot && (
            <p className="mt-1 text-xs text-red-500">{errors.slot.message}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Instrucciones especiales, servicios solicitados…"
            rows={2}
            {...register('notes')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear cita'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditAppointmentModal({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<UpdateFormData>();

  useEffect(() => {
    if (appointment) {
      reset({ status: appointment.status, notes: appointment.notes || '' });
    }
  }, [appointment]);

  const onSubmit = async (data: UpdateFormData) => {
    if (!appointment) return;
    try {
      await apiClient.patch(`/appointments/${appointment.id}`, data);
      toast.success('Cita actualizada');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    }
  };

  return (
    <Modal open={!!appointment} onClose={onClose} title="Editar cita">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {appointment && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <p className="font-medium text-gray-900">{appointment.customer.name}</p>
            <p>
              {formatDateShort(appointment.startTime)} — {formatTime(appointment.startTime)}
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="status">Estado</Label>
          <Select id="status" {...register('status')}>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="editNotes">Notas</Label>
          <Textarea
            id="editNotes"
            placeholder="Notas adicionales…"
            rows={2}
            {...register('notes')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteAppointmentModal({
  appointment,
  onClose,
  onDeleted,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!appointment) return;
    setLoading(true);
    try {
      await apiClient.delete(`/appointments/${appointment.id}`);
      toast.success('Cita eliminada');
      onDeleted();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={!!appointment} onClose={onClose} title="Eliminar cita">
      <div className="space-y-4">
        {appointment && (
          <p className="text-gray-600">
            ¿Eliminar la cita de{' '}
            <span className="font-semibold text-gray-900">{appointment.customer.name}</span> el{' '}
            {formatDateShort(appointment.startTime)} a las {formatTime(appointment.startTime)}?
          </p>
        )}
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
