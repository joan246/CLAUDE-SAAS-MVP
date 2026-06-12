'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  BotIcon, UserIcon, SendIcon, SearchIcon, PhoneIcon,
  CalendarIcon, DollarSignIcon, AlertTriangleIcon, StarIcon,
  XIcon, ChevronRightIcon, ClockIcon, MessageSquareIcon,
} from 'lucide-react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatDateTime, statusLabel, statusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Conversation {
  id: string;
  phoneNumber: string;
  state: string;
  botMode: 'AI' | 'HUMAN';
  updatedAt: string;
}

interface Message {
  id: string;
  message: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [crmData, setCrmData] = useState<any>(null);
  const [crmLoading, setCrmLoading] = useState(false);
  const [showCrmMobile, setShowCrmMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!token) router.push('/login'); }, [token]);
  useEffect(() => { if (token) loadConversations(); }, [token]);
  useEffect(() => { if (activePhone) { loadMessages(activePhone); loadCRM(activePhone); } }, [activePhone]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Data Loading ───────────────────────────────────────────────────────
  const loadConversations = async () => {
    try {
      const res = await apiClient.get('/whatsapp/conversations');
      setConversations(res.data);
      if (res.data.length > 0 && !activePhone) setActivePhone(res.data[0].phoneNumber);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const loadMessages = async (phone: string) => {
    try {
      const res = await apiClient.get(`/whatsapp/messages/${phone}`);
      setMessages(res.data);
    } catch { /* silent */ }
  };

  const loadCRM = async (phone: string) => {
    setCrmData(null);
    setCrmLoading(true);
    try {
      const res = await apiClient.get(`/customers/by-phone/${phone}`);
      if (res.data) {
        const profileRes = await apiClient.get(`/customers/${res.data.id}/profile`);
        setCrmData(profileRes.data);
      }
    } catch {
      // Customer may not exist yet - that's ok
      setCrmData(null);
    } finally { setCrmLoading(false); }
  };

  const toggleMode = async (phone: string, currentMode: string) => {
    const newMode = currentMode === 'AI' ? 'HUMAN' : 'AI';
    try {
      await apiClient.post('/whatsapp/toggle-mode', { phoneNumber: phone, mode: newMode });
      setConversations(prev => prev.map(c => c.phoneNumber === phone ? { ...c, botMode: newMode as any } : c));
    } catch { /* silent */ }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activePhone) return;
    const text = inputText;
    setInputText('');
    setSending(true);
    setMessages(prev => [...prev, { id: String(Date.now()), message: text, direction: 'outgoing', createdAt: new Date().toISOString() }]);
    try {
      await apiClient.post('/whatsapp/send', { phoneNumber: activePhone, message: text });
      setConversations(prev => prev.map(c => c.phoneNumber === activePhone ? { ...c, botMode: 'HUMAN' } : c));
    } catch { loadMessages(activePhone); }
    finally { setSending(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const activeConv = conversations.find(c => c.phoneNumber === activePhone);
  const filtered = conversations.filter(c =>
    c.phoneNumber.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm animate-in fade-in duration-300">

        {/* ═══════════════════ COLUMN 1: Conversation List ═══════════════════ */}
        <div className={`w-full md:w-80 lg:w-[320px] flex-shrink-0 border-r border-gray-200 bg-gray-50/50 flex flex-col ${activePhone ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Conversaciones</h2>
            <p className="text-xs text-gray-500 mt-0.5">{conversations.length} chats activos</p>
            {/* Search */}
            <div className="mt-3 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <MessageSquareIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                {search ? 'Sin resultados' : 'No hay conversaciones'}
              </div>
            ) : (
              filtered.map(c => {
                const isActive = activePhone === c.phoneNumber;
                const lastUpdate = new Date(c.updatedAt);
                const timeAgo = formatRelativeTime(lastUpdate);
                return (
                  <button
                    key={c.id}
                    onClick={() => setActivePhone(c.phoneNumber)}
                    className={`w-full text-left p-4 border-b border-gray-100 transition-all hover:bg-gray-100/80 ${isActive ? 'bg-primary/5 border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-transparent'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 flex-shrink-0">
                            <PhoneIcon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">+{c.phoneNumber}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo}</p>
                          </div>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${c.botMode === 'AI' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>
                        {c.botMode === 'AI' ? '🤖 IA' : '👤 Manual'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════════════════ COLUMN 2: Chat Thread ═══════════════════ */}
        <div className={`flex-1 flex flex-col min-w-0 ${!activePhone ? 'hidden md:flex' : 'flex'}`}>
          {activePhone ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between bg-white z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile back button */}
                  <button onClick={() => setActivePhone(null)} className="md:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100">
                    <ChevronRightIcon className="h-5 w-5 rotate-180" />
                  </button>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <PhoneIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">+{activePhone}</p>
                    <p className="text-[11px] text-gray-500">{crmData?.customer?.name || 'Cliente'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* AI/Human toggle */}
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                    <button
                      onClick={() => toggleMode(activePhone, activeConv?.botMode || 'AI')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeConv?.botMode === 'AI' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <BotIcon className="w-3.5 h-3.5" /> IA
                    </button>
                    <button
                      onClick={() => toggleMode(activePhone, activeConv?.botMode || 'AI')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeConv?.botMode === 'HUMAN' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <UserIcon className="w-3.5 h-3.5" /> Manual
                    </button>
                  </div>
                  {/* CRM panel toggle (mobile/tablet) */}
                  <button
                    onClick={() => setShowCrmMobile(!showCrmMobile)}
                    className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 border border-gray-200"
                    title="Ver ficha del cliente"
                  >
                    <UserIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50/30 to-white">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                    <MessageSquareIcon className="h-12 w-12 opacity-20" />
                    <p className="text-sm">Sin mensajes aún</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isIncoming = msg.direction === 'incoming';
                  return (
                    <div key={msg.id} className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${isIncoming
                        ? 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-md shadow-sm'
                        : 'bg-primary text-white rounded-2xl rounded-tr-md shadow-md'
                        }`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-[10px] mt-1 text-right ${isIncoming ? 'text-gray-400' : 'text-white/60'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                <form onSubmit={sendMessage} className="flex gap-2 items-end">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50/50"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center w-10 h-10 shadow-sm"
                  >
                    <SendIcon className="w-4 h-4" />
                  </button>
                </form>
                {activeConv?.botMode === 'AI' && (
                  <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                    Enviar un mensaje cambiará automáticamente a Modo Manual
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-3">
              <MessageSquareIcon className="h-16 w-16 opacity-15" />
              <p className="text-sm font-medium">Selecciona una conversación</p>
              <p className="text-xs">para ver el hilo de mensajes</p>
            </div>
          )}
        </div>

        {/* ═══════════════════ COLUMN 3: CRM Sidebar ═══════════════════ */}
        {activePhone && (
          <div className={`w-80 border-l border-gray-200 bg-gray-50/30 flex-col flex-shrink-0 overflow-y-auto ${showCrmMobile ? 'fixed inset-y-0 right-0 z-50 flex bg-white shadow-2xl w-80 animate-in slide-in-from-right duration-200' : 'hidden lg:flex'}`}>
            {/* Mobile close */}
            {showCrmMobile && (
              <button onClick={() => setShowCrmMobile(false)} className="lg:hidden absolute top-3 right-3 p-1.5 rounded-md hover:bg-gray-100 z-10">
                <XIcon className="h-4 w-4 text-gray-500" />
              </button>
            )}

            {crmLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !crmData ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <UserIcon className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">Cliente no registrado</p>
                <p className="text-xs text-gray-400 mt-1">Este número aún no tiene un perfil en el CRM</p>
              </div>
            ) : (
              <CRMSidebar data={crmData} />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── CRM Sidebar Component ──────────────────────────────────────────────────
function CRMSidebar({ data }: { data: any }) {
  const c = data.customer;
  const s = data.stats;

  return (
    <div className="p-4 space-y-5">
      {/* Profile Header */}
      <div className="text-center pt-2">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 mx-auto">
          {c.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
        </span>
        <h3 className="mt-3 font-bold text-gray-900 text-base">{c.name}</h3>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <PhoneIcon className="h-3 w-3" /> {c.phone}
          </span>
          {c.vip && (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px]">
              <StarIcon className="h-2.5 w-2.5 mr-0.5 fill-current" />VIP
            </Badge>
          )}
        </div>
        {c.email && <p className="text-xs text-gray-400 mt-1">{c.email}</p>}
        <p className="text-[11px] text-gray-400 mt-1">Cliente desde {new Date(c.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Alerts */}
      {s.lateCancellations > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
          <AlertTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{s.lateCancellations} cancelación(es) tardía(s)</span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-2">
        <KPICard label="Valor (LTV)" value={`$${s.lifetimeValue}`} color="text-emerald-600" />
        <KPICard label="Citas" value={s.totalAppointments} color="text-blue-600" />
        <KPICard label="Inasistencias" value={s.noShows} color="text-red-600" />
        <KPICard label="Frecuencia" value={s.frequencyDays ? `${s.frequencyDays}d` : 'N/A'} color="text-purple-600" />
      </div>

      {/* Upcoming */}
      {s.upcoming > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            {s.upcoming} cita(s) próxima(s)
          </p>
        </div>
      )}

      {/* History */}
      <div>
        <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wider mb-2">
          Últimas Interacciones
        </h4>
        {data.history.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3 border border-dashed rounded-lg">Sin citas registradas</p>
        ) : (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {data.history.slice(0, 8).map((apt: any) => (
              <div key={apt.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{apt.service?.name ?? 'Cita'}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <ClockIcon className="h-2.5 w-2.5" />
                    {formatDateTime(apt.startTime)}
                  </p>
                </div>
                <Badge className={`text-[10px] ${statusColor(apt.status)}`}>
                  {statusLabel(apt.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Small KPI Card ──────────────────────────────────────────────────────────
function KPICard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-2.5 text-center shadow-sm">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Ayer';
  return `Hace ${diffDays}d`;
}
