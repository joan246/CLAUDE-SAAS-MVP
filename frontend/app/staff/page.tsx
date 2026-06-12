'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon, CalendarOffIcon, SparklesIcon } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { DAY_NAMES, formatDateShort } from '@/lib/utils';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ServiceLite { id: string; name: string; duration: number }
interface StaffLite {
  id: string; name: string; title?: string; photo?: string; active: boolean;
  priority: number; simultaneousCapacity: number;
  services: { service: { id: string; name: string } }[];
  _count?: { appointments: number };
}

function Avatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const style = { width: size, height: size };
  if (photo) return <img src={photo} alt={name} style={style} className="rounded-full object-cover" />;
  return (
    <span style={style} className="flex items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
      {initials}
    </span>
  );
}

export default function StaffPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [services, setServices] = useState<ServiceLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffLite | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffLite | null>(null);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    load();
  }, [token]);

  const load = async () => {
    try {
      setLoading(true);
      const [s, svc] = await Promise.all([apiClient.get('/staff'), apiClient.get('/services')]);
      setStaff(s.data);
      setServices(svc.data);
    } catch { toast.error('Error al cargar personal'); }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Personal</h1>
            <p className="text-sm text-gray-500">{staff.length} empleados · especialidades, horarios y ausencias</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />Nuevo empleado</Button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">Cargando…</div>
        ) : staff.length === 0 ? (
          <div className="py-20 text-center text-gray-400">Aún no tienes empleados. Crea el primero.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((s) => (
              <Card key={s.id} className={s.active ? '' : 'opacity-60'}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={s.name} photo={s.photo} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-gray-900">{s.name}</h3>
                        {!s.active && <Badge className="bg-gray-100 text-gray-600 border-gray-200">Inactivo</Badge>}
                      </div>
                      <p className="text-sm text-gray-500">{s.title || 'Sin cargo'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {s.services.length === 0 ? (
                      <span className="text-xs text-gray-400">Sin servicios asignados</span>
                    ) : s.services.slice(0, 4).map((x) => (
                      <Badge key={x.service.id} className="bg-blue-50 text-blue-700 border-blue-100">{x.service.name}</Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button onClick={() => setDetailId(s.id)} className="text-sm font-medium text-blue-600 hover:underline">
                      Gestionar →
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => setEditTarget(s)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Editar"><PencilIcon className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(s)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Eliminar"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <StaffFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load(); }} title="Nuevo empleado" />
      <StaffFormModal open={!!editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} title="Editar empleado" staff={editTarget ?? undefined} />
      {detailId && <StaffDetailModal staffId={detailId} services={services} onClose={() => { setDetailId(null); load(); }} />}
      <DeleteModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); load(); }} />
    </DashboardLayout>
  );
}

