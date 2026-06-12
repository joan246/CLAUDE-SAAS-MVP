# ⚡ Quick Start - Ejecución Inmediata

## Requisitos Mínimos

- Docker Desktop instalado ([descargar](https://www.docker.com/products/docker-desktop))
- OpenAI API Key ([obtener aquí](https://platform.openai.com/api-keys))
- WhatsApp Business Account (opcional, para WhatsApp real)

## Paso 1: Preparar Archivos de Configuración

### Backend .env
Edita `backend/.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/citas_db"
JWT_SECRET="your-super-secret-key-min-32-chars-very-secret"
JWT_EXPIRATION="24h"
WHATSAPP_PHONE_NUMBER_ID="0"  # Cambiar cuando tengas credenciales reales
WHATSAPP_ACCESS_TOKEN="dummy"  # Cambiar cuando tengas credenciales reales
WHATSAPP_VERIFY_TOKEN="verify-token-secret"
OPENAI_API_KEY="sk-your-actual-key-here"  # REQUERIDO
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### Frontend .env
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Paso 2: Iniciar los Servicios

```bash
# Desde la raíz del proyecto
docker-compose up -d

# Esperar 30 segundos para que postgres inicie
sleep 30

# Ejecutar migraciones
docker-compose exec backend npx prisma db push

# Seed con datos de prueba
docker-compose exec backend npm run db:seed
```

## Paso 3: Acceder a la Aplicación

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Usuarios de Prueba**:
  - Email: `test@example.com`
  - Password: `password123`

## 🎯 Funcionalidades Listas para Probar

### 1. Autenticación
```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Crear Cita
```bash
TOKEN="your-token-from-login"

# Primero, obtener un cliente
curl http://localhost:3001/customers \
  -H "Authorization: Bearer $TOKEN"

# Crear cita
curl -X POST http://localhost:3001/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId":"customer-id-from-above",
    "startTime":"2024-12-20T10:00:00Z"
  }'
```

### 3. Ver Citas
```bash
TOKEN="your-token"

# Citas de hoy
curl http://localhost:3001/appointments/today \
  -H "Authorization: Bearer $TOKEN"

# Próximas citas
curl http://localhost:3001/appointments/upcoming \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Verificar Webhook de WhatsApp
```bash
# Simular webhook (primero verifica en navegador)
curl "http://localhost:3001/whatsapp/webhook?hub.verify_token=verify-token-secret&hub.challenge=test_challenge"
```

## 🔧 Comandos Útiles

### Ver logs en tiempo real
```bash
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f frontend
```

### Acceder a PostgreSQL directamente
```bash
docker-compose exec postgres psql -U postgres -d citas_db
```

### Resetear base de datos (⚠️ borra todo)
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend npx prisma db push
docker-compose exec backend npm run db:seed
```

### Ver estructura de base de datos
```bash
docker-compose exec backend npx prisma studio
```

Luego abre: http://localhost:5555

## 📱 Pruebas WhatsApp (Simulado)

Sin WhatsApp real, el sistema aún funciona con datos simulados.

Para pruebas reales con WhatsApp:

1. Ir a [Meta Developers](https://developers.facebook.com)
2. Crear Business Account
3. Configurar WhatsApp Cloud API
4. Obtener credenciales:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - Crear tu propio `WHATSAPP_VERIFY_TOKEN`
5. Actualizar `backend/.env`
6. Reiniciar backend: `docker-compose restart backend`
7. Configurar webhook URL en Meta Developers pointing a tu servidor público

## 🚨 Problemas Comunes

### Error: "Cannot find module"
```bash
# Limpiar e reinstalar
docker-compose down
docker-compose up --build -d
```

### Error: "Port 3000 already in use"
```bash
# Usar puerto diferente en docker-compose.yml
# Cambiar "3000:3000" a "3001:3000" (primer número es puerto local)
```

### PostgreSQL no conecta
```bash
# Ver estado
docker-compose ps

# Si postgres está down, reiniciar
docker-compose restart postgres
sleep 10
docker-compose logs postgres  # ver si hay errores
```

### Frontend conectando a API incorrecta
- Verificar `NEXT_PUBLIC_API_URL` en `frontend/.env`
- Por defecto es `http://localhost:3001`
- Debe ser URL del backend

## 📊 Estructura de Datos

### Base de Datos automáticamente creada con:

- **Users** - Negocios/Usuarios
- **Customers** - Clientes/Contactos
- **Appointments** - Citas agendadas
- **Config** - Configuración de horarios
- **Reminders** - Recordatorios automáticos
- **WhatsAppMessage** - Historial de mensajes
- **ConversationState** - Estado de conversaciones

## ✅ Checklist de Verificación

- [ ] Docker containers corriendo: `docker-compose ps`
- [ ] Backend responde: `curl http://localhost:3001/health` (si existe endpoint)
- [ ] Frontend carga: http://localhost:3000
- [ ] Puedes hacer login con test@example.com
- [ ] Dashboard muestra citas
- [ ] Base de datos tiene datos de prueba

## 🎓 Próximos Pasos

1. **Explorar API**: Ver endpoints en `README.md`
2. **Conectar WhatsApp Real**: Obtener credenciales de Meta
3. **Configurar OpenAI**: Usar tu API Key
4. **Agregar Estilos**: Personalizar dashboard
5. **Implementar Notificaciones**: Email/SMS reales

## 📞 Support

Si algo falla:
1. Ver logs: `docker-compose logs service-name`
2. Verificar .env está correctamente configurado
3. Reiniciar: `docker-compose restart`
4. Reset nuclear: `docker-compose down -v && docker-compose up --build -d`

---

**¡El MVP está listo para desarrollo!** 🚀
