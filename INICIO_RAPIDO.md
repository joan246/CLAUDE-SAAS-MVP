# ⚡ GUÍA DE INICIO RÁPIDO - MVP (60 Días)

**Documento para el equipo técnico**  
**Aprobado por CTO - Junio 2026**

---

## 📦 ESTRUCTURA DE REPOSITORIOS

```
claude-saas-mvp/
│
├─── backend/                 [Node.js + TypeScript]
│    ├─── src/
│    │    ├─── middleware/
│    │    │    ├─── auth.ts              [JWT verification]
│    │    │    ├─── tenantContext.ts     [Multi-tenant]
│    │    │    └─── errorHandler.ts
│    │    │
│    │    ├─── routes/
│    │    │    ├─── appointments.ts      [CRUD appointments]
│    │    │    ├─── conversations.ts     [Chat endpoints]
│    │    │    ├─── customers.ts         [Customer mgmt]
│    │    │    ├─── webhooks.ts          [WhatsApp/IG webhooks]
│    │    │    ├─── auth.ts              [Login/signup]
│    │    │    └─── health.ts            [Health check]
│    │    │
│    │    ├─── services/
│    │    │    ├─── ChatService.ts       [NLU + routing]
│    │    │    ├─── SchedulerService.ts  [Availability logic]
│    │    │    ├─── WhatsAppService.ts   [WhatsApp API integration]
│    │    │    ├─── MessageQueue.ts      [Redis queue]
│    │    │    └─── AuthService.ts       [JWT, bcrypt]
│    │    │
│    │    ├─── database/
│    │    │    ├─── schema.sql           [PostgreSQL schema]
│    │    │    ├─── migrations/          [Versioned migrations]
│    │    │    └─── seeds.sql            [Dev data]
│    │    │
│    │    ├─── jobs/
│    │    │    ├─── ReminderJob.ts       [Cron: Send reminders]
│    │    │    ├─── AnalyticsJob.ts      [Cron: Daily summary]
│    │    │    └─── CleanupJob.ts        [Cron: Old logs]
│    │    │
│    │    ├─── types/
│    │    │    ├─── index.ts             [Global types]
│    │    │    ├─── models.ts            [DB models]
│    │    │    └─── api.ts               [API response types]
│    │    │
│    │    ├─── utils/
│    │    │    ├─── logger.ts            [Logging setup]
│    │    │    ├─── crypto.ts            [Signature verification]
│    │    │    └─── validators.ts        [Input validation]
│    │    │
│    │    └─── index.ts                  [Entry point]
│    │
│    ├─── tests/
│    │    ├─── unit/                     [Jest unit tests]
│    │    └─── integration/              [DB + API tests]
│    │
│    ├─── Dockerfile
│    ├─── docker-compose.yml
│    ├─── package.json
│    ├─── tsconfig.json
│    └─── .env.example
│
├─── frontend/                [React + TypeScript]
│    ├─── src/
│    │    ├─── components/
│    │    │    ├─── Layout/
│    │    │    │    ├─── Sidebar.tsx
│    │    │    │    ├─── Header.tsx
│    │    │    │    └─── Layout.tsx
│    │    │    │
│    │    │    ├─── Pages/
│    │    │    │    ├─── Dashboard.tsx
│    │    │    │    ├─── Appointments.tsx
│    │    │    │    ├─── Customers.tsx
│    │    │    │    ├─── Conversations.tsx
│    │    │    │    ├─── Settings.tsx
│    │    │    │    └─── Login.tsx
│    │    │    │
│    │    │    └─── Common/
│    │    │         ├─── Modal.tsx
│    │    │         ├─── Button.tsx
│    │    │         ├─── Form.tsx
│    │    │         └─── Table.tsx
│    │    │
│    │    ├─── hooks/
│    │    │    ├─── useAuth.ts            [Auth context]
│    │    │    ├─── useApi.ts             [API calls]
│    │    │    └─── useForm.ts            [Form state]
│    │    │
│    │    ├─── services/
│    │    │    ├─── api.ts                [Axios setup]
│    │    │    └─── auth.ts               [Auth logic]
│    │    │
│    │    ├─── styles/
│    │    │    └─── globals.css           [Tailwind]
│    │    │
│    │    ├─── types/
│    │    │    └─── index.ts              [TypeScript types]
│    │    │
│    │    └─── App.tsx
│    │
│    ├─── tests/
│    │    └─► [Vitest unit tests]
│    │
│    ├─── Dockerfile
│    ├─── vite.config.ts
│    ├─── package.json
│    ├─── tsconfig.json
│    └─── .env.example
│
├─── .github/
│    └─── workflows/
│         ├─── ci.yml                    [Lint + test]
│         ├─── security.yml              [npm audit, Snyk]
│         └─── deploy.yml                [Deploy to staging/prod]
│
├─── docker-compose.yml                  [Local dev environment]
├─── README.md                           [Project overview]
├─── ARQUITECTURA_MVP.md                 [This! Architecture doc]
└─── DIAGRAMA_DETALLADO.md               [Detailed diagrams]
```

