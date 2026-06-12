'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Building2Icon,
  ClockIcon,
  SparklesIcon,
  BanIcon,
  PlugIcon,
  ScaleIcon,
  UsersIcon,
  PencilIcon,
  TrashIcon,
  MessageCircleIcon,
} from 'lucide-react';
import { WhatsAppPanel } from '@/components/whatsapp/whatsapp-panel';
import { Select } from '@/components/ui/select';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { DAY_NAMES } from '@/lib/utils';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

type Tab = 'business' | 'hours' | 'users' | 'ai' | 'whatsapp' | 'rules' | 'cancellation' | 'integrations';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'business', label: 'Negocio', icon: Building2Icon },
  { id: 'hours', label: 'Horario', icon: ClockIcon },
  { id: 'users', label: 'Usuarios', icon: UsersIcon },
  { id: 'ai', label: 'Asistente IA', icon: SparklesIcon },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircleIcon },
  { id: 'rules', label: 'Reglas', icon: ScaleIcon },
  { id: 'cancellation', label: 'Cancelaciones', icon: BanIcon },
  { id: 'integrations', label: 'Integraciones', icon: PlugIcon },
];

export default function SettingsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { token } = useAuthStore();
  const [tab, setTab] = useState<Tab>('business');
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    load();
    const g = params.get('google');
    if (g === 'connected') toast.success('Google Calendar conectado');
    if (g === 'error') toast.error('No se pudo conectar Google Calendar');
  }, [token]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/companies/me');
      setCompany(res.data);
    } catch {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500">Administra tu negocio y automatizaciones</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-gray-200">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {loading || !company ? (
          <div className="py-20 text-center text-gray-400">Cargando…</div>
        ) : (
          <div className="max-w-2xl">
            {tab === 'business' && <BusinessTab company={company} onSaved={load} />}
            {tab === 'hours' && <HoursTab company={company} onSaved={load} />}
            {tab === 'users' && <UsersTab />}
            {tab === 'ai' && <AiTab company={company} onSaved={load} />}
            {tab === 'whatsapp' && <WhatsAppPanel />}
            {tab === 'rules' && <RulesTab />}
            {tab === 'cancellation' && <CancellationTab company={company} onSaved={load} />}
            {tab === 'integrations' && <IntegrationsTab company={company} onSaved={load} />}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Business profile ──────────────────────────────────────────────────────
function BusinessTab({ company, onSaved }: { company: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: company.name ?? '',
    phone: company.phone ?? '',
    email: company.email ?? '',
    address: company.address ?? '',
    timezone: company.timezone ?? 'America/Mexico_City',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/companies/me', form);
      toast.success('Datos guardados');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Datos del negocio</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Nombre del negocio</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Dirección</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <Label>Zona horaria</Label>
          <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Weekly business hours ─────────────────────────────────────────────────
function HoursTab({ company, onSaved }: { company: any; onSaved: () => void }) {
  const [hours, setHours] = useState(() => {
    // Ensure all 7 days exist, ordered Mon..Sun for display but keep dayOfWeek.
    const byDay: Record<number, any> = {};
    (company.businessHours || []).forEach((h: any) => (byDay[h.dayOfWeek] = h));
    return [1, 2, 3, 4, 5, 6, 0].map((d) => ({
      dayOfWeek: d,
      isOpen: byDay[d]?.isOpen ?? false,
      startTime: byDay[d]?.startTime ?? '09:00',
      endTime: byDay[d]?.endTime ?? '18:00',
    }));
  });
  const [saving, setSaving] = useState(false);

  const update = (i: number, patch: any) =>
    setHours((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put('/companies/me/business-hours', { hours });
      toast.success('Horario guardado');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Horario de atención</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {hours.map((h, i) => (
          <div key={h.dayOfWeek} className="flex items-center gap-3">
            <label className="flex w-32 items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={h.isOpen}
                onChange={(e) => update(i, { isOpen: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              {DAY_NAMES[h.dayOfWeek]}
            </label>
            {h.isOpen ? (
              <div className="flex items-center gap-2">
                <Input type="time" value={h.startTime} onChange={(e) => update(i, { startTime: e.target.value })} className="w-32" />
                <span className="text-gray-400">a</span>
                <Input type="time" value={h.endTime} onChange={(e) => update(i, { endTime: e.target.value })} className="w-32" />
              </div>
            ) : (
              <span className="text-sm text-gray-400">Cerrado</span>
            )}
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar horario'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── AI assistant ──────────────────────────────────────────────────────────
function AiTab({ company, onSaved }: { company: any; onSaved: () => void }) {
  const ai = company.aiConfig || {};
  const [form, setForm] = useState({
    enabled: ai.enabled ?? true,
    personality: ai.personality ?? '',
    tone: ai.tone ?? '',
    rules: ai.rules ?? '',
    greeting: ai.greeting ?? '',
    customSystemPrompt: ai.customSystemPrompt ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(!!ai.customSystemPrompt);
  
  // Knowledge Base State
  const [docs, setDocs] = useState<any[]>([]);
  const [newDoc, setNewDoc] = useState({ title: '', content: '' });
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const res = await apiClient.get('/companies/me/knowledge');
      setDocs(res.data);
    } catch {
      toast.error('Error cargando base de conocimiento');
    } finally {
      setLoadingDocs(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/companies/me/ai-config', form);
      toast.success('Asistente actualizado');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const addDoc = async () => {
    if (!newDoc.title || !newDoc.content) return toast.error('Título y contenido requeridos');
    try {
      await apiClient.post('/companies/me/knowledge', newDoc);
      toast.success('Documento añadido');
      setNewDoc({ title: '', content: '' });
      loadDocs();
    } catch {
      toast.error('Error al añadir documento');
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await apiClient.delete(`/companies/me/knowledge/${id}`);
      toast.success('Documento eliminado');
      loadDocs();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Personalidad del asistente IA</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
            Asistente activado (responde por WhatsApp automáticamente)
          </label>
          <div>
            <Label>Personalidad</Label>
            <Input value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} placeholder="Amable, cercana y profesional" />
          </div>
          <div>
            <Label>Tono</Label>
            <Select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
              <option value="Formal pero amigable">Formal pero amigable</option>
              <option value="Cercano y casual">Cercano y casual</option>
              <option value="Divertido y entusiasta">Divertido y entusiasta</option>
              <option value="Elegante y sofisticado">Elegante y sofisticado</option>
              <option value="Serio y directo">Serio y directo</option>
            </Select>
          </div>
          <div>
            <Label>Saludo inicial</Label>
            <Textarea rows={2} value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })} />
          </div>
          <div>
            <Label>Reglas del negocio</Label>
            <Textarea rows={3} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Ej: No ofrezcas horarios ocupados. Deja 15 min entre citas." />
          </div>

          <div className="pt-2">
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-blue-600 hover:underline">
              {showAdvanced ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
            </button>
          </div>
          
          {showAdvanced && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <Label className="text-orange-800">Prompt del Sistema Personalizado (Avanzado)</Label>
              <p className="mb-2 text-xs text-orange-600">Reemplaza completamente las instrucciones base de la IA. Úsalo solo si sabes lo que haces.</p>
              <Textarea rows={6} value={form.customSystemPrompt} onChange={(e) => setForm({ ...form, customSystemPrompt: e.target.value })} placeholder="Eres un asistente experto que..." />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* KNOWLEDGE BASE */}
      <Card>
        <CardHeader><CardTitle className="text-base">Base de Conocimiento (RAG)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">Agrega información extra para que la IA responda mejor a tus clientes (ej. lista de precios, menú, ubicación).</p>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <h4 className="text-sm font-medium">Añadir Documento</h4>
              <Input placeholder="Título (ej. Menú de Precios)" value={newDoc.title} onChange={e => setNewDoc({...newDoc, title: e.target.value})} />
              <Textarea rows={4} placeholder="Contenido (Pega aquí el texto completo...)" value={newDoc.content} onChange={e => setNewDoc({...newDoc, content: e.target.value})} />
              <Button size="sm" onClick={addDoc} className="w-full">Guardar Documento</Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos Guardados</h4>
              {loadingDocs ? (
                <p className="text-xs text-gray-400">Cargando...</p>
              ) : docs.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay documentos guardados.</p>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[250px]">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-start justify-between rounded border border-gray-100 p-2 text-sm bg-white">
                      <div>
                        <p className="font-medium text-gray-800">{doc.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{doc.content}</p>
                      </div>
                      <button onClick={() => deleteDoc(doc.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Cancellation policy ───────────────────────────────────────────────────
function CancellationTab({ company, onSaved }: { company: any; onSaved: () => void }) {
  const p = company.cancellationPolicy || {};
  const [form, setForm] = useState({
    minHoursBefore: p.minHoursBefore ?? 24,
    warningThreshold: p.warningThreshold ?? 1,
    warningMessage: p.warningMessage ?? '',
    penaltyMessage: p.penaltyMessage ?? '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/companies/me/cancellation-policy', {
        ...form,
        minHoursBefore: Number(form.minHoursBefore),
        warningThreshold: Number(form.warningThreshold),
      });
      toast.success('Política actualizada');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Política de cancelación</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Horas mínimas de anticipación</Label>
            <Input type="number" min={0} value={form.minHoursBefore} onChange={(e) => setForm({ ...form, minHoursBefore: e.target.value as any })} />
          </div>
          <div>
            <Label>Cancelaciones tardías permitidas</Label>
            <Input type="number" min={0} value={form.warningThreshold} onChange={(e) => setForm({ ...form, warningThreshold: e.target.value as any })} />
          </div>
        </div>
        <div>
          <Label>Mensaje de advertencia</Label>
          <Textarea rows={2} value={form.warningMessage} onChange={(e) => setForm({ ...form, warningMessage: e.target.value })} />
        </div>
        <div>
          <Label>Mensaje de penalización</Label>
          <Textarea rows={2} value={form.penaltyMessage} onChange={(e) => setForm({ ...form, penaltyMessage: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Users / team ──────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([apiClient.get('/users'), apiClient.get('/staff')]);
      setUsers(u.data); setStaff(s.data);
    } catch { toast.error('Error al cargar usuarios'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    try { await apiClient.delete(`/users/${id}`); toast.success('Usuario eliminado'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Usuarios y accesos</CardTitle>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true); }}>Nuevo usuario</Button>
      </CardHeader>
      <CardContent>
        {loading ? <div className="py-8 text-center text-gray-400">Cargando…</div> : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name} <span className="text-gray-400">· {u.email}</span></p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={u.role === 'ADMIN' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200'}>{u.role}</Badge>
                    {u.staff && <span className="text-xs text-gray-500">→ {u.staff.name}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditTarget(u); setModalOpen(true); }} className="rounded p-1.5 text-gray-400 hover:bg-gray-100"><PencilIcon className="h-4 w-4" /></button>
                  <button onClick={() => del(u.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {modalOpen && <UserModal user={editTarget} staff={staff} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />}
    </Card>
  );
}

function UserModal({ user, staff, onClose, onSaved }: { user: any; staff: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: user?.name ?? '', email: user?.email ?? '', password: '',
    role: user?.role ?? 'STAFF', staffId: user?.staffId ?? '',
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      if (user) {
        const payload: any = { name: form.name, role: form.role, staffId: form.staffId };
        if (form.password) payload.password = form.password;
        await apiClient.patch(`/users/${user.id}`, payload);
      } else {
        await apiClient.post('/users', { name: form.name, email: form.email, password: form.password, role: form.role, staffId: form.staffId || undefined });
      }
      toast.success('Guardado'); onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={user ? 'Editar usuario' : 'Nuevo usuario'}>
      <div className="space-y-4">
        <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Email *</Label><Input type="email" value={form.email} disabled={!!user} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>{user ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={user ? 'Dejar vacío para conservar' : 'Mín. 6 caracteres'} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Rol</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">Administrador</option>
              <option value="STAFF">Staff</option>
            </Select>
          </div>
          <div><Label>Vincular a empleado</Label>
            <Select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
              <option value="">Ninguno</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button></div>
      </div>
    </Modal>
  );
}

// ─── Rules engine ──────────────────────────────────────────────────────────
const RULE_META: Record<string, { label: string; desc: string; input?: 'num' | 'str'; unit?: string }> = {
  NO_SAME_DAY_BOOKING: { label: 'No permitir reservas el mismo día', desc: 'Las citas deben agendarse con al menos un día de antelación.' },
  MIN_HOURS_BEFORE_BOOKING: { label: 'Anticipación mínima', desc: 'Horas mínimas antes de la cita para poder reservar.', input: 'num', unit: 'horas' },
  MAX_CANCELLATIONS: { label: 'Máximo de cancelaciones', desc: 'Bloquea a clientes que superen este número de cancelaciones tardías.', input: 'num', unit: 'cancelaciones' },
  MAX_BOOKINGS_PER_DAY: { label: 'Máximo de reservas por día', desc: 'Límite de citas que un cliente puede tener el mismo día.', input: 'num', unit: 'citas' },
  REQUIRE_DEPOSIT: { label: 'Exigir depósito', desc: 'Requiere un depósito previo para confirmar.', input: 'num', unit: 'monto' },
  NO_SHOW_PENALTY: { label: 'Penalización por ausencia', desc: 'Mensaje/acción cuando un cliente no se presenta.', input: 'str' },
  ALLOW_DOUBLE_BOOKING: { label: 'Permitir doble reserva', desc: 'Permite solapar citas (úsalo con cuidado).' },
};

function RulesTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRules((await apiClient.get('/rules')).data); } catch { toast.error('Error'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const upd = (key: string, patch: any) =>
    setRules((p) => p.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put('/rules', {
        rules: rules.map((r) => ({
          key: r.key, enabled: r.enabled,
          numValue: r.numValue != null ? Number(r.numValue) : undefined,
          strValue: r.strValue ?? undefined,
        })),
      });
      toast.success('Reglas guardadas'); load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  if (loading) return <div className="py-12 text-center text-gray-400">Cargando…</div>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Motor de reglas</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rules.map((r) => {
          const meta = RULE_META[r.key] || { label: r.key, desc: '' };
          return (
            <div key={r.key} className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-3">
              <div className="flex-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <input type="checkbox" checked={r.enabled} onChange={(e) => upd(r.key, { enabled: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                  {meta.label}
                </label>
                <p className="ml-6 mt-0.5 text-xs text-gray-500">{meta.desc}</p>
                {r.enabled && meta.input === 'num' && (
                  <div className="ml-6 mt-2 flex items-center gap-2">
                    <Input type="number" value={r.numValue ?? ''} onChange={(e) => upd(r.key, { numValue: e.target.value })} className="w-28" />
                    <span className="text-xs text-gray-400">{meta.unit}</span>
                  </div>
                )}
                {r.enabled && meta.input === 'str' && (
                  <Input className="ml-6 mt-2 max-w-md" value={r.strValue ?? ''} onChange={(e) => upd(r.key, { strValue: e.target.value })} placeholder="Mensaje…" />
                )}
              </div>
            </div>
          );
        })}
        <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar reglas'}</Button></div>
      </CardContent>
    </Card>
  );
}

// ─── Integrations ──────────────────────────────────────────────────────────
function IntegrationsTab({ company, onSaved }: { company: any; onSaved: () => void }) {
  const [google, setGoogle] = useState<any>(null);
  const [wa, setWa] = useState({
    whatsappPhoneNumberId: company.whatsappPhoneNumberId ?? '',
    whatsappAccessToken: '',
    whatsappVerifyToken: company.whatsappVerifyToken ?? '',
  });
  const [savingWa, setSavingWa] = useState(false);

  useEffect(() => {
    apiClient.get('/google/status').then((r) => setGoogle(r.data)).catch(() => setGoogle({ configured: false, connected: false }));
  }, []);

  const connectGoogle = async () => {
    try {
      const res = await apiClient.get('/google/auth-url');
      window.location.href = res.data.url;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Google no está configurado en el servidor');
    }
  };

  const disconnectGoogle = async () => {
    await apiClient.delete('/google/disconnect');
    toast.success('Google Calendar desconectado');
    setGoogle({ ...google, connected: false, email: null });
  };

  const saveWa = async () => {
    setSavingWa(true);
    try {
      const payload: any = {
        whatsappPhoneNumberId: wa.whatsappPhoneNumberId,
        whatsappVerifyToken: wa.whatsappVerifyToken,
      };
      if (wa.whatsappAccessToken) payload.whatsappAccessToken = wa.whatsappAccessToken;
      await apiClient.patch('/companies/me', payload);
      toast.success('WhatsApp configurado');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSavingWa(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Google Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Google Calendar</CardTitle>
          {google?.connected ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">Conectado</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-600 border-gray-200">Desconectado</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {!google ? (
            <p className="text-sm text-gray-400">Comprobando estado…</p>
          ) : !google.configured ? (
            <p className="text-sm text-gray-500">
              El servidor no tiene credenciales de Google configuradas
              (GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI).
            </p>
          ) : google.connected ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Conectado como <b>{google.email}</b></p>
              <Button variant="outline" onClick={disconnectGoogle}>Desconectar</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Sincroniza automáticamente cada cita a tu calendario.</p>
              <Button onClick={connectGoogle}>Conectar</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">WhatsApp Cloud API</CardTitle>
          {company.whatsappConnected ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">Configurado</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-600 border-gray-200">Sin configurar</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Phone Number ID</Label>
            <Input value={wa.whatsappPhoneNumberId} onChange={(e) => setWa({ ...wa, whatsappPhoneNumberId: e.target.value })} placeholder="123456789012345" />
          </div>
          <div>
            <Label>Access Token {company.whatsappConnected && <span className="text-xs text-gray-400">(deja vacío para conservar el actual)</span>}</Label>
            <Input type="password" value={wa.whatsappAccessToken} onChange={(e) => setWa({ ...wa, whatsappAccessToken: e.target.value })} placeholder="EAAG…" />
          </div>
          <div>
            <Label>Verify Token (para el webhook)</Label>
            <Input value={wa.whatsappVerifyToken} onChange={(e) => setWa({ ...wa, whatsappVerifyToken: e.target.value })} placeholder="mi-token-secreto" />
          </div>
          <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
            Webhook URL: <code>{(process.env.NEXT_PUBLIC_API_URL || '') + '/whatsapp/webhook'}</code>
          </p>
          <div className="flex justify-end">
            <Button onClick={saveWa} disabled={savingWa}>{savingWa ? 'Guardando…' : 'Guardar WhatsApp'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
