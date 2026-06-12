@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo   INICIANDO MVP - GESTOR DE CITAS
echo ========================================
echo.

echo 1. Limpiando contenedores antiguos...
docker compose down -v 2>nul

echo.
echo 2. Construyendo imágenes...
docker compose build --no-cache

echo.
echo 3. Iniciando servicios...
docker compose up -d

echo.
echo 4. Esperando a que los servicios inicien...
timeout /t 30 /nobreak

echo.
echo 5. Verificando estado...
docker compose ps

echo.
echo ========================================
echo   LISTO!
echo ========================================
echo.
echo URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo Credenciales:
echo   Email:     test@example.com
echo   Password:  password123
echo.
echo Ver logs:
echo   docker compose logs -f backend
echo.
pause