---

## 🚀 SETUP INICIAL (Día 1)

### 1. Configuración de Repositorio

```bash
# Create main monorepo
mkdir claude-saas-mvp && cd claude-saas-mvp
git init

# Create backend directory
mkdir backend && cd backend

# Initialize Node.js project
npm init -y

# Install core dependencies
npm install fastify @fastify/cors @fastify/jwt @fastify/helmet
npm install pg redis bcrypt jsonwebtoken
npm install bull dotenv zod
npm install -D typescript ts-node @types/node jest ts-jest
npm install -D prettier eslint

# Generate tsconfig
npx tsc --init

# Create basic structure
mkdir -p src/{routes,services,middleware,database,jobs,utils,types}
```

### 2. Configuración PostgreSQL

```bash
# Ensure PostgreSQL is running (via docker-compose)
docker-compose up -d postgres

# Wait 10 seconds for startup
sleep 10

# Connect and run schema
psql -h localhost -U postgres -d postgres < src/database/schema.sql

# Verify
psql -h localhost -U postgres -d postgres -c "\dt"
```

### 3. Configuración Redis

```bash
# Via docker-compose (already running)
# Test connection
redis-cli -h localhost PING
# Response: PONG
```

### 4. Configuración Frontend

```bash
cd ../frontend

# Create Vite app
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install
npm install react-router-dom axios zod react-hook-form
npm install -D tailwindcss postcss autoprefixer
npm install shadcn-ui

# Initialize Tailwind
npx tailwindcss init -p
```

### 5. Configuración de Secretos

```bash
# Backend .env
cat > backend/.env << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:dev@localhost:5432/claude_saas
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-min-32-chars-change-in-prod
JWT_EXPIRY=3600

# WhatsApp
WHATSAPP_TOKEN=your-token-from-meta
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_VERIFY_TOKEN=your-verify-token

# Sentry
SENTRY_DSN=your-sentry-dsn

# Environment
NODE_ENV=development
PORT=3001
EOF

# Frontend .env
cat > frontend/.env << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_APP_NAME="Gestor de Citas SaaS"
EOF
```

---

## 📝 IMPLEMENTACIÓN POR SPRINT

### SPRINT 1-2: Semanas 1-4 (MVP CORE)

#### ✅ Week 1: Infrastructure & Database

**Goals:**
- [ ] Local dev environment working (docker-compose)
- [ ] Database schema finalized
- [ ] Basic auth system
- [ ] CI/CD pipeline setup

**Tasks:**
1. Database Schema Implementation
   ```sql
   -- backend/src/database/schema.sql
   
   CREATE TABLE tenants (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name VARCHAR(255) NOT NULL,
     slug VARCHAR(255) UNIQUE NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     tenant_id UUID REFERENCES tenants(id),
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     name VARCHAR(255),
     role VARCHAR(50) DEFAULT 'admin',
     created_at TIMESTAMP DEFAULT NOW(),
     
     UNIQUE(tenant_id, email)
   );
   
   -- ... [Full schema in ARQUITECTURA_MVP.md Section 5.2.1]
   ```

2. Auth Service
   ```typescript
   // backend/src/services/AuthService.ts
   
   import bcrypt from 'bcrypt';
   import jwt from 'jsonwebtoken';
   
   export class AuthService {
     async hashPassword(password: string): Promise<string> {
       return bcrypt.hash(password, 12);
     }
     
     async verifyPassword(plain: string, hashed: string): Promise<boolean> {
       return bcrypt.compare(plain, hashed);
     }
     
     async generateToken(userId: string, tenantId: string, role: string) {
       return jwt.sign(
         { sub: userId, tenant_id: tenantId, role },
         process.env.JWT_SECRET!,
         { expiresIn: process.env.JWT_EXPIRY }
       );
     }
   }
   ```

