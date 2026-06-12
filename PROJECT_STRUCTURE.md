# Estructura del Proyecto

## Vista General

```
claude-saas-mvp/
├── backend/                    # API NestJS
├── frontend/                   # Web App Next.js
├── docker-compose.yml          # Orquestación
├── README.md                   # Documentación
├── QUICK_START.md             # Inicio rápido
└── PROJECT_STRUCTURE.md       # Este archivo
```

## Backend (NestJS)

```
backend/
├── src/
│   ├── main.ts                      # Entry point
│   ├── app.module.ts                # Root module
│   │
│   ├── modules/
│   │   ├── auth/                    # Autenticación
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts      # Lógica login/register
│   │   │   ├── auth.controller.ts   # Endpoints
│   │   │   ├── dtos/
│   │   │   │   ├── register.dto.ts
│   │   │   │   └── login.dto.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts  # JWT validation
│   │   │   └── guards/
│   │   │       └── jwt-auth.guard.ts
│   │   │
│   │   ├── appointments/            # Gestión de citas
│   │   │   ├── appointments.module.ts
│   │   │   ├── appointments.service.ts  # Lógica principal
│   │   │   ├── appointments.controller.ts
│   │   │   └── dtos/
│   │   │       ├── create-appointment.dto.ts
│   │   │       └── update-appointment.dto.ts
│   │   │
│   │   ├── customers/               # Gestión de clientes
│   │   │   ├── customers.module.ts
│   │   │   ├── customers.service.ts
│   │   │   ├── customers.controller.ts
│   │   │   └── dtos/
│   │   │       ├── create-customer.dto.ts
│   │   │       └── update-customer.dto.ts
│   │   │
│   │   ├── whatsapp/                # Integración WhatsApp + IA
│   │   │   ├── whatsapp.module.ts
│   │   │   ├── whatsapp.service.ts  # Webhook handling
│   │   │   ├── whatsapp.controller.ts
│   │   │   └── openai.service.ts    # IA integration
│   │   │
│   │   └── config/                  # Configuración
│   │       ├── config.module.ts
│   │       ├── config.service.ts
│   │       ├── config.controller.ts
│   │       └── dtos/
│   │           └── update-config.dto.ts
│   │
│   └── prisma/                      # ORM Prisma
│       ├── prisma.module.ts
│       └── prisma.service.ts
│
├── prisma/
│   ├── schema.prisma                # Esquema DB (Usuarios, Citas, etc)
│   ├── seed.ts                      # Datos iniciales
│   └── migrations/                  # Historial de cambios BD
│
├── test/
│   └── jest-e2e.json
│
├── package.json                      # Dependencias
├── tsconfig.json                     # Configuración TS
├── .env.example                      # Variables plantilla
└── Dockerfile                        # Containerización
```

## Frontend (Next.js)

```
frontend/
├── app/
│   ├── globals.css                  # Estilos globales
│   ├── layout.tsx                   # Root layout
│   │
│   ├── page.tsx                     # Home (/)
│   │
│   ├── login/
│   │   └── page.tsx                 # Login (/login)
│   │
│   ├── register/
│   │   └── page.tsx                 # Registro (/register)
│   │
│   ├── dashboard/
│   │   └── page.tsx                 # Dashboard principal (/dashboard)
│   │
│   ├── appointments/                # (Estructura para implementar)
│   │   └── page.tsx
│   │
│   ├── customers/                   # (Estructura para implementar)
│   │   └── page.tsx
│   │
│   └── settings/                    # (Estructura para implementar)
│       └── page.tsx
│
├── components/
│   ├── ui/                          # Componentes base
│   │   ├── button.tsx               # Button reutilizable
│   │   └── input.tsx                # Input reutilizable
│   │
│   └── layouts/
│       └── dashboard-layout.tsx     # Layout con sidebar
│
├── lib/
│   ├── api-client.ts                # Axios + interceptores
│   ├── utils.ts                     # Utilidades (cn, etc)
│   │
│   └── store/
│       └── auth-store.ts            # Zustand auth store
│
├── package.json                      # Dependencias
├── tsconfig.json                     # Configuración TS
├── next.config.js                    # Config Next.js
├── tailwind.config.ts                # Tailwind CSS config
├── postcss.config.js                 # PostCSS config
├── .env.example                      # Variables plantilla
└── Dockerfile                        # Containerización
```

## Base de Datos (PostgreSQL)

### Tablas Principales

