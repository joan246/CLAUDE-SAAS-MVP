# 🚀 INSTALA Y EJECUTA - MVP GESTOR DE CITAS

## Windows (Más fácil)

```
1. Ve a: C:\Users\hisie\OneDrive\Escritorio\CLAUDE SAAS MVP

2. Haz doble clic en: RUN.bat

3. Espera a que termine (5-10 minutos)

4. Abre en el navegador: http://localhost:3000

5. Login:
   Email: test@example.com
   Contraseña: password123

6. ¡LISTO!
```

---

## Mac/Linux (Línea de comandos)

```bash
cd "C:\Users\hisie\OneDrive\Escritorio\CLAUDE SAAS MVP"
bash RUN.sh
```

---

## Línea de comandos manual (si prefieres más control)

```bash
# Ir al directorio
cd "C:\Users\hisie\OneDrive\Escritorio\CLAUDE SAAS MVP"

# Limpiar (si hay algo viejo)
docker compose down -v

# Construir
docker compose build --no-cache

# Iniciar
docker compose up -d

# Esperar 30 segundos
sleep 30

# Ver estado
docker compose ps

# Ver logs del backend
docker compose logs backend
```

Una vez veas en los logs:
```
> npm run dev
```

Entonces está listo.

---

## 🔓 Credenciales

```
Email: test@example.com
Contraseña: password123
```

---

## 🌐 URLs

```
Frontend: http://localhost:3000
Backend: http://localhost:3001
Health: http://localhost:3001/health
```

---

## 🐛 Si algo falla

### Error: "Cannot connect to database"
```bash
# Esperar más
sleep 20
docker compose logs postgres
```

### Error: "Port already in use"
```bash
# Matar los procesos
lsof -i :3000  # Para ver qué usa el puerto
lsof -i :3001
lsof -i :5432
```

### Error: "npm install failed"
```bash
# Limpiar y reintentar
docker compose down -v
docker compose build --no-cache --progress=plain
```

### Ver logs en tiempo real
```bash
docker compose logs -f
```

### Parar todo
```bash
docker compose down
```

### Parar y borrar TODOS los datos
```bash
docker compose down -v
```

---

## ✅ Verificación rápida

```bash
# ¿Están los containers corriendo?
docker compose ps

# ¿Responde el backend?
curl http://localhost:3001/health

# ¿Carga el frontend?
curl http://localhost:3000
```

---

## 🎯 Próximos pasos después de ejecutar

1. Abre http://localhost:3000
2. Haz login con test@example.com / password123
3. Verás el dashboard con una cita de prueba
4. ¡Disfruta tu MVP! 🎉

---

**¿Qué incluye el MVP?**

✅ Backend NestJS con API completa
✅ Frontend Next.js con dashboard
✅ PostgreSQL con datos de prueba
✅ Autenticación JWT
✅ Gestión de citas
✅ Gestión de clientes
✅ Integración WhatsApp (estructura lista)
✅ Integración OpenAI (estructura lista)

**¿Qué falta?**

- Conectar WhatsApp real (necesitas credenciales de Meta)
- Conectar OpenAI real (necesitas API key)
- Agregar más features según necesites

---

**Problemas?**

1. Lee los logs: `docker compose logs backend`
2. Verifica que Docker está corriendo
3. Verifica que los puertos 3000, 3001, 5432 están libres
4. Reinicia todo: `docker compose down -v && docker compose up -d`

¡Eso es todo!
