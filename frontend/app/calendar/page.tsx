'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatTime, toDateInputValue, statusLabel, statusColor } from '@/lib/utils';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const DAY_START = 8; // 08:00
const DAY_END = 21; // 21:00
const PX_PER_MIN = 1.1;
const TOTAL_MIN = (DAY_END - DAY_START) * 60;

interface Appt {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  staffId: string | null;
  customer: { name: string };
  service?: { name: string } | null;
}
interface StaffCol { id: string | null; name: string }

export default function CalendarPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [staff, setStaff] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Appt | null>(null);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    apiClient.get('/staff').then((r) => setStaff(r.data)).catch(() => { });
  }, [token]);

  useEffect(() => { if (token) loadDay(); }, [token, date]);

  const loadDay = async () => {
    setLoading(true);
    try {
      const from = new Date(`${date}T00:00:00`);
      const to = new Date(`${date}T23:59:59`);
      const res = await apiClient.get('/appointments', { params: { from: from.toISOString(), to: to.toISOString() } });
      setAppts(res.data);
    } catch { toast.error('Error al cargar el calendario'); }
    finally { setLoading(false); }
  };

  const shiftDay = (delta: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setDate(toDateInputValue(d));
  };

  // Columns = active staff; add "Sin asignar" if any appt lacks staff.
  const columns: StaffCol[] = useMemo(() => {
    const cols: StaffCol[] = staff.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }));
    if (appts.some((a) => !a.staffId)) cols.push({ id: null, name: 'Sin asignar' });
    if (cols.length === 0) cols.push({ id: null, name: 'Citas' });
    return cols;
  }, [staff, appts]);

  const minutesFromStart = (iso: string) => {
    const d = new Date(iso);
    return (d.getHours() - DAY_START) * 60 + d.getMinutes();
  };

  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
            <p className="text-sm text-gray-500">Vista por empleado</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDay(-1)} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"><ChevronLeftIcon className="h-4 w-4" /></button>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
            <button onClick={() => shiftDay(1)} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"><ChevronRightIcon className="h-4 w-4" /></button>
            <Button onClick={() => setCreateOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />Nueva cita</Button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">Cargando…</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <div className="flex min-w-max">
              {/* Time gutter */}
              <div className="w-16 flex-shrink-0 border-r border-gray-100">
                <div className="h-10 border-b border-gray-100" />
                <div className="relative" style={{ height: TOTAL_MIN * PX_PER_MIN }}>
                  {hours.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 pr-2 text-right text-xs text-gray-400" style={{ top: i * 60 * PX_PER_MIN - 6 }}>
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff columns */}
              {columns.map((col) => {
                const colAppts = appts.filter((a) => (a.staffId ?? null) === col.id);
                
                // Calculate Occupancy
                const occupiedMinutes = colAppts.reduce((sum, a) => {
                  if (a.status === 'CANCELLED') return sum;
                  const dur = (new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 60000;
                  return sum + dur;
                }, 0);
                const occupancyPct = Math.min(100, Math.round((occupiedMinutes / TOTAL_MIN) * 100));

                return (
                  <div key={col.id ?? 'none'} className="w-64 flex-shrink-0 border-r border-gray-100">
                    <div className="flex flex-col h-16 items-center justify-center border-b border-gray-100 bg-gray-50/80 px-2 text-center sticky top-0 z-10 backdrop-blur-sm">
                      <span className="text-sm font-semibold text-gray-800">{col.name}</span>
                      <div className="w-full mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${occupancyPct > 80 ? 'bg-rose-500' : occupancyPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${occupancyPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-gray-500 w-6 text-right">{occupancyPct}%</span>
                      </div>
                    </div>
                    <div className="relative" style={{ height: TOTAL_MIN * PX_PER_MIN }}>
                      {/* hour lines */}
                      {hours.map((h, i) => (
                        <div key={h} className="absolute left-0 right-0 border-b border-gray-100/50" style={{ top: i * 60 * PX_PER_MIN }} />
                      ))}
                      {/* appointments */}
                      {colAppts.map((a) => {
                        const top = minutesFromStart(a.startTime) * PX_PER_MIN;
                        const dur = (new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 60000;
                        const height = Math.max(dur * PX_PER_MIN, 26);
                        const cancelled = a.status === 'CANCELLED';
                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelected(a)}
                            className={`absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1.5 text-left text-xs shadow-sm transition-all hover:shadow-md hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${statusColor(a.status)} ${cancelled ? 'opacity-50 line-through' : ''}`}
                            style={{ top, height }}
                          >
                            <div className="font-semibold truncate">{formatTime(a.startTime)} · {a.customer.name}</div>
                            {dur >= 30 && <div className="truncate opacity-80 mt-0.5">{a.service?.name ?? 'Cita general'}</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {createOpen && <CreateModal date={date} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); loadDay(); }} />}
      {selected && <ApptModal appt={selected} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); loadDay(); }} />}
    </DashboardLayout>
  );
}

// ── Appointment details + actions ──
function ApptModal({ appt, onClose, onChanged }: { appt: Appt; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<any>) => {
    setBusy(true);
    try { await fn(); toast.success('Actualizado'); onChanged(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Detalle de cita">
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="font-semibold text-gray-900">{appt.customer.name}</p>
          <p className="text-gray-600">{appt.service?.name ?? 'Cita'} · {formatTime(appt.startTime)}–{formatTime(appt.endTime)}</p>
          <Badge className={`mt-2 ${statusColor(appt.status)}`}>{statusLabel(appt.status)}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={busy} onClick={() => act(() => apiClient.patch(`/appointments/${appt.id}`, { status: 'COMPLETED' }))}>Completada</Button>
          <Button variant="outline" disabled={busy} onClick={() => act(() => apiClient.patch(`/appointments/${appt.id}`, { status: 'NO_SHOW' }))}>Inasistencia</Button>
          <Button variant="outline" disabled={busy} onClick={() => act(() => apiClient.post(`/appointments/${appt.id}/cancel`))}>Cancelar cita</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={busy} onClick={() => act(() => apiClient.delete(`/appointments/${appt.id}`))}>Eliminar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Create appointment (service → slot+staff → customer) ──
function CreateModal({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: () => void }) {
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [slots, setSlots] = useState<{ time: string; staff: { id: string; name: string }[] }[]>([]);
  const [chosen, setChosen] = useState<{ time: string; staffId?: string } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/services').then((r) => setServices(r.data.filter((s: any) => s.active)));
    apiClient.get('/customers').then((r) => setCustomers(r.data));
  }, []);

  useEffect(() => {
    if (!serviceId) { setSlots([]); return; }
    setLoadingSlots(true); setChosen(null);
    apiClient.get('/appointments/availability', { params: { serviceId, date } })
      .then((r) => setSlots(r.data)).catch(() => setSlots([])).finally(() => setLoadingSlots(false));
  }, [serviceId, date]);

  const save = async () => {
    if (!customerId || !chosen) { toast.error('Elige cliente y horario'); return; }
    setSaving(true);
    try {
      await apiClient.post('/appointments', { customerId, serviceId, startTime: chosen.time, staffId: chosen.staffId });
      toast.success('Cita creada'); onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error al crear'); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Nueva cita · ${date}`} size="xl">
      <div className="space-y-4">
        <div><Label>Cliente *</Label>
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Selecciona…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
          </Select>
        </div>
        <div><Label>Servicio *</Label>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Selecciona…</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration}m)</option>)}
          </Select>
        </div>
        {serviceId && (
          <div>
            <Label>Horario y empleado disponible *</Label>
            {loadingSlots ? <p className="text-sm text-gray-400">Cargando…</p> :
              slots.length === 0 ? <p className="text-sm text-gray-400">Sin disponibilidad ese día.</p> : (
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {slots.map((slot) => (
                    <div key={slot.time} className="flex items-center gap-2">
                      <span className="w-14 text-sm font-medium text-gray-700">{formatTime(slot.time)}</span>
                      <div className="flex flex-wrap gap-1">
                        {slot.staff.length === 0 ? (
                          <button onClick={() => setChosen({ time: slot.time })}
                            className={`rounded-full border px-2.5 py-1 text-xs ${chosen?.time === slot.time ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 hover:bg-gray-50'}`}>
                            Reservar
                          </button>
                        ) : slot.staff.map((st) => {
                          const sel = chosen?.time === slot.time && chosen?.staffId === st.id;
                          return (
                            <button key={st.id} onClick={() => setChosen({ time: slot.time, staffId: st.id })}
                              className={`rounded-full border px-2.5 py-1 text-xs ${sel ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 hover:bg-gray-50'}`}>
                              {st.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !chosen}>{saving ? 'Creando…' : 'Crear cita'}</Button>
        </div>
      </div>
    </Modal>
  );
}
