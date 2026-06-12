# Gestor de Citas - Sistema de Automatización con WhatsApp e IA

MVP funcional para automatizar la gestión de citas y atención al cliente a través de WhatsApp con inteligencia artificial.

## 🚀 Características

- **WhatsApp Integration**: Integración con WhatsApp Cloud API
- **IA Inteligente**: Análisis de mensajes y respuestas automáticas con OpenAI
- **Gestión de Citas**: Sistema completo de agendamiento y confirmación
- **Recordatorios**: Envío automático de recordatorios 24h y 2h antes
- **Panel Administrativo**: Dashboard web para gestionar citas y clientes
- **Configuración Flexible**: Horarios, duración de citas y tiempos de separación

## 📋 Requisitos Previos

- Docker y Docker Compose
- Node.js 20+ (opcional, si quieres ejecutar sin Docker)
- PostgreSQL 16+ (opcional, si no usas Docker)
- OpenAI API Key
- WhatsApp Business Account con acceso a Cloud API

## 🔧 Configuración Inicial

### 1. Clonar el Repositorio

```bash
git clone <repo-url>
cd claude-saas-mvp
```

### 2. Configurar Variables de Entorno

#### Backend
```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` con tus valores:
```
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/citas_db"
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRATION="24h"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
WHATSAPP_ACCESS_TOKEN="your-access-token"
WHATSAPP_VERIFY_TOKEN="your-verify-token"
OPENAI_API_KEY="your-openai-api-key"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

#### Frontend
```bash
cp frontend/.env.example frontend/.env
```

El contenido puede quedarse como está para desarrollo local.

### 3. Ejecutar con Docker Compose

```bash
docker-compose up -d
```

Esto iniciará:
- Backend (NestJS) en http://localhost:3001
- Frontend (Next.js) en http://localhost:3000
- PostgreSQL en localhost:5432

### 4. Inicializar la Base de Datos

```bash
# Ejecutar migraciones de Prisma
docker-compose exec backend npx prisma db push

# (Opcional) Seed con datos de prueba
docker-compose exec backend npm run db:seed
```

## 📱 Integración con WhatsApp

### 1. Obtener Credenciales

1. Ir a [Meta Developers](https://developers.facebook.com/)
2. Crear una app y configurar WhatsApp Business Platform
3. Obtener:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_VERIFY_TOKEN` (crear tu propio token único)

### 2. Configurar Webhook

En Meta Developers, configurar el webhook:
- **URL**: `https://your-domain.com/whatsapp/webhook`
- **Verify Token**: El mismo que configuraste en `.env`
- **Subscribe Fields**: `messages`

## 🔐 Credenciales de Prueba

Después de ejecutar el seed, puedes usar:
- **Email**: `test@example.com`
- **Contraseña**: `password123`

## 📚 Endpoints API

### Autenticación
- `POST /auth/register` - Crear cuenta
- `POST /auth/login` - Iniciar sesión
- `GET /auth/me` - Obtener usuario actual

### Citas
- `GET /appointments` - Listar todas las citas
- `GET /appointments/today` - Citas de hoy
- `GET /appointments/upcoming` - Próximas 7 días
- `GET /appointments/available-slots?date=2024-01-15` - Slots disponibles
- `POST /appointments` - Crear cita
- `PATCH /appointments/:id` - Actualizar cita
- `DELETE /appointments/:id` - Cancelar cita

### Clientes
- `GET /customers` - Listar clientes
- `POST /customers` - Crear cliente
- `GET /customers/:id` - Obtener detalles
- `GET /customers/:id/history` - Historial de citas
- `PATCH /customers/:id` - Actualizar cliente
- `DELETE /customers/:id` - Eliminar cliente

### Configuración
- `GET /config` - Obtener configuración
- `PATCH /config` - Actualizar configuración

### WhatsApp
- `GET /whatsapp/webhook` - Verificar webhook
- `POST /whatsapp/webhook` - Recibir mensajes
- `POST /whatsapp/send-reminders` - Enviar recordatorios

## 🧪 Pruebas

### Backend
```bash
# Tests unitarios
docker-compose exec backend npm run test

# Tests con coverage
docker-compose exec backend npm run test:cov
```

### Frontend
```bash
# Tests
docker-compose exec frontend npm run test
```

## 📊 Estructura de Carpetas

```
.
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/        # Módulos de negocio
│   │   ├── prisma/         # Servicio Prisma
│   │   └── main.ts         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Esquema DB
│   │   └── seed.ts         # Datos iniciales
│   └── Dockerfile
├── frontend/                # Next.js App
│   ├── app/                # Páginas
│   ├── components/         # Componentes
│   ├── lib/                # Utilities
│   └── Dockerfile
└── docker-compose.yml      # Orquestación
```

## 🔄 Flujo de Conversación WhatsApp

1. Cliente envía mensaje por WhatsApp
2. Sistema recibe webhook y valida firma
3. OpenAI analiza intención del cliente
4. Sistema busca horarios disponibles
5. Presenta opciones al cliente
6. Cliente selecciona horario
7. Cita se crea automáticamente
8. Se envían recordatorios en tiempo programado

## 🚀 Deployment

### Railway (Recomendado para MVP)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Heroku (Deprecated)

### DigitalOcean App Platform

Ver documentación de deployment en la carpeta `/docs`.

## 🐛 Troubleshooting

### Backend no inicia
```bash
# Ver logs
docker-compose logs backend

# Reiniciar
docker-compose restart backend
```

### Error de conexión a BD
```bash
# Verificar que postgres está corriendo
docker-compose ps

# Resetear volumen (⚠️ borra datos)
docker-compose down -v
docker-compose up -d
```

### WhatsApp webhook no recibe mensajes
1. Verificar token en Meta Developers
2. Verificar URL pública (no localhost)
3. Ver logs: `docker-compose logs backend | grep whatsapp`

## 📝 Variables de Entorno Requeridas

```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# JWT
JWT_SECRET=min-32-chars-random-string
JWT_EXPIRATION=24h

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your-id
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_VERIFY_TOKEN=your-token

# OpenAI
OPENAI_API_KEY=sk-xxx

# App
NODE_ENV=development|production
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## 📄 Licencia

MIT

## 👨‍💻 Desarrollo

### Agregar Features

1. Crear rama: `git checkout -b feature/my-feature`
2. Hacer cambios
3. Commit: `git commit -m "feat: description"`
4. Push: `git push origin feature/my-feature`
5. PR a main

### Conventions

- Commits: Conventional Commits
- Naming: camelCase (JS), kebab-case (archivos)
- Types: Usar TypeScript strict

## 🤝 Support

Para soporte, abrir issue en GitHub o contactar al equipo.

---

**Última actualización:** Junio 2024
