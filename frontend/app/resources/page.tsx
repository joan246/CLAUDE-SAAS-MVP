'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, BoxIcon, TagIcon } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function ResourcesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [tab, setTab] = useState<'resources' | 'categories'>('resources');

  useEffect(() => { if (!token) router.push('/login'); }, [token]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recursos y categorías</h1>
          <p className="text-sm text-gray-500">Cabinas, sillas y equipos compartidos · categorías de servicios</p>
        </div>
        <div className="flex gap-1 border-b border-gray-200">
          {[{ id: 'resources', label: 'Recursos', icon: BoxIcon }, { id: 'categories', label: 'Categorías', icon: TagIcon }].map((t) => {
            const Icon = t.icon as any;
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                <Icon className="h-4 w-4" />{t.label}
              </button>
            );
          })}
        </div>
        {tab === 'resources' ? <ResourcesTab /> : <CategoriesTab />}
      </div>
    </DashboardLayout>
  );
}

function ResourcesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try { setItems((await apiClient.get('/resources')).data); } catch { toast.error('Error'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    try { await apiClient.delete(`/resources/${id}`); toast.success('Eliminado'); load(); } catch { toast.error('Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setCreateOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />Nuevo recurso</Button></div>
      {loading ? <div className="py-12 text-center text-gray-400">Cargando…</div> :
        items.length === 0 ? <div className="py-12 text-center text-gray-400">Sin recursos. Crea cabinas, sillas o equipos.</div> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
              <Card key={r.id} className={r.active ? '' : 'opacity-60'}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.type || 'Recurso'} · capacidad {r.capacity}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditTarget(r)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100"><PencilIcon className="h-4 w-4" /></button>
                    <button onClick={() => del(r.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      <ResourceModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load(); }} />
      <ResourceModal open={!!editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} item={editTarget} />
    </div>
  );
}

function ResourceModal({ open, onClose, onSaved, item }: { open: boolean; onClose: () => void; onSaved: () => void; item?: any }) {
  const [form, setForm] = useState({ name: '', type: '', capacity: 1, active: true });
  useEffect(() => { setForm(item ? { name: item.name, type: item.type ?? '', capacity: item.capacity, active: item.active } : { name: '', type: '', capacity: 1, active: true }); }, [item, open]);
  const save = async () => {
    try {
      const payload = { ...form, capacity: Number(form.capacity) };
      if (item) await apiClient.patch(`/resources/${item.id}`, payload);
      else await apiClient.post('/resources', payload);
      toast.success('Guardado'); onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
  };
  return (
    <Modal open={open} onClose={onClose} title={item ? 'Editar recurso' : 'Nuevo recurso'}>
      <div className="space-y-4">
        <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cabina 1" /></div>
        <div><Label>Tipo</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Cabina, Silla, Equipo…" /></div>
        <div><Label>Capacidad (uso simultáneo)</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value as any })} /></div>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />Activo</label>
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar</Button></div>
      </div>
    </Modal>
  );
}

function CategoriesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try { setItems((await apiClient.get('/categories')).data); } catch { toast.error('Error'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { try { await apiClient.delete(`/categories/${id}`); toast.success('Eliminada'); load(); } catch { toast.error('Error'); } };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setCreateOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />Nueva categoría</Button></div>
      {loading ? <div className="py-12 text-center text-gray-400">Cargando…</div> :
        items.length === 0 ? <div className="py-12 text-center text-gray-400">Sin categorías.</div> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full" style={{ background: c.color || '#94a3b8' }} />
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c._count?.services ?? 0} servicios</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditTarget(c)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100"><PencilIcon className="h-4 w-4" /></button>
                    <button onClick={() => del(c.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      <CategoryModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load(); }} />
      <CategoryModal open={!!editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} item={editTarget} />
    </div>
  );
}

function CategoryModal({ open, onClose, onSaved, item }: { open: boolean; onClose: () => void; onSaved: () => void; item?: any }) {
  const [form, setForm] = useState({ name: '', color: '#ec4899' });
  useEffect(() => { setForm(item ? { name: item.name, color: item.color ?? '#ec4899' } : { name: '', color: '#ec4899' }); }, [item, open]);
  const save = async () => {
    try {
      if (item) await apiClient.patch(`/categories/${item.id}`, form);
      else await apiClient.post('/categories', form);
      toast.success('Guardado'); onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
  };
  return (
    <Modal open={open} onClose={onClose} title={item ? 'Editar categoría' : 'Nueva categoría'}>
      <div className="space-y-4">
        <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Manos, Pies, Cabello…" /></div>
        <div><Label>Color</Label><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-20 rounded border border-gray-200" /></div>
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar</Button></div>
      </div>
    </Modal>
  );
}
