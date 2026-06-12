import Link from 'next/link';
import {
  CalendarDaysIcon,
  UsersIcon,
  SparklesIcon,
  LayoutGridIcon,
  ArrowRightIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

const features = [
  {
    icon: CalendarDaysIcon,
    title: 'Calendario multi-staff',
    desc: 'Visualiza la agenda de todo tu equipo con asignación automática de personal y recursos.',
  },
  {
    icon: SparklesIcon,
    title: 'Reservas inteligentes',
    desc: 'El motor respeta horarios, especialidades, buffers y disponibilidad en tiempo real.',
  },
  {
    icon: UsersIcon,
    title: 'CRM y fidelización',
    desc: 'Historial completo de cada cliente, segmentación y campañas de remarketing.',
  },
  {
    icon: LayoutGridIcon,
    title: 'Dashboard ejecutivo',
    desc: 'Ingresos, ocupación, conversión y servicios top en un solo vistazo.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost">Iniciar sesión</Button>
          </Link>
          <Link href="/register">
            <Button>Empezar gratis</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center md:pt-24">
        <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Plataforma de reservas para negocios de servicios
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          Gestiona citas, equipo y clientes
          <br className="hidden md:block" /> desde un solo lugar
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-500">
          Para barberías, salones, spas, clínicas, talleres y cualquier negocio que trabaje con reservas.
          Configurable al 100%, sin programar.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Crear mi cuenta <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">Ver demo</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} CitasPro — Gestión inteligente de reservas
      </footer>
    </div>
  );
}