3. Tenant Middleware
   ```typescript
   // backend/src/middleware/tenantContext.ts
   
   export async function tenantContextPlugin(fastify) {
     fastify.addHook('preHandler', async (request, reply) => {
       try {
         await request.jwtVerify();
         const token = request.user as any;
         request.tenantId = token.tenant_id;
         
         // Set PostgreSQL context
         await fastify.db.query(
           `SET app.current_tenant_id TO $1`,
           [request.tenantId]
         );
       } catch (error) {
         reply.code(401).send({ error: 'Unauthorized' });
       }
     });
   }
   ```

4. GitHub Actions CI/CD
   ```yaml
   # .github/workflows/ci.yml
   
   name: CI
   on: [push, pull_request]
   
   jobs:
     lint-test:
       runs-on: ubuntu-latest
       services:
         postgres:
           image: postgres:16
           env:
             POSTGRES_PASSWORD: test
         redis:
           image: redis:7
       
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '20'
             cache: 'npm'
         
         - run: npm install
         - run: npm run lint
         - run: npm run test:unit
         - run: npm run test:integration
   ```

**Deliverable:** "npm run dev" works locally, all tables created, JWT auth functional

---

#### ✅ Week 2: Basic APIs & Chat Engine

**Goals:**
- [ ] REST API endpoints (CRUD)
- [ ] WhatsApp webhook receiver
- [ ] Basic message parsing
- [ ] All with TypeScript type safety

**Tasks:**
1. Core REST Routes
   ```typescript
   // backend/src/routes/appointments.ts
   
   export async function appointmentsRouter(fastify) {
     // Get all appointments for business
     fastify.get('/appointments', async (request, reply) => {
       const { business_id } = request.query;
       const appts = await fastify.db.query(
         `SELECT * FROM appointments 
          WHERE tenant_id = $1 AND business_id = $2
          ORDER BY scheduled_at DESC`,
         [request.tenantId, business_id]
       );
       return appts.rows;
     });
     
     // Create appointment
     fastify.post('/appointments', async (request, reply) => {
       const { business_id, customer_id, service_id, scheduled_at } = request.body;
       const result = await fastify.db.query(
         `INSERT INTO appointments 
          (business_id, tenant_id, customer_id, service_id, scheduled_at, status)
          VALUES ($1, $2, $3, $4, $5, 'scheduled')
          RETURNING *`,
         [business_id, request.tenantId, customer_id, service_id, scheduled_at]
       );
       reply.code(201);
       return result.rows[0];
     });
   }
   ```

2. WhatsApp Webhook Handler
   ```typescript
   // backend/src/routes/webhooks.ts
   
   import crypto from 'crypto';
   
   export async function webhooksRouter(fastify) {
     // WhatsApp sends GET to verify endpoint
     fastify.get('/webhook', async (request, reply) => {
       const { 'hub.challenge': challenge } = request.query;
       reply.send(challenge);
     });
     
     // WhatsApp sends POST on message received
     fastify.post('/webhook', async (request, reply) => {
       const signature = request.headers['x-hub-signature-256'];
       
       // Verify signature: HMAC-SHA256
       const hash = crypto
         .createHmac('sha256', process.env.WHATSAPP_TOKEN!)
         .update(JSON.stringify(request.body))
         .digest('hex');
       
       const expected = `sha256=${hash}`;
       
       if (!crypto.timingSafeEqual(signature, expected)) {
         return reply.code(401).send({ error: 'Unauthorized' });
       }
       
       // ACK immediately (don't block)
       reply.code(200).send({ ok: true });
       
       // Process in background
       await fastify.messageQueue.add({
         type: 'whatsapp_message',
         payload: request.body
       });
     });
   }
   ```