```
users
├── id (UUID primary key)
├── email (unique)
├── password (hashed)
├── name
└── timestamps

customers
├── id (UUID)
├── name
├── phone (unique)
├── email
└── timestamps

appointments
├── id (UUID)
├── userId (FK → users)
├── customerId (FK → customers)
├── startTime (datetime)
├── endTime (datetime)
├── status (PENDING/CONFIRMED/CANCELLED/COMPLETED)
├── notes
└── timestamps

config
├── id (UUID)
├── userId (unique FK → users)
├── startTime (HH:mm)
├── endTime (HH:mm)
├── appointmentDuration (minutes)
├── separationTime (minutes)
└── timestamps

reminders
├── id (UUID)
├── appointmentId (FK → appointments)
├── hoursBeforeAppointment
├── sent (boolean)
├── sentAt (timestamp)
└── timestamps

whatsapp_messages
├── id (UUID)
├── phoneNumber
├── message (text)
├── direction (incoming/outgoing)
└── createdAt

conversation_states
├── id (UUID)
├── phoneNumber (unique)
├── state (greeting/selecting_service/etc)
├── context (JSON)
└── timestamps
```

## Flujo de Datos

### 1. Autenticación
```
Cliente → Login Form
    ↓
Frontend → POST /auth/login
    ↓
Backend (AuthService) → Validar contraseña
    ↓
JWT generado
    ↓
Frontend almacena token en localStorage
    ↓
Requests incluyen: Authorization: Bearer token
```

### 2. Agendamiento de Cita
```
WhatsApp → Webhook
    ↓
Backend (WhatsAppController) → Verifica firma
    ↓
OpenAiService → Analiza mensaje
    ↓
AppointmentsService → Busca slots disponibles
    ↓
AppointmentService → Crea cita en BD
    ↓
ReminderService → Crea reminders (24h, 2h)
    ↓
WhatsAppService → Envía confirmación
    ↓
Message guardado en whatsapp_messages
```

### 3. Dashboard
```
Frontend carga
    ↓
useAuthStore → Verifica token
    ↓
Si no hay token → Redirect a /login
    ↓
Si hay token → Fetch /appointments/today + /upcoming
    ↓
AppointmentsService retorna datos
    ↓
Frontend renderiza cards con citas
```

## Puntos Clave de Arquitectura

### Seguridad
- ✅ JWT RS256
- ✅ Bcrypt password hashing
- ✅ CORS configurado
- ✅ Validation en DTOs
- ✅ Guards en endpoints protegidos

### Base de Datos
- ✅ Prisma ORM (type-safe)
- ✅ Migrations automáticas
- ✅ Constraints en datos
- ✅ Índices en búsquedas frecuentes

### Frontend
- ✅ Server-side rendering (Next.js)
- ✅ Tailwind CSS (utility-first)
- ✅ Client-side state (Zustand)
- ✅ API client centralizado (axios)

### Backend
- ✅ Modular (NestJS)
- ✅ Service-based architecture
- ✅ DTOs para validación
- ✅ Guards y Middleware

## Próximas Páginas a Implementar

1. `/appointments` - Calendar view de citas
2. `/customers` - Lista y gestión de clientes
3. `/settings` - Configurar horarios y duración
4. `/appointments/[id]` - Detalle de cita
5. `/customers/[id]` - Perfil de cliente

## Variables de Entorno Requeridas

### Backend (.env)
```
DATABASE_URL
JWT_SECRET
JWT_EXPIRATION
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN
WHATSAPP_VERIFY_TOKEN
OPENAI_API_KEY
NODE_ENV
PORT
FRONTEND_URL
```

### Frontend (.env)
```
NEXT_PUBLIC_API_URL
```

## Comandos de Desarrollo

```bash
# Backend
npm run dev              # Desarrollo con hot reload
npm run build            # Compilar para producción
npm run lint             # ESLint
npm run test             # Jest
npm run db:push          # Sync schema con BD
npm run db:migrate       # Migraciones Prisma
npm run db:studio        # Prisma Studio (GUI)
npm run db:seed          # Seed datos iniciales

# Frontend
npm run dev              # Desarrollo en http://localhost:3000
npm run build            # Build Next.js
npm run start            # Producción
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

## Dependencias Clave

### Backend
- `@nestjs/*` - Framework
- `@prisma/client` - ORM
- `jsonwebtoken` - JWT
- `bcrypt` - Password hashing
- `openai` - IA (Claude/GPT)
- `axios` - HTTP client

### Frontend
- `next` - Framework web
- `react` - UI library
- `tailwindcss` - Styling
- `zustand` - State management
- `axios` - HTTP client
- `react-hook-form` - Form handling
- `react-hot-toast` - Notifications

---

**Estructura lista para desarrollo y escalamiento** ✅
