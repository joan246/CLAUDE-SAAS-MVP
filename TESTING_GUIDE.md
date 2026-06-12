# 🧪 GUÍA DE TESTING - MVP FUNCIONAL

## ⚡ Opción 1: Testing Sin Docker (Más Rápido)

### Requisitos
- Node.js 20+ instalado
- PostgreSQL 16+ corriendo localmente
- OpenAI API Key

### Paso 1: Preparar Backend

```bash
# Ir al directorio backend
cd backend

# Instalar dependencias
npm install

# Crear archivo .env
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/citas_db"
JWT_SECRET="test-secret-key-min-32-characters-long-very-secret"
JWT_EXPIRATION="24h"
WHATSAPP_PHONE_NUMBER_ID="123456789"
WHATSAPP_ACCESS_TOKEN="dummy-token"
WHATSAPP_VERIFY_TOKEN="verify-token-test"
OPENAI_API_KEY="sk-your-actual-key-here"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
EOF

# Ejecutar migraciones
npx prisma db push

# Cargar datos de prueba
npm run db:seed

# Iniciar backend
npm run dev
```

**Backend corriendo en**: http://localhost:3001

### Paso 2: Preparar Frontend

```bash
# En otra terminal, ir a frontend
cd frontend

# Instalar dependencias
npm install

# Crear .env
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env

# Iniciar frontend
npm run dev
```

**Frontend corriendo en**: http://localhost:3000

---

## ⚡ Opción 2: Testing Con Docker (Automático)