3. Basic Chat Service
   ```typescript
   // backend/src/services/ChatService.ts
   
   export class ChatService {
     async processMessage(msg: IncomingMessage) {
       // 1. Extract info
       const { from, text } = msg;
       
       // 2. Get or create customer
       const customer = await this.getOrCreateCustomer(from);
       
       // 3. Simple intent detection (rules-based MVP)
       const intent = this.detectIntent(text);
       
       // 4. Get business config
       const business = await this.getBusinessConfig(customer.business_id);
       
       // 5. Generate response
       const response = this.generateResponse(intent, business, text);
       
       // 6. Queue outgoing message
       await this.queueOutgoing({
         to: from,
         message: response.text,
         buttons: response.buttons
       });
       
       // 7. Log conversation
       await this.logMessage(customer.id, text, 'incoming');
     }
     
     private detectIntent(text: string): string {
       const lower = text.toLowerCase();
       if (lower.includes('agendar') || lower.includes('cita')) {
         return 'appointment_request';
       }
       if (lower.includes('cancelar')) {
         return 'cancellation';
       }
       if (lower.includes('precio') || lower.includes('costo')) {
         return 'pricing_inquiry';
       }
       return 'general_inquiry';
     }
     
     private generateResponse(intent: string, business, text: string) {
       switch (intent) {
         case 'appointment_request':
           return {
             text: `¿Qué servicio buscas?`,
             buttons: business.services.map(s => ({
               id: s.id,
               title: s.name
             }))
           };
         case 'pricing_inquiry':
           return {
             text: `Nuestros precios:\n${business.services
               .map(s => `${s.name}: $${s.price}`)
               .join('\n')}`
           };
         default:
           return {
             text: `Gracias por tu mensaje. ¿En qué podemos ayudarte?`,
             buttons: [
               { id: 'appointment', title: 'Agendar cita' },
               { id: 'support', title: 'Soporte' }
             ]
           };
       }
     }
   }
   ```

4. Background Job Processing (BullMQ)
   ```typescript
   // backend/src/index.ts
   
   import Queue from 'bull';
   import { ChatService } from './services/ChatService';
   
   const messageQueue = new Queue('messages', {
     redis: { url: process.env.REDIS_URL }
   });
   
   // Process messages in background
   messageQueue.process(async (job) => {
     const chatService = new ChatService();
     await chatService.processMessage(job.data.payload);
   });
   
   // Error handling
   messageQueue.on('failed', (job, err) => {
     console.error('Job failed:', err);
     // Retry with exponential backoff
   });
   ```

**Deliverable:** `curl http://localhost:3001/health` returns 200, can send WhatsApp webhook test

---

#### ✅ Week 3: Scheduler & Reminder System

**Goals:**
- [ ] Appointment availability logic
- [ ] Cron job for reminders
- [ ] Ability to confirm/cancel appointments
- [ ] All with comprehensive tests

**Tasks:**
1. Scheduler Service (Logic)
   ```typescript
   // backend/src/services/SchedulerService.ts
   
   export class SchedulerService {
     async getAvailableSlots(
       businessId: string,
       date: Date,
       serviceId: string
     ) {
       // 1. Get business config
       const business = await this.getBusinessConfig(businessId);
       const service = await this.getService(serviceId);
       
       // 2. Generate time slots
       const slots: Date[] = [];
       let current = startOfDay(date).setHours(business.open_hour);
       const end = startOfDay(date).setHours(business.close_hour);
       
       while (current < end) {
         slots.push(new Date(current));
         current += service.duration_minutes * 60 * 1000;
       }
       
       // 3. Get occupied appointments
       const occupied = await this.getOccupiedSlots(businessId, date);
       
       // 4. Filter out occupied slots (with buffer)
       const available = slots.filter(slot => {
         const slotEnd = new Date(slot.getTime() + service.duration_minutes * 60 * 1000);
         
         return !occupied.some(occ => {
           const occEnd = new Date(occ.getTime() + service.duration_minutes * 60 * 1000);
           return (slot < occEnd && slotEnd > occ); // Overlaps?
         });
       });
       
       return available;
     }
     
     async confirmAppointment(
       businessId: string,
       slotTime: Date,
       customerId: string,
       serviceId: string
     ) {
       // Use pessimistic locking
       const client = await this.db.connect();
       try {
         await client.query('BEGIN');
         
         // Lock row during transaction
         await client.query(
           `SELECT * FROM appointments 
            WHERE business_id = $1 AND scheduled_at = $2 
            FOR UPDATE`,
           [businessId, slotTime]
         );
         
         // Check still available
         const occupied = await client.query(
           `SELECT COUNT(*) FROM appointments 
            WHERE business_id = $1 AND scheduled_at = $2`,
           [businessId, slotTime]
         );
         
         if (occupied.rows[0].count > 0) {
           throw new Error('Slot no longer available');
         }
         
         // Create appointment
         const result = await client.query(
           `INSERT INTO appointments 
            (business_id, tenant_id, customer_id, service_id, scheduled_at, status)
            VALUES ($1, $2, $3, $4, $5, 'scheduled')
            RETURNING *`,
           [businessId, this.tenantId, customerId, serviceId, slotTime]
         );
         
         await client.query('COMMIT');
         return result.rows[0];
         
       } catch (error) {
         await client.query('ROLLBACK');
         throw error;
       } finally {
         client.release();
       }
     }
   }
   ```

