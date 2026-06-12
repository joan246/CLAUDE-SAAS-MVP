'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatCurrency } from '@/lib/utils';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Category { id: string; name: string }
interface Resource { id: string; name: string; type?: string }

interface Service {
  id: string;
  name: string;
  description?: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  price: number;
  duration: number;
  prepTime: number;
  cleanupTime: number;
  buffer: number;
  active: boolean;
  resources?: { resourceId: string; quantity: number; resource: { id: string; name: string } }[];
}

interface ServiceForm {
  name: string;
  description?: string;
  categoryId?: string;
  price: number;
  duration: number;
  prepTime: number;
  cleanupTime: number;
  buffer: number;
  active: boolean;
}

export default function ServicesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    load();
  }, [token]);

  const load = async () => {
    try {
      setLoading(true);
      const [s, cat, res] = await Promise.all([
        apiClient.get('/services'),
        apiClient.get('/categories'),
        apiClient.get('/resources'),
      ]);
      setServices(s.data);
      setCategories(cat.data);
      setResources(res.data);
    } catch {
      toast.error('Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
            <p className="text-sm text-gray-500">
              {services.length} servicios · define duración, precio y tiempo de descanso
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Nuevo servicio
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">Cargando…</div>
        ) : services.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            Aún no tienes servicios. Crea el primero (ej. Manicure, Corte…).
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Card key={s.id} className={s.active ? '' : 'opacity-60'}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    {!s.active && <Badge className="bg-gray-100 text-gray-600 border-gray-200">Inactivo</Badge>}
                  </div>
                  {s.description && (
                    <p className="mt-1 text-sm text-gray-500">{s.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{formatCurrency(s.price)}</span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {s.duration} min
                    </span>
                    {s.buffer > 0 && (
                      <span className="text-gray-400">+{s.buffer} min descanso</span>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end gap-1">
                    <button
                      onClick={() => setEditTarget(s)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      title="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Eliminar"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ServiceFormModal
        open={createOpen}
        categories={categories}
        resources={resources}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); load(); }}
        title="Nuevo servicio"
      />
      <ServiceFormModal
        open={!!editTarget}
        categories={categories}
        resources={resources}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); }}
        title="Editar servicio"
        service={editTarget ?? undefined}
      />
      <DeleteServiceModal
        service={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); load(); }}
      />
    </DashboardLayout>
  );
}

function ServiceFormModal({
  open, onClose, onSaved, title, service, categories, resources,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  title: string;
  service?: Service;
  categories: Category[];
  resources: Resource[];
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ServiceForm>();
  const [selectedRes, setSelectedRes] = useState<Record<string, number>>({});

  useEffect(() => {
    reset(
      service
        ? {
          name: service.name,
          description: service.description ?? '',
          categoryId: service.categoryId ?? '',
          price: service.price,
          duration: service.duration,
          prepTime: service.prepTime,
          cleanupTime: service.cleanupTime,
          buffer: service.buffer,
          active: service.active,
        }
        : { name: '', description: '', categoryId: '', price: 0, duration: 60, prepTime: 0, cleanupTime: 0, buffer: 15, active: true },
    );
    const initial: Record<string, number> = {};
    (service?.resources ?? []).forEach((r) => (initial[r.resourceId] = r.quantity));
    setSelectedRes(initial);
  }, [service, open]);

  const toggleRes = (id: string) => {
    setSelectedRes((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  };
  const setResQty = (id: string, qty: number) =>
    setSelectedRes((prev) => ({ ...prev, [id]: Math.max(1, qty) }));

  const onSubmit = async (data: ServiceForm) => {
    const payload = {
      ...data,
      categoryId: data.categoryId || undefined,
      price: Number(data.price),
      duration: Number(data.duration),
      prepTime: Number(data.prepTime),
      cleanupTime: Number(data.cleanupTime),
      buffer: Number(data.buffer),
    };
    try {
      let id = service?.id;
      if (service) {
        await apiClient.patch(`/services/${service.id}`, payload);
      } else {
        const created = await apiClient.post('/services', payload);
        id = created.data.id;
      }
      // Sync required resources.
      if (id) {
        await apiClient.put(`/services/${id}/resources`, {
          resources: Object.entries(selectedRes).map(([resourceId, quantity]) => ({ resourceId, quantity })),
        });
      }
      toast.success(service ? 'Servicio actualizado' : 'Servicio creado');
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
          <Input id="name" placeholder="Manicure" {...register('name', { required: 'Requerido' })} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea id="description" rows={2} placeholder="Detalle del servicio…" {...register('description')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="categoryId">Categoría</Label>
            <Select id="categoryId" {...register('categoryId')}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="price">Precio</Label>
            <Input id="price" type="number" min={0} step={10} {...register('price', { required: true })} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label htmlFor="duration">Duración *</Label>
            <Input id="duration" type="number" min={5} step={5} {...register('duration', { required: 'Requerido', min: 5 })} />
          </div>
          <div>
            <Label htmlFor="prepTime">Prep. (min)</Label>
            <Input id="prepTime" type="number" min={0} step={5} {...register('prepTime')} />
          </div>
          <div>
            <Label htmlFor="cleanupTime">Limpieza</Label>
            <Input id="cleanupTime" type="number" min={0} step={5} {...register('cleanupTime')} />
          </div>
          <div>
            <Label htmlFor="buffer">Descanso</Label>
            <Input id="buffer" type="number" min={0} step={5} {...register('buffer')} />
          </div>
        </div>
        {errors.duration && <p className="text-xs text-red-500">La duración mínima es 5 minutos</p>}
        {resources.length > 0 && (
          <div>
            <Label>Recursos requeridos</Label>
            <p className="mb-2 text-xs text-gray-500">El sistema no permitirá reservar si el recurso está ocupado.</p>
            <div className="space-y-1.5">
              {resources.map((r) => {
                const checked = selectedRes[r.id] != null;
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 text-sm">
                    <input type="checkbox" checked={checked} onChange={() => toggleRes(r.id)} className="h-4 w-4 rounded border-gray-300" />
                    <span className="flex-1 text-gray-800">{r.name}{r.type ? ` · ${r.type}` : ''}</span>
                    {checked && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        cant.
                        <Input type="number" min={1} value={selectedRes[r.id]} onChange={(e) => setResQty(r.id, Number(e.target.value))} className="h-8 w-16" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('active')} className="h-4 w-4 rounded border-gray-300" />
          Servicio activo (disponible para reservar)
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : service ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteServiceModal({
  service, onClose, onDeleted,
}: {
  service: Service | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!service) return;
    setLoading(true);
    try {
      await apiClient.delete(`/services/${service.id}`);
      toast.success('Servicio eliminado');
      onDeleted();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal open={!!service} onClose={onClose} title="Eliminar servicio">
      <div className="space-y-4">
        <p className="text-gray-600">
          ¿Eliminar <span className="font-semibold text-gray-900">{service?.name}</span>? Las
          citas existentes no se borrarán, pero quedarán sin servicio asignado.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
            {loading ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
