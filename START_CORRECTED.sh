#!/bin/bash

###############################################################################
# MVP STARTUP SCRIPT - VERSIÓN CORREGIDA
# Ejecuta el proyecto completamente con todas las correcciones
###############################################################################

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       🚀 INICIANDO MVP - GESTOR DE CITAS (CORREGIDO)          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar Docker
echo "📋 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker no está instalado"
    echo "   Por favor instala Docker desde https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ ERROR: Docker Compose no está instalado"
    exit 1
fi
echo "✅ Docker instalado"
echo ""

# 2. Crear archivos .env
echo "📝 Configurando variables de entorno..."

# Backend .env
cat > backend/.env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/citas_db"
JWT_SECRET="test-secret-key-very-long-min-32-characters-xyz123"
JWT_EXPIRATION="24h"
WHATSAPP_PHONE_NUMBER_ID="123456789"
WHATSAPP_ACCESS_TOKEN="dummy-token-for-testing"
WHATSAPP_VERIFY_TOKEN="verify-token-secret"
OPENAI_API_KEY="sk-your-actual-key-here"
NODE_ENV="development"
PORT="3001"
FRONTEND_URL="http://localhost:3000"
EOF

echo "✅ backend/.env configurado"

# Frontend .env
cat > frontend/.env << 'EOF'
NEXT_PUBLIC_API_URL="http://localhost:3001"
EOF

echo "✅ frontend/.env configurado"
echo ""

# 3. Limpiar (opcional)
echo "🧹 Limpiando contenedores antiguos..."
docker-compose down 2>/dev/null || true
echo "✅ Limpieza completada"
echo ""

# 4. Construir y iniciar
echo "🐳 Construyendo imágenes Docker..."
docker-compose build --no-cache || {
    echo "❌ ERROR: Fallo al construir imágenes"
    echo "   Verifica los Dockerfiles y package.json"
    exit 1
}
echo "✅ Imágenes construidas"
echo ""

echo "🚀 Iniciando servicios..."
docker-compose up -d

echo ""
echo "⏳ Esperando a que los servicios inicien..."
echo "   - PostgreSQL: iniciando..."
sleep 15
echo "   - Backend: iniciando migraciones..."
sleep 15
echo "   - Frontend: compilando..."
sleep 10
echo ""

# 5. Verificar estado
echo "🔍 Verificando estado de servicios..."
docker-compose ps
echo ""

# 6. Esperar a que backend esté listo
echo "⏳ Esperando a que el backend esté listo..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend respondiendo"
        break
    fi
    RETRY=$((RETRY + 1))
    echo "   Intento $RETRY/$MAX_RETRIES..."
    sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "⚠️  Backend tardó en responder, pero continuamos..."
fi
echo ""

# 7. Verificar base de datos
echo "🗄️  Verificando base de datos..."
if docker-compose exec -T postgres pg_isready -U postgres -d citas_db > /dev/null 2>&1; then
    echo "✅ PostgreSQL listo"
else
    echo "⚠️  PostgreSQL aún no responde completamente"
fi
echo ""

# 8. Ver logs de migraciones
echo "📋 Últimos logs del backend (migraciones):"
docker-compose logs backend | tail -20
echo ""

# 9. Resumen
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  ✅ MVP COMPLETAMENTE INICIADO                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  📍 URLs:                                                      ║"
echo "║     • Frontend:    http://localhost:3000                       ║"
echo "║     • Backend API: http://localhost:3001                       ║"
echo "║     • Health:      http://localhost:3001/health                ║"
echo "║                                                                ║"
echo "║  🔐 Credenciales:                                              ║"
echo "║     • Email:       test@example.com                            ║"
echo "║     • Contraseña:  password123                                 ║"
echo "║                                                                ║"
echo "║  📊 Comandos útiles:                                           ║"
echo "║     • Ver logs:     docker-compose logs -f backend             ║"
echo "║     • Acceso DB:    docker-compose exec postgres psql -U postgres -d citas_db"
echo "║     • Ver estado:   docker-compose ps                          ║"
echo "║     • Parar todo:   docker-compose down                        ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 10. Esperar a que el usuario quiera ver logs
echo "✅ ¡Todo está listo!"
echo ""
echo "💡 Próximo paso: Abre http://localhost:3000 en tu navegador"
echo ""
echo "Para ver logs en tiempo real:"
echo "  docker-compose logs -f"
echo ""
echo "Para parar todo:"
echo "  docker-compose down"
echo ""
