#!/bin/bash

# MVP STARTUP SCRIPT - Ejecuta todo automáticamente

set -e

echo "🚀 Iniciando MVP Gestor de Citas..."
echo ""

# 1. Crear archivos .env
echo "📝 Configurando variables de entorno..."

cat > backend/.env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/citas_db"
JWT_SECRET="test-secret-key-muy-largo-minimo-32-caracteres-de-verdad"
JWT_EXPIRATION="24h"
WHATSAPP_PHONE_NUMBER_ID="123456789"
WHATSAPP_ACCESS_TOKEN="dummy-token-for-testing"
WHATSAPP_VERIFY_TOKEN="verify-token-test-secret"
OPENAI_API_KEY="sk-your-actual-key-here"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
EOF

echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > frontend/.env

echo "✅ Variables configuradas"
echo ""

# 2. Iniciar Docker Compose
echo "🐳 Iniciando Docker Compose..."
docker-compose up -d

echo "⏳ Esperando a que PostgreSQL inicie..."
sleep 30

# 3. Migraciones
echo "🗄️  Ejecutando migraciones Prisma..."
docker-compose exec -T backend npx prisma db push --skip-generate

# 4. Seed
echo "🌱 Cargando datos de prueba..."
docker-compose exec -T backend npm run db:seed

echo ""
echo "✅ ¡LISTO!"
echo ""
echo "📍 URLs:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:3001"
echo "   • Database: localhost:5432"
echo ""
echo "🔐 Credenciales por defecto:"
echo "   • Email: test@example.com"
echo "   • Contraseña: password123"
echo ""
echo "📊 Ver logs:"
echo "   docker-compose logs -f backend"
echo "   docker-compose logs -f frontend"
echo ""
echo "🎉 ¡El MVP está listo para usar!"