// ── Create/Edit basic data ──
function StaffFormModal({ open, onClose, onSaved, title, staff }: { open: boolean; onClose: () => void; onSaved: () => void; title: string; staff?: StaffLite }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<any>();
  useEffect(() => {
    reset(staff
      ? { name: staff.name, title: staff.title ?? '', photo: staff.photo ?? '', priority: staff.priority, simultaneousCapacity: staff.simultaneousCapacity, active: staff.active }
      : { name: '', title: '', photo: '', priority: 0, simultaneousCapacity: 1, active: true });
  }, [staff, open]);

  const onSubmit = async (data: any) => {
    const payload = { ...data, priority: Number(data.priority), simultaneousCapacity: Number(data.simultaneousCapacity) };
    try {
      if (staff) await apiClient.patch(`/staff/${staff.id}`, payload);
      else await apiClient.post('/staff', payload);
      toast.success(staff ? 'Empleado actualizado' : 'Empleado creado');
      onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error al guardar'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div><Label>Nombre *</Label><Input {...register('name', { required: true })} placeholder="Ana Torres" /></div>
        <div><Label>Cargo</Label><Input {...register('title')} placeholder="Barbero, Estilista, Técnico…" /></div>
        <div><Label>Foto (URL)</Label><Input {...register('photo')} placeholder="https://…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Prioridad</Label><Input type="number" {...register('priority')} /></div>
          <div><Label>Capacidad simultánea</Label><Input type="number" min={1} {...register('simultaneousCapacity')} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('active')} className="h-4 w-4 rounded border-gray-300" />Activo
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : staff ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Detail: tabs (especialidades, horario, ausencias) ──
function StaffDetailModal({ staffId, services, onClose }: { staffId: string; services: ServiceLite[]; onClose: () => void }) {
  const [tab, setTab] = useState<'services' | 'schedule' | 'timeoff'>('services');
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    const res = await apiClient.get(`/staff/${staffId}`);
    setDetail(res.data);
  };
  useEffect(() => { load(); }, [staffId]);

  return (
    <Modal open onClose={onClose} title={detail ? detail.name : 'Empleado'} size="2xl">
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {[
          { id: 'services', label: 'Especialidades', icon: SparklesIcon },
          { id: 'schedule', label: 'Horario', icon: ClockIcon },
          { id: 'timeoff', label: 'Ausencias', icon: CalendarOffIcon },
        ].map((t) => {
          const Icon = t.icon as any;
          return (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          );
        })}
      </div>
      {!detail ? <div className="py-8 text-center text-gray-400">Cargando…</div> : (
        <>
          {tab === 'services' && <SpecialtiesTab detail={detail} services={services} onSaved={load} />}
          {tab === 'schedule' && <ScheduleTab detail={detail} onSaved={load} />}
          {tab === 'timeoff' && <TimeOffTab detail={detail} onSaved={load} />}
        </>
      )}
    </Modal>
  );
}

function SpecialtiesTab({ detail, services, onSaved }: { detail: any; services: ServiceLite[]; onSaved: () => void }) {
  const initial = new Set<string>(detail.services.map((s: any) => s.serviceId));
  const [selected, setSelected] = useState<Set<string>>(initial);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/staff/${detail.id}/services`, { services: Array.from(selected).map((serviceId) => ({ serviceId })) });
      toast.success('Especialidades guardadas'); onSaved();
    } catch { toast.error('Error al guardar'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Marca los servicios que este empleado puede realizar.</p>
      <div className="grid grid-cols-2 gap-2">
        {services.map((s) => (
          <label key={s.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2.5 text-sm">
            <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 rounded border-gray-300" />
            <span className="flex-1 text-gray-800">{s.name}</span>
            <span className="text-xs text-gray-400">{s.duration}m</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button></div>
    </div>
  );
}

function ScheduleTab({ detail, onSaved }: { detail: any; onSaved: () => void }) {
  const byDay: Record<number, any> = {};
  detail.schedule.forEach((d: any) => (byDay[d.dayOfWeek] = d));
  const [days, setDays] = useState(() => [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    dayOfWeek: d, isWorking: byDay[d]?.isWorking ?? false,
    startTime: byDay[d]?.startTime ?? '09:00', endTime: byDay[d]?.endTime ?? '18:00',
  })));
  const [saving, setSaving] = useState(false);
  const upd = (i: number, patch: any) => setDays((p) => p.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  const save = async () => {
    setSaving(true);
    try { await apiClient.put(`/staff/${detail.id}/schedule`, { days }); toast.success('Horario guardado'); onSaved(); }
    catch { toast.error('Error al guardar'); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      {days.map((d, i) => (
        <div key={d.dayOfWeek} className="flex items-center gap-3">
          <label className="flex w-32 items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={d.isWorking} onChange={(e) => upd(i, { isWorking: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
            {DAY_NAMES[d.dayOfWeek]}
          </label>
          {d.isWorking ? (
            <div className="flex items-center gap-2">
              <Input type="time" value={d.startTime} onChange={(e) => upd(i, { startTime: e.target.value })} className="w-32" />
              <span className="text-gray-400">a</span>
              <Input type="time" value={d.endTime} onChange={(e) => upd(i, { endTime: e.target.value })} className="w-32" />
            </div>
          ) : <span className="text-sm text-gray-400">Descanso</span>}
        </div>
      ))}
      <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar horario'}</Button></div>
    </div>
  );
}

function TimeOffTab({ detail, onSaved }: { detail: any; onSaved: () => void }) {
  const [form, setForm] = useState({ type: 'VACATION', start: '', end: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const LABELS: Record<string, string> = { VACATION: 'Vacaciones', ABSENCE: 'Ausencia', BLOCK: 'Bloqueo', HOLIDAY: 'Festivo' };

  const add = async () => {
    if (!form.start || !form.end) { toast.error('Indica fechas de inicio y fin'); return; }
    setSaving(true);
    try {
      await apiClient.post(`/staff/${detail.id}/time-off`, { type: form.type, start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(), allDay: true, reason: form.reason });
      toast.success('Ausencia agregada'); setForm({ type: 'VACATION', start: '', end: '', reason: '' }); onSaved();
    } catch { toast.error('Error al guardar'); } finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    try { await apiClient.delete(`/staff/${detail.id}/time-off/${id}`); toast.success('Eliminada'); onSaved(); }
    catch { toast.error('Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Tipo</Label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div><Label>Motivo</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Opcional" /></div>
          <div><Label>Desde</Label><Input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
          <div><Label>Hasta</Label><Input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
        </div>
        <div className="mt-3 flex justify-end"><Button onClick={add} disabled={saving}>{saving ? 'Guardando…' : 'Agregar'}</Button></div>
      </div>
      <div className="space-y-2">
        {detail.timeOff.length === 0 ? <p className="text-center text-sm text-gray-400">Sin ausencias registradas</p> :
          detail.timeOff.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div>
                <Badge className="bg-purple-50 text-purple-700 border-purple-100">{LABELS[t.type]}</Badge>
                <span className="ml-2 text-sm text-gray-700">{formatDateShort(t.start)} → {formatDateShort(t.end)}</span>
                {t.reason && <p className="mt-0.5 text-xs text-gray-400">{t.reason}</p>}
              </div>
              <button onClick={() => remove(t.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
            </div>
          ))}
      </div>
    </div>
  );
}

function DeleteModal({ target, onClose, onDeleted }: { target: StaffLite | null; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const del = async () => {
    if (!target) return;
    setLoading(true);
    try { await apiClient.delete(`/staff/${target.id}`); toast.success('Empleado eliminado'); onDeleted(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); } finally { setLoading(false); }
  };
  return (
    <Modal open={!!target} onClose={onClose} title="Eliminar empleado">
      <div className="space-y-4">
        <p className="text-gray-600">¿Eliminar a <span className="font-semibold text-gray-900">{target?.name}</span>?</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={del} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">{loading ? 'Eliminando…' : 'Eliminar'}</Button>
        </div>
      </div>
    </Modal>
  );
}