2. Reminder Cron Job
   ```typescript
   // backend/src/jobs/ReminderJob.ts
   
   import cron from 'node-cron';
   import { db } from '../database';
   
   export function startReminderJob() {
     // Run every 5 minutes
     cron.schedule('*/5 * * * *', async () => {
       try {
         // Get appointments for next 24h
         const appointments = await db.query(
           `SELECT a.*, c.phone, b.name as business_name
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            JOIN businesses b ON a.business_id = b.id
            WHERE a.scheduled_at >= NOW() + INTERVAL '23 hours'
            AND a.scheduled_at <= NOW() + INTERVAL '24 hours'
            AND a.reminder_sent = false
            AND a.status = 'scheduled'`
         );
         
         for (const appt of appointments.rows) {
           // Queue reminder message
           await messageQueue.add({
             type: 'reminder',
             phone: appt.phone,
             businessId: appt.business_id,
             appointmentId: appt.id,
             message: `Recordatorio: Cita mañana a las ${appt.scheduled_at.toLocaleTimeString('es-CO')} en ${appt.business_name}`
           });
           
           // Mark as sent
           await db.query(
             'UPDATE appointments SET reminder_sent = true WHERE id = $1',
             [appt.id]
           );
         }
       } catch (error) {
         console.error('Reminder job failed:', error);
         // Don't crash the server
       }
     });
   }
   ```

3. Comprehensive Tests
   ```typescript
   // backend/tests/integration/scheduler.test.ts
   
   import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
   
   describe('SchedulerService', () => {
     let schedulerService: SchedulerService;
     let testBusiness: Business;
     
     beforeAll(async () => {
       // Setup test DB
       await setupTestDatabase();
       schedulerService = new SchedulerService();
       testBusiness = await createTestBusiness();
     });
     
     it('should return available slots for a given date', async () => {
       const slots = await schedulerService.getAvailableSlots(
         testBusiness.id,
         new Date('2024-06-09'),
         'service-uuid'
       );
       
       expect(slots).toHaveLength(12); // 9 AM - 6 PM, 45-min slots
       expect(slots[0]).toEqual(new Date('2024-06-09T09:00:00Z'));
     });
     
     it('should exclude occupied slots', async () => {
       // Create an appointment at 2 PM
       await createTestAppointment(testBusiness.id, '2024-06-09T14:00:00Z');
       
       const slots = await schedulerService.getAvailableSlots(
         testBusiness.id,
         new Date('2024-06-09'),
         'service-uuid'
       );
       
       expect(slots).not.toContainEqual(new Date('2024-06-09T14:00:00Z'));
     });
     
     it('should handle concurrent booking attempts', async () => {
       // Simulate 2 concurrent requests for same slot
       const promises = [
         schedulerService.confirmAppointment(
           testBusiness.id,
           new Date('2024-06-09T15:00:00Z'),
           'customer-1',
           'service-uuid'
         ),
         schedulerService.confirmAppointment(
           testBusiness.id,
           new Date('2024-06-09T15:00:00Z'),
           'customer-2',
           'service-uuid'
         )
       ];
       
       const results = await Promise.allSettled(promises);
       
       // One should succeed, one should fail
       const successes = results.filter(r => r.status === 'fulfilled');
       const failures = results.filter(r => r.status === 'rejected');
       
       expect(successes).toHaveLength(1);
       expect(failures).toHaveLength(1);
     });
     
     afterAll(async () => {
       await cleanupTestDatabase();
     });
   });
   ```

**Deliverable:** Reminders sent 24h before appointments, concurrent booking prevents double-bookings

---

#### ✅ Week 4: Dashboard Frontend & Polish

**Goals:**
- [ ] React dashboard fully functional
- [ ] Login/logout working
- [ ] CRUD operations for appointments/customers
- [ ] Responsive design on tablet
- [ ] All error handling

