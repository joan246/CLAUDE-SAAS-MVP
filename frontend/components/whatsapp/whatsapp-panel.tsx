'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
  SmartphoneIcon,
  RefreshCwIcon,
  UnplugIcon,
  QrCodeIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type SessionStatus =
  | 'DISCONNECTED'
  | 'INITIALIZING'
  | 'QR_PENDING'
  | 'CONNECTED'
  | 'RECONNECTING';

interface Session {
  status: SessionStatus;
  phoneNumber: string | null;
  displayName: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  qr: { dataUrl: string; generatedAt: string } | null;
}

const EMPTY_SESSION: Session = {
  status: 'DISCONNECTED',
  phoneNumber: null,
  displayName: null,
  connectedAt: null,
  lastSyncAt: null,
  qr: null,
};

const STATUS_META: Record<SessionStatus, { label: string; className: string }> = {
  CONNECTED: { label: 'Conectado', className: 'bg-green-100 text-green-800 border-green-200' },
  QR_PENDING: { label: 'Esperando escaneo', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  INITIALIZING: { label: 'Iniciando…', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  RECONNECTING: { label: 'Reconectando…', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  DISCONNECTED: { label: 'Desconectado', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export function WhatsAppPanel() {
  const { token } = useAuthStore();
  const [session, setSession] = useState<Session>(EMPTY_SESSION);
  const [working, setWorking] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await apiClient.get('/whatsapp/session');
      setSession(res.data);
    } catch {
      // silencioso: el polling/reintento lo cubre
    }
  }, []);

  // ── Tiempo real: socket autenticado, room por empresa ──
  useEffect(() => {
    fetchSession();
    if (!token) return;

    const socket = io(`${API_URL}/whatsapp`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('qr_generated', (p: { qrDataUrl: string; generatedAt: string }) => {
      setSession((s) => ({
        ...s,
        status: 'QR_PENDING',
        qr: { dataUrl: p.qrDataUrl, generatedAt: p.generatedAt },
      }));
    });
    socket.on('connected', () => {
      toast.success('¡WhatsApp conectado!');
      fetchSession();
    });
    socket.on('session_restored', () => fetchSession());
    socket.on('disconnected', () => {
      setSession((s) => ({ ...s, status: 'DISCONNECTED', qr: null }));
      fetchSession();
    });
    socket.on('reconnecting', () => setSession((s) => ({ ...s, status: 'RECONNECTING' })));
    const touch = (p: { timestamp: string }) =>
      setSession((s) => ({ ...s, lastSyncAt: p.timestamp }));
    socket.on('message_received', touch);
    socket.on('message_sent', touch);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, fetchSession]);

  // ── Respaldo por sondeo mientras hay una transición en curso ──
  useEffect(() => {
    if (!['INITIALIZING', 'QR_PENDING', 'RECONNECTING'].includes(session.status)) return;
    const id = setInterval(fetchSession, 4000);
    return () => clearInterval(id);
  }, [session.status, fetchSession]);

  const run = async (fn: () => Promise<void>) => {
    setWorking(true);
    try {
      await fn();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error en la operación');
    } finally {
      setWorking(false);
    }
  };

  const connect = () =>
    run(async () => {
      const res = await apiClient.post('/whatsapp/session/connect');
      setSession(res.data);
      toast('Generando código QR…', { icon: '📱' });
    });

  const reconnect = () =>
    run(async () => {
      const res = await apiClient.post('/whatsapp/session/reconnect');
      setSession(res.data);
      toast('Reconectando sesión…', { icon: '🔄' });
    });

  const disconnect = () => {
    if (!confirm('¿Desvincular WhatsApp? Tendrás que escanear un nuevo QR para volver a conectar.'))
      return;
    run(async () => {
      await apiClient.delete('/whatsapp/session');
      setSession(EMPTY_SESSION);
      toast.success('WhatsApp desvinculado');
    });
  };

  const meta = STATUS_META[session.status] ?? STATUS_META.DISCONNECTED;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <SmartphoneIcon className="h-4 w-4 text-green-600" />
          WhatsApp — Dispositivo vinculado
        </CardTitle>
        <Badge className={meta.className}>{meta.label}</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Desconectado ── */}
        {session.status === 'DISCONNECTED' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <QrCodeIcon className="h-12 w-12 text-gray-300" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                Conecta el WhatsApp de tu negocio
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                La plataforma funcionará como un dispositivo vinculado más: recibirá y
                responderá mensajes automáticamente con tu asistente IA, enviará
                recordatorios, confirmaciones y campañas.
              </p>
            </div>
            <Button onClick={connect} disabled={working}>
              {working ? 'Iniciando…' : 'Conectar WhatsApp'}
            </Button>
          </div>
        )}

        {/* ── Iniciando / Reconectando ── */}
        {(session.status === 'INITIALIZING' || session.status === 'RECONNECTING') && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2Icon className="h-8 w-8 animate-spin text-green-600" />
            <p className="text-sm text-gray-600">
              {session.status === 'INITIALIZING'
                ? 'Preparando la sesión… el código QR aparecerá aquí en unos segundos.'
                : 'Reconectando con WhatsApp usando la sesión guardada…'}
            </p>
          </div>
        )}

        {/* ── QR pendiente ── */}
        {session.status === 'QR_PENDING' && (
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div className="flex justify-center">
              {session.qr ? (
                <img
                  src={session.qr.dataUrl}
                  alt="Código QR de WhatsApp"
                  className="h-64 w-64 rounded-lg border border-gray-200 bg-white p-2"
                />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-dashed border-gray-300">
                  <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800">
                Escanea el código desde tu teléfono:
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
                <li>Abre <b>WhatsApp</b> en tu teléfono</li>
                <li>Ve a <b>Configuración</b></li>
                <li>Toca <b>Dispositivos vinculados</b></li>
                <li>Toca <b>Vincular dispositivo</b></li>
                <li>Apunta la cámara a este código</li>
              </ol>
              <p className="text-xs text-gray-400">
                El código se renueva automáticamente cada ~50 segundos. No cierres esta
                pantalla hasta completar la vinculación.
              </p>
            </div>
          </div>
        )}

        {/* ── Conectado ── */}
        {session.status === 'CONNECTED' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
              <CheckCircle2Icon className="h-5 w-5 shrink-0 text-green-600" />
              <p className="text-sm text-green-800">
                Sesión activa. Los mensajes se reciben y responden automáticamente; la
                sesión se restaura sola aunque el servidor se reinicie.
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-100 p-3">
                <dt className="text-xs text-gray-500">Número conectado</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">
                  {session.phoneNumber ? `+${session.phoneNumber}` : '—'}
                  {session.displayName && (
                    <span className="ml-2 font-normal text-gray-500">
                      ({session.displayName})
                    </span>
                  )}
                </dd>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <dt className="text-xs text-gray-500">Conectado desde</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">
                  {fmtDate(session.connectedAt)}
                </dd>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 sm:col-span-2">
                <dt className="text-xs text-gray-500">Última sincronización</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">
                  {fmtDate(session.lastSyncAt)}
                </dd>
              </div>
            </dl>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={reconnect} disabled={working}>
                <RefreshCwIcon className="mr-2 h-4 w-4" />
                Reconectar
              </Button>
              <Button
                variant="outline"
                onClick={disconnect}
                disabled={working}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <UnplugIcon className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
