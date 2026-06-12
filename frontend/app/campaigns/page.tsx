'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon, SendIcon, InfoIcon } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatDateShort } from '@/lib/utils';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const TRIGGERS: Record<string, string> = {
  INACTIVITY: 'Inactividad', VIP: 'Clientes VIP', BIRTHDAY: 'Cumpleaños', POST_VISIT: 'Post-visita', CUSTOM: 'Personalizada',
};
const CHANNELS: Record<string, string> = { WHATSAPP: 'WhatsApp', EMAIL: 'Email', SMS: 'SMS', INSTAGRAM: 'Instagram' };

export default function CampaignsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [targetsFor, setTargetsFor] = useState<any>(null);

  useEffect(() => { if (!token) { router.push('/login'); return; } load(); }, [token]);
  const load = async () => {
    setLoading(true);
    try { setItems((await apiClient.get('/campaigns')).data); } catch { toast.error('Error'); } finally { setLoading(false); }
  };
  const del = async (id: string) => { try { await apiClient.delete(`/campaigns/${id}`); toast.success('Eliminada'); load(); } catch { toast.error('Error'); } };
  const queue = async (id: string) => {
    try { const r = await apiClient.post(`/campaigns/${id}/queue`); toast.success(`${r.data.queued} envíos en cola`); load(); }
    catch { toast.error('Error'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campañas de remarketing</h1>
            <p className="text-sm text-gray-500">Reactiva clientes automáticamente · el envío se conectará al final</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />Nueva campaña</Button>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <InfoIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>El motor de segmentación ya identifica a los clientes objetivo. El envío real por WhatsApp/Email se activará en la fase de integraciones.</span>
        </div>

        {loading ? <div className="py-20 text-center text-gray-400">Cargando…</div> :
          items.length === 0 ? <div className="py-20 text-center text-gray-400">Sin campañas. Crea la primera (ej. "Inactivos 30 días").</div> : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((c) => (
                <Card key={c.id} className={c.active ? '' : 'opacity-60'}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{c.name}</h3>
                        <div className="mt-1 flex gap-1">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-100">{TRIGGERS[c.trigger]}</Badge>
                          <Badge className="bg-gray-100 text-gray-600 border-gray-200">{CHANNELS[c.channel]}</Badge>
                          {c.trigger === 'INACTIVITY' && <Badge className="bg-gray-100 text-gray-600 border-gray-200">{c.inactivityDays} días</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditTarget(c)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => del(c.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <p className="mt-3 rounded bg-gray-50 p-2 text-sm text-gray-600 italic">"{c.messageTemplate}"</p>
                    {c.lastRunAt && <p className="mt-2 text-xs text-gray-400">Última ejecución: {formatDateShort(c.lastRunAt)} · {c._count?.sends ?? 0} envíos</p>}
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" onClick={() => setTargetsFor(c)}><UsersIcon className="mr-2 h-4 w-4" />Ver destinatarios</Button>
                      <Button onClick={() => queue(c.id)}><SendIcon className="mr-2 h-4 w-4" />Encolar</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>

      <CampaignModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load(); }} />
      <CampaignModal open={!!editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} item={editTarget} />
      {targetsFor && <TargetsModal campaign={targetsFor} onClose={() => setTargetsFor(null)} />}
    </DashboardLayout>
  );
}

function CampaignModal({ open, onClose, onSaved, item }: { open: boolean; onClose: () => void; onSaved: () => void; item?: any }) {
  const [form, setForm] = useState<any>({ name: '', trigger: 'INACTIVITY', channel: 'WHATSAPP', inactivityDays: 30, messageTemplate: '', active: true });
  useEffect(() => {
    setForm(item ? { name: item.name, trigger: item.trigger, channel: item.channel, inactivityDays: item.inactivityDays ?? 30, messageTemplate: item.messageTemplate, active: item.active }
      : { name: '', trigger: 'INACTIVITY', channel: 'WHATSAPP', inactivityDays: 30, messageTemplate: '¡Te extrañamos! Vuelve y disfruta una promoción especial.', active: true });
  }, [item, open]);
  const save = async () => {
    try {
      const payload = { ...form, inactivityDays: Number(form.inactivityDays) };
      if (item) await apiClient.patch(`/campaigns/${item.id}`, payload);
      else await apiClient.post('/campaigns', payload);
      toast.success('Guardado'); onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
  };
  return (
    <Modal open={open} onClose={onClose} title={item ? 'Editar campaña' : 'Nueva campaña'} size="xl">
      <div className="space-y-4">
        <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Reactivar inactivos" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Disparador</Label>
            <Select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
              {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div><Label>Canal</Label>
            <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </div>
        {form.trigger === 'INACTIVITY' && (
          <div><Label>Días de inactividad</Label><Input type="number" min={1} value={form.inactivityDays} onChange={(e) => setForm({ ...form, inactivityDays: e.target.value })} /></div>
        )}
        <div><Label>Mensaje</Label><Textarea rows={3} value={form.messageTemplate} onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />Activa</label>
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar</Button></div>
      </div>
    </Modal>
  );
}

function TargetsModal({ campaign, onClose }: { campaign: any; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiClient.get(`/campaigns/${campaign.id}/targets`).then((r) => setData(r.data)).catch(() => setData({ count: 0, customers: [] })); }, [campaign.id]);
  return (
    <Modal open onClose={onClose} title={`Destinatarios · ${campaign.name}`} size="xl">
      {!data ? <div className="py-8 text-center text-gray-400">Calculando segmento…</div> : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600"><span className="font-bold text-gray-900">{data.count}</span> clientes coinciden con este disparador.</p>
          <div className="max-h-80 space-y-1.5 overflow-y-auto">
            {data.customers.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-sm">
                <div><span className="font-medium text-gray-900">{c.name}</span> <span className="text-gray-400">· {c.phone}</span></div>
                <span className="text-xs text-gray-500">{c.visits} visitas{c.lastVisit ? ` · última ${formatDateShort(c.lastVisit)}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