**Tasks:**
1. React Components Structure
   ```typescript
   // frontend/src/pages/Appointments.tsx
   
   import { useQuery, useMutation } from '@tanstack/react-query';
   import { useAuth } from '../hooks/useAuth';
   import { useApi } from '../hooks/useApi';
   
   export function AppointmentsPage() {
     const { user } = useAuth();
     const api = useApi();
     
     // Fetch appointments
     const { data: appointments, isLoading } = useQuery({
       queryKey: ['appointments', user?.businessId],
       queryFn: () => api.get(`/appointments?business_id=${user?.businessId}`),
       refetchInterval: 30000 // Refresh every 30s
     });
     
     // Confirm appointment mutation
     const confirmMutation = useMutation({
       mutationFn: (id: string) => api.patch(`/appointments/${id}`, { status: 'confirmed' }),
       onSuccess: () => {
         // Invalidate query to refetch
         queryClient.invalidateQueries(['appointments']);
       }
     });
     
     if (isLoading) return <div>Loading...</div>;
     
     return (
       <div className="container mx-auto p-4">
         <h1 className="text-2xl font-bold mb-4">Citas</h1>
         
         <table className="w-full border">
           <thead>
             <tr className="bg-gray-100">
               <th className="p-2">Cliente</th>
               <th className="p-2">Servicio</th>
               <th className="p-2">Hora</th>
               <th className="p-2">Estado</th>
               <th className="p-2">Acciones</th>
             </tr>
           </thead>
           <tbody>
             {appointments?.map(appt => (
               <tr key={appt.id} className="border-t">
                 <td className="p-2">{appt.customer.name}</td>
                 <td className="p-2">{appt.service.name}</td>
                 <td className="p-2">{formatTime(appt.scheduled_at)}</td>
                 <td className="p-2">
                   <span className={`badge badge-${appt.status}`}>
                     {appt.status}
                   </span>
                 </td>
                 <td className="p-2">
                   <button
                     onClick={() => confirmMutation.mutate(appt.id)}
                     disabled={appt.status === 'confirmed'}
                   >
                     Confirmar
                   </button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     );
   }
   ```

2. Authentication Context
   ```typescript
   // frontend/src/hooks/useAuth.ts
   
   import { useContext, useCallback } from 'react';
   import { AuthContext } from '../contexts/AuthContext';
   
   export function useAuth() {
     const context = useContext(AuthContext);
     
     const login = useCallback(async (email: string, password: string) => {
       const response = await fetch('/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, password })
       });
       
       if (!response.ok) throw new Error('Login failed');
       
       const { token, refreshToken } = await response.json();
       localStorage.setItem('token', token);
       localStorage.setItem('refreshToken', refreshToken);
       context.setUser(/* decode token */);
     }, []);
     
     return { ...context, login };
   }
   ```

3. Error Boundaries
   ```typescript
   // frontend/src/components/ErrorBoundary.tsx
   
   export class ErrorBoundary extends React.Component {
     state = { hasError: false, error: null };
     
     static getDerivedStateFromError(error) {
       return { hasError: true, error };
     }
     
     render() {
       if (this.state.hasError) {
         return (
           <div className="p-4 bg-red-100 text-red-800 rounded">
             <h1>Algo salió mal</h1>
             <p>{this.state.error?.message}</p>
             <button onClick={() => window.location.reload()}>
               Recargar
             </button>
           </div>
         );
       }
       return this.props.children;
     }
   }
   ```

**Deliverable:** Full dashboard working, can view/create/confirm appointments via UI

---

### SPRINT 3: Semana 5-8 (MVP ROBUSTO)

**Focus:** Stabilize, Instagram integration, automated testing, performance

- [ ] Instagram DM webhook integration (copy WhatsApp pattern)
- [ ] Automated reminders tested
- [ ] Load test (artillery): 1000 requests/min
- [ ] Database optimization (indexes)
- [ ] Security audit (manual)
- [ ] Sentry + error logging
- [ ] Deploy to production (DigitalOcean)

**Estimated Hours:** 80-100 hours total

---

### SPRINT 4: Semana 9-12 (POST-MVP)

**Focus:** Advanced features, scaling readiness, mobile app foundation

- [ ] Facebook Messenger integration
- [ ] NLU service (intent classification)
- [ ] Custom rules engine
- [ ] SMS notifications (Twilio)
- [ ] Team management
- [ ] API webhooks for 3rd party integration
- [ ] React Native app (start)

