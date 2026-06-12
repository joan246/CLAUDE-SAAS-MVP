import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const weeklySchedule = (closeSat = '14:00') =>
  Array.from({ length: 7 }).map((_, dayOfWeek) => ({
    dayOfWeek,
    isWorking: dayOfWeek >= 1 && dayOfWeek <= 6, // Mon–Sat
    startTime: '09:00',
    endTime: dayOfWeek === 6 ? closeSat : '19:00',
  }));

async function main() {
  console.log('🌱 Seeding multitenant database...');

  const already = await prisma.company.findUnique({
    where: { slug: 'bella-nails-studio' },
  });
  if (already) {
    console.log('ℹ️  Demo ya existe, omitiendo seed.');
    return;
  }

  // ── Company + categories + services + business hours + AI + policy ──
  const company = await prisma.company.create({
    data: {
      name: 'Bella Nails Studio',
      slug: 'bella-nails-studio',
      industry: 'Estética / Uñas',
      phone: '+52 55 1111 2222',
      email: 'hola@bellanails.mx',
      address: 'Av. Reforma 123, CDMX',
      timezone: 'America/Mexico_City',
      aiConfig: {
        create: {
          personality: 'Amable, cercana y profesional',
          tone: 'Cálido y divertido, con emojis ocasionales',
          objectives: 'Agendar citas, resolver dudas y fidelizar clientes.',
          rules:
            'No inventes precios. No ofrezcas horarios ocupados. Respeta siempre los buffers.',
          greeting: '¡Hola! 💅 Soy el asistente de Bella Nails. ¿Te ayudo a agendar tu cita?',
        },
      },
      cancellationPolicy: { create: {} },
      businessHours: {
        create: Array.from({ length: 7 }).map((_, dayOfWeek) => ({
          dayOfWeek,
          isOpen: dayOfWeek >= 1 && dayOfWeek <= 6,
          startTime: '09:00',
          endTime: dayOfWeek === 6 ? '14:00' : '19:00',
        })),
      },
    },
  });

  const manos = await prisma.serviceCategory.create({
    data: { companyId: company.id, name: 'Manos', color: '#ec4899' },
  });
  const pies = await prisma.serviceCategory.create({
    data: { companyId: company.id, name: 'Pies', color: '#8b5cf6' },
  });

  const manicure = await prisma.service.create({
    data: { companyId: company.id, categoryId: manos.id, name: 'Manicure', description: 'Manicure clasico', price: 200, duration: 60, buffer: 15 },
  });
  const acrilicas = await prisma.service.create({
    data: { companyId: company.id, categoryId: manos.id, name: 'Unas acrilicas', description: 'Aplicacion completa', price: 450, duration: 120, prepTime: 10, cleanupTime: 10, buffer: 20 },
  });
  const pedicure = await prisma.service.create({
    data: { companyId: company.id, categoryId: pies.id, name: 'Pedicure', description: 'Pedicure spa', price: 250, duration: 45, buffer: 15 },
  });
  const spaManos = await prisma.service.create({
    data: { companyId: company.id, categoryId: manos.id, name: 'Spa de manos', description: 'Tratamiento hidratante', price: 180, duration: 40, buffer: 10 },
  });
  console.log('✅ Categorías y servicios creados');

  // ── Resources ──
  const cabina = await prisma.resource.create({
    data: { companyId: company.id, name: 'Cabina de pedicure', type: 'Cabina', capacity: 2 },
  });
  await prisma.serviceResource.create({
    data: { serviceId: pedicure.id, resourceId: cabina.id, quantity: 1 },
  });
  console.log('✅ Recursos creados');

  // ── Staff: Ana (manos) y Laura (pies) ──
  const ana = await prisma.staff.create({
    data: {
      companyId: company.id,
      name: 'Ana Torres',
      title: 'Manicurista',
      priority: 2,
      schedule: { create: weeklySchedule() },
      services: {
        create: [
          { serviceId: manicure.id },
          { serviceId: acrilicas.id, avgDuration: 100 },
          { serviceId: spaManos.id },
        ],
      },
    },
  });
  const laura = await prisma.staff.create({
    data: {
      companyId: company.id,
      name: 'Laura Méndez',
      title: 'Pedicurista',
      priority: 1,
      schedule: { create: weeklySchedule() },
      services: { create: [{ serviceId: pedicure.id }, { serviceId: spaManos.id }] },
    },
  });
  console.log('✅ Staff creado (Ana: manos · Laura: pies)');

  // ── Admin user (login: test@example.com / password123) ──
  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Ana (Admin)',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Usuario admin: ${admin.email}`);

  // ── Customers ──
  const juan = await prisma.customer.create({
    data: { companyId: company.id, name: 'Juan García', phone: '+52 55 3333 4444', email: 'juan@example.com' },
  });
  await prisma.customer.create({
    data: { companyId: company.id, name: 'María López', phone: '+52 55 5555 6666', email: 'maria@example.com', vip: true },
  });
  console.log('✅ Clientes creados');

  // ── Sample appointment tomorrow 10:00 with Ana ──
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  await prisma.appointment.create({
    data: {
      companyId: company.id,
      customerId: juan.id,
      serviceId: manicure.id,
      staffId: ana.id,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + manicure.duration * 60000),
      status: 'CONFIRMED',
      price: manicure.price,
      reminders: { create: [{ hoursBeforeAppointment: 24 }, { hoursBeforeAppointment: 1 }] },
    },
  });
  console.log('✅ Cita de ejemplo creada (Ana)');

  console.log('🎉 Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