### Requisitos
- Docker Desktop instalado ([descargar](https://www.docker.com/products/docker-desktop))
- OpenAI API Key

### Paso 1: Configurar .env

```bash
# En backend/
cat > backend/.env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/citas_db"
JWT_SECRET="test-secret-key-min-32-characters-long-very-secret"
JWT_EXPIRATION="24h"
WHATSAPP_PHONE_NUMBER_ID="123456789"
WHATSAPP_ACCESS_TOKEN="dummy-token"
WHATSAPP_VERIFY_TOKEN="verify-token-test"
OPENAI_API_KEY="sk-your-actual-key-here"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
EOF

# En frontend/
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > frontend/.env
```

### Paso 2: Iniciar Todo

```bash
# Desde la raíz del proyecto
docker-compose up -d

# Esperar 30 segundos para que postgres inicie
sleep 30

# Ejecutar migraciones
docker-compose exec backend npx prisma db push

# Cargar datos de prueba
docker-compose exec backend npm run db:seed

# Ver logs (verificar que está funcionando)
docker-compose logs -f
```

### Paso 3: Acceder

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432

---

## 🔐 Login Inicial

```
Email: test@example.com
Contraseña: password123
```

---

## 🧪 TESTING DE FUNCIONALIDADES

### 1️⃣ TEST: Login Funcionando

1. Abre http://localhost:3000
2. Haz clic en "Iniciar Sesión"
3. Ingresa:
   - Email: `test@example.com`
   - Contraseña: `password123`
4. ✅ Deberías ver el Dashboard

**Resultado esperado**: Dashboard carga con "Citas de Hoy" y "Próximas Citas"

---

### 2️⃣ TEST: Dashboard Muestra Citas

En el dashboard deberías ver:

```
📅 Citas de Hoy (1)
├─ Juan García
└─ [Hora de la cita de prueba]

📅 Próximas Citas (0)
└─ No hay citas próximas
```

**Comando para verificar en API**:
```bash
# Terminal nueva
BACKEND_URL="http://localhost:3001"
TOKEN="obtén-del-login-o-usa-este-para-testing"

# Login directo
curl -X POST $BACKEND_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123"
  }'

# Respuesta incluirá: access_token
```

---

### 3️⃣ TEST: API Endpoints

#### Obtener Token

```bash
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')

TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo $TOKEN
```

#### Listar Citas

```bash
TOKEN="tu-token-aqui"

curl http://localhost:3001/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Respuesta esperada**:
```json
[
  {
    "id": "...",
    "customer": { "name": "Juan García" },
    "startTime": "2024-12-20T10:00:00Z",
    "status": "CONFIRMED"
  }
]
```

#### Obtener Citas de Hoy

```bash
TOKEN="tu-token-aqui"

curl http://localhost:3001/appointments/today \
  -H "Authorization: Bearer $TOKEN"
```

#### Obtener Próximas Citas

```bash
TOKEN="tu-token-aqui"

curl http://localhost:3001/appointments/upcoming \
  -H "Authorization: Bearer $TOKEN"
```

#### Listar Clientes

```bash
TOKEN="tu-token-aqui"

curl http://localhost:3001/customers \
  -H "Authorization: Bearer $TOKEN"
```

#### Obtener Configuración

```bash
TOKEN="tu-token-aqui"

curl http://localhost:3001/config \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada**:
```json
{
  "id": "...",
  "startTime": "08:00",
  "endTime": "18:00",
  "appointmentDuration": 90,
  "separationTime": 15
}
```

#### Actualizar Configuración

```bash
TOKEN="tu-token-aqui"

curl -X PATCH http://localhost:3001/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "09:00",
    "endTime": "17:00",
    "appointmentDuration": 60,
    "separationTime": 10
  }'
```

---

### 4️⃣ TEST: Crear Cliente

```bash
TOKEN="tu-token-aqui"

curl -X POST http://localhost:3001/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "María Rodríguez",
    "phone": "+34612345678",
    "email": "maria@example.com"
  }'
```

**Respuesta esperada**: Objeto customer creado

---

### 5️⃣ TEST: Crear Cita

```bash
TOKEN="tu-token-aqui"
CUSTOMER_ID="obtén-del-paso-anterior"

# Primero, obtener slots disponibles
curl "http://localhost:3001/appointments/available-slots?date=2024-12-21" \
  -H "Authorization: Bearer $TOKEN"

# Luego crear cita
curl -X POST http://localhost:3001/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"startTime\": \"2024-12-21T14:00:00Z\",
    \"notes\": \"Test de prueba\"
  }"
```

---

### 6️⃣ TEST: Verificar Base de Datos

```bash
# Acceder a PostgreSQL
docker-compose exec postgres psql -U postgres -d citas_db

# Una vez dentro:
\dt                          # Ver todas las tablas
SELECT * FROM users;         # Ver usuarios
SELECT * FROM customers;     # Ver clientes
SELECT * FROM appointments;  # Ver citas
SELECT * FROM configs;       # Ver configuración

\q                           # Salir
```

---

### 7️⃣ TEST: Registrar Nuevo Usuario

1. En http://localhost:3000, haz clic en "¿No tienes cuenta? Regístrate aquí"
2. Completa:
   - Nombre: `Mi Negocio`
   - Email: `mynegocio@example.com`
   - Contraseña: `contraseña123`
3. Haz clic en "Crear Cuenta"
4. ✅ Deberías ser redirigido a Dashboard

---

### 8️⃣ TEST: WhatsApp Webhook (Simulado)

```bash
# Verificar webhook
curl "http://localhost:3001/whatsapp/webhook?hub.verify_token=verify-token-test&hub.challenge=test123"

# Respuesta esperada: test123
```

---

### 9️⃣ TEST: Enviar Recordatorios

```bash
TOKEN="tu-token-aqui"

# Disparar envío de recordatorios
curl -X POST http://localhost:3001/whatsapp/send-reminders \
  -H "Authorization: Bearer $TOKEN"

# Respuesta esperada: { "message": "Reminders processed" }
```

---

## 🔧 Comandos Útiles para Debugging

### Ver logs en tiempo real

```bash
# Backend
docker-compose logs -f backend

# Frontend
docker-compose logs -f frontend

# PostgreSQL
docker-compose logs -f postgres
```

### Reiniciar servicios

```bash
# Reiniciar todo
docker-compose restart

# Reiniciar solo backend
docker-compose restart backend

# Reiniciar solo frontend
docker-compose restart frontend
```

### Ver estado de containers

```bash
docker-compose ps
```

### Resetear base de datos (⚠️ borra todo)

```bash
docker-compose down -v
docker-compose up -d
sleep 30
docker-compose exec backend npx prisma db push
docker-compose exec backend npm run db:seed
```

### Acceder a Prisma Studio (GUI visual)

```bash
docker-compose exec backend npx prisma studio
```

Luego abre: http://localhost:5555

---

## 📊 TESTING CHECKLIST

Marca cada item mientras lo pruebes:

- [ ] Frontend carga en http://localhost:3000
- [ ] Puedo hacer login con test@example.com
- [ ] Dashboard muestra citas de hoy
- [ ] Dashboard muestra próximas citas
- [ ] Puedo registrarme con nuevo email
- [ ] API /appointments/today retorna datos
- [ ] API /customers retorna clientes
- [ ] API /config retorna configuración
- [ ] Puedo crear nuevo cliente (POST)
- [ ] Puedo actualizar configuración (PATCH)
- [ ] Database tiene datos en las tablas
- [ ] Logs del backend no muestran errores

---

## 🐛 Troubleshooting Rápido

### "Cannot connect to database"
```bash
# Verificar que postgres está corriendo
docker-compose ps

# Ver logs de postgres
docker-compose logs postgres

# Reiniciar
docker-compose restart postgres
sleep 10
```

### "Port 3000 already in use"
```bash
# Cambiar puerto en docker-compose.yml
# Buscar "3000:3000" y cambiar a "3001:3000" (primer número es tu puerto local)
# O matar proceso usando puerto 3000:
lsof -i :3000
kill -9 <PID>
```

### "401 Unauthorized" en API
```bash
# Asegúrate de:
# 1. Token es válido (acaba de hacer login)
# 2. Header correcto: "Authorization: Bearer TOKEN"
# 3. Token tiene Bearer al inicio
```

### "ECONNREFUSED" en frontend
```bash
# Frontend no puede conectar a backend
# Verificar:
# 1. Backend está corriendo: http://localhost:3001
# 2. NEXT_PUBLIC_API_URL en frontend/.env es correcto
# 3. Reiniciar frontend: docker-compose restart frontend
```

---

## 📱 Testing Completo (15 minutos)

1. **Inicio** (2 min)
   - `docker-compose up -d`
   - Esperar 30 segundos
   - Migraciones: `npx prisma db push`
   - Seed: `npm run db:seed`

2. **Frontend** (3 min)
   - Abre http://localhost:3000
   - Login → Ves Dashboard ✅
   - Clic en Register → Crea cuenta ✅
   - Logout → Ves home ✅

3. **API** (5 min)
   - Login vía curl → Obtienes token ✅
   - GET /appointments → Ves citas ✅
   - GET /customers → Ves clientes ✅
   - POST /customers → Creas cliente ✅
   - PATCH /config → Actualizas horarios ✅

4. **Database** (3 min)
   - `psql -c "SELECT * FROM users;"`
   - `psql -c "SELECT * FROM appointments;"`
   - `psql -c "SELECT * FROM customers;"`

5. **Logs** (2 min)
   - `docker-compose logs backend` → Sin errores ✅
   - `docker-compose logs frontend` → Sin errores ✅

---

## ✅ CONCLUSIÓN

Si completaste todos los tests, **el MVP está 100% funcional** ✅

El sistema:
- ✅ Autentica usuarios
- ✅ Maneja citas
- ✅ Gestiona clientes
- ✅ Almacena en base de datos
- ✅ Tiene API completa
- ✅ Frontend responsivo

**¡Listo para seguir desarrollando!** 🚀

---

## 📞 Dudas?

Si algo no funciona:
1. Ver logs: `docker-compose logs SERVICE_NAME`
2. Verificar .env está correcto
3. Reiniciar: `docker-compose restart`
4. Reset total: `docker-compose down -v && docker-compose up -d`

¡Buena suerte! 🎉