**Estimated Hours:** 100-120 hours total

---

## 🏗️ STACK ESPECÍFICO - COMANDOS DE SETUP

```bash
# Backend dependencies
npm install fastify \
  @fastify/cors \
  @fastify/jwt \
  @fastify/helmet \
  pg \
  redis \
  bcrypt \
  jsonwebtoken \
  bull \
  dotenv \
  zod \
  node-cron

# Development dependencies
npm install -D typescript \
  @types/node \
  @types/bcrypt \
  ts-node \
  ts-node-dev \
  jest \
  @jest/globals \
  ts-jest \
  @types/jest \
  prettier \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser

# Frontend dependencies
npm install react-router-dom \
  axios \
  @tanstack/react-query \
  zod \
  react-hook-form \
  zustand

npm install -D tailwindcss \
  postcss \
  autoprefixer \
  @types/react \
  vitest
```

---

## 🧪 TESTING STRATEGY

### Unit Tests (Jest)
```bash
npm run test:unit

# Coverage target: 70%+ of business logic
npm run test:coverage
```

### Integration Tests
```bash
npm run test:integration

# Uses separate test database (test_claude_saas)
# Cleans up after each test
```

### Load Testing (Artillery)
```bash
# Install
npm install -D artillery

# Config: artillery.yml
# Run: artillery run artillery.yml

# Target: 1000 req/min sustained
# P95 latency: < 500ms
```

### Security Testing
```bash
# npm audit (automated on commit)
npm audit fix

# Snyk
npx snyk test

# OWASP Dependency Check
npm install -D @owasp/dependency-check
```

---

## 🔑 DEPLOYMENT CHECKLIST (Pre-Production)

**Infrastructure:**
- [ ] DigitalOcean account created
- [ ] PostgreSQL managed database configured
- [ ] Redis managed instance configured
- [ ] App Platform project created
- [ ] GitHub integration connected

**Code:**
- [ ] All tests passing
- [ ] No console.log statements (use logger)
- [ ] Environment variables set in DigitalOcean
- [ ] SSL certificate deployed
- [ ] Database migrations run

**Secrets:**
- [ ] JWT_SECRET rotated (32+ chars)
- [ ] Database password strong
- [ ] WhatsApp tokens securely stored
- [ ] API keys not in code

**Monitoring:**
- [ ] Sentry project created
- [ ] CloudFlare DNS configured
- [ ] Health check endpoint working
- [ ] Uptime monitoring enabled
- [ ] Error alerts to Slack

**Backup:**
- [ ] PostgreSQL backups automated (2x daily)
- [ ] Point-in-time recovery tested
- [ ] Disaster recovery plan documented

---

## 📊 SUCCESS METRICS (By Week)

| Week | Target | Metric |
|------|--------|--------|
| 1 | Infrastructure | Docker-compose ✅, DB schema ✅, Auth ✅ |
| 2 | APIs | REST endpoints ✅, WhatsApp webhook ✅ |
| 3 | Features | Scheduler ✅, Reminders ✅, Tests ✅ |
| 4 | Dashboard | Frontend ✅, CRUD ✅, Deploy ✅ |
| 5-8 | Stability | Instagram ✅, Load tests ✅, Security ✅ |
| 9-12 | Scale | Advanced features, Mobile app, Monetization |

---

## 🚨 COMMON PITFALLS & HOW TO AVOID THEM

| Pitfall | Risk | Prevention |
|---------|------|-----------|
| Webhook timeouts | Message loss | Don't block webhook response, use queue |
| Rate limit exceeded | Broken integrations | Queue with backoff, check daily limits |
| Concurrent bookings | Overbooking | Use pessimistic locking (FOR UPDATE) |
| Multi-tenant data leak | Security breach | Test RLS policies, code review |
| Database connection pool exhaustion | 503 errors | Monitor connections, use PgBouncer |
| Missing error logs | Debugging hard | Log all errors to Sentry |
| No backup test | Data loss | Test restore monthly |

---

## 📞 SUPPORT & ESCALATION

- **CTO Review:** Every Sprint end
- **Architecture changes:** Discuss with founder + CTO
- **Security issues:** Immediate escalation
- **Production outages:** Page on-call (Slack #alerts)
- **Dependencies:** Update process weekly

---

**Next Action:** Run `docker-compose up -d` and start Week 1 tasks!
