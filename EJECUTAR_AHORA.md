# ⚡ EJECUTAR AHORA - 5 MINUTOS

## 🎯 Lo Más Rápido Posible

### Opción A: Con Docker (Recomendado)

```bash
# 1. Configurar variables
cat > backend/.env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/citas_db"
JWT_SECRET="test-secret-key-muy-largo-minimo-32-caracteres"
JWT_EXPIRATION="24h"
WHATSAPP_PHONE_NUMBER_ID="123"
WHATSAPP_ACCESS_TOKEN="dummy"
WHATSAPP_VERIFY_TOKEN="verify"
OPENAI_API_KEY="sk-xxx"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
EOF

echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > frontend/.env

# 2. Iniciar
docker-compose up -d
sleep 30

# 3. Preparar base de datos
docker-compose exec backend npx prisma db push
docker-compose exec backend npm run db:seed

# ✅ LISTO
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Login: test@example.com / password123
```

---

### Opción B: Sin Docker (Más Control)

**Requisitos:**
- Node.js 20+
- PostgreSQL 16 corriendo
- OpenAI API Key

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
# EDITA .env con tus credenciales
npx prisma db push
npm run db:seed
npm run dev
# Corre en http://localhost:3001

# 2. Frontend (terminal nueva)
cd frontend
npm install
cp .env.example .env
npm run dev
# Corre en http://localhost:3000
```

---

## 🔐 Credenciales por Defecto

```
Email: test@example.com
Contraseña: password123
```

---

## ✅ Qué Probar

| Acción | URL |
|--------|-----|
| **Home** | http://localhost:3000 |
| **Login** | http://localhost:3000/login |
| **Dashboard** | http://localhost:3000/dashboard |
| **Register** | http://localhost:3000/register |
| **API** | http://localhost:3001/appointments |

---

## 🧪 Testing API Ultra-Rápido

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Copiar el token de la respuesta y usar en:

# Ver citas
curl http://localhost:3001/appointments \
  -H "Authorization: Bearer TOKEN_AQUI"

# Ver clientes
curl http://localhost:3001/customers \
  -H "Authorization: Bearer TOKEN_AQUI"
```

---

## 🎯 Qué Esperar

✅ Frontend carga sin errores
✅ Login funciona
✅ Dashboard muestra 1 cita de prueba (Juan García)
✅ API responde con datos
✅ Base de datos tiene 2 usuarios, 2 clientes, 1 cita

---

## 🆘 Si Falla

```bash
# Ver logs
docker-compose logs backend

# Reiniciar todo
docker-compose down -v
docker-compose up -d
sleep 30
docker-compose exec backend npx prisma db push
docker-compose exec backend npm run db:seed

# O matar procesos que usan puertos
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
```

---

## 📊 Estructura Creada

```
backend/              ← NestJS (Auth, Citas, Clientes, WhatsApp, IA)
frontend/             ← Next.js (Login, Register, Dashboard)
docker-compose.yml    ← Inicia Postgres + Backend + Frontend
README.md             ← Documentación completa
TESTING_GUIDE.md      ← Guía detallada de testing
```

---

## ⏱️ Timeline

| Paso | Tiempo |
|------|--------|
| Descargar + Setup | 1 min |
| `docker-compose up` | 2 min |
| Migraciones | 1 min |
| Seed datos | 1 min |
| **TOTAL** | **5 min** |

---

## 🚀 ¡AHORA!

```bash
docker-compose up -d && sleep 30 && \
docker-compose exec backend npx prisma db push && \
docker-compose exec backend npm run db:seed && \
echo "✅ LISTO EN http://localhost:3000"
```

---

**¡El MVP está listo para ser probado!** 🎉
