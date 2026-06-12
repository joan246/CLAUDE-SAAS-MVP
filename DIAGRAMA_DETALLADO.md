# 📐 DIAGRAMAS DETALLADOS - ARQUITECTURA MVP

---

## DIAGRAMA 1: Flujo Completo de Conversación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENTE → CITA (Flujo Completo)                      │
└─────────────────────────────────────────────────────────────────────────────┘

PASO 1: CLIENTE ENVÍA MENSAJE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👤 Cliente                        📱 WhatsApp
  "Hola, quiero                     (Cloud API)
   agendar manicura"  ────────────────────► [Webhook Handler]
                                            │
                                            ▼
PASO 2: INGESTA Y ENCOLADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Message Validator]  ──► Verificar X-Signature
                         │
                         ├─► ✓ Firma válida
                         │   │
                         │   ▼
                         │ [Message Queue]
                         │   • message_id: UUID
                         │   • from: +34XXXXXXXXX
                         │   • text: "Hola, quiero agendar manicura"
                         │   • timestamp: ISO8601
                         │   • tenant_id: UUID (extraído de config)
                         │
                         └─► ✗ Firma inválida
                             → Log + Discard

PASO 3: PROCESAMIENTO EN BACKGROUND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Message Processor] ─┬─► [NLU Engine]
  Dequeue message     │   (Intent recognition)
                      │   └─► Classify: "appointment_request"
                      │       Entities: service="manicura"
                      │
                      ├─► [Db Query]
                      │   • Get customer by phone
                      │   • Get business config
                      │   • Get services + pricing
                      │   • Get staff schedule
                      │
                      ├─► [Chat Engine Decision]
                      │   IF service NOT found
                      │     → Response: "¿Qué tipo de manicura buscas?"
                      │   ELSE
                      │     → Next step: Availability check

PASO 4: CONSULTAR DISPONIBILIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Scheduler Service]
    ├─► Query appointments (next 7 days)
    ├─► Apply business rules
    │   • Opening hours: 9 AM - 6 PM
    │   • Service duration: 45 min
    │   • Buffer between appointments: 15 min
    │   • Timezone: America/Bogota
    │
    ├─► Find available slots
    │   Available: Mañana 2 PM, 3 PM, 4 PM
    │            Pasado 10 AM, 11 AM, 2 PM
    │
    └─► Rank by preference
        • Preferred time from history
        • Business's preferred times
        • AI prediction (busy hours)

PASO 5: GENERAR RESPONSE
━━━━━━━━━━━━━━━━━━━━━━━━
  [Chat Engine]
    ├─► Template selection
    │   └─► appointment_confirm_template
    │
    ├─► Variable substitution
    │   • Service: "Manicura Premium"
    │   • Price: "$45"
    │   • Duration: "45 minutos"
    │   • Staff: (si tengo datos)
    │
    ├─► Generate message
    │   "✨ Manicura Premium: $45 (45 min)"
    │   "¿Te reservamos mañana a las 2 PM?"
    │   [Buttons: "2 PM" | "3 PM" | "4 PM" | "Ver más"]
    │
    └─► Generate inline buttons
        └─► WhatsApp Interactive Messages
            type: "list" o "button_reply"

PASO 6: ENVIAR RESPUESTA
━━━━━━━━━━━━━━━━━━━━━━━━
  [Outgoing Queue]
    ├─► Prepare WhatsApp message
    ├─► Check rate limit
    │   • Business limit: X msgs/day
    │   • API limit: 80 msgs/sec
    │
    ├─► Send to WhatsApp API
    │   POST /messages
    │   {
    │     "messaging_product": "whatsapp",
    │     "to": "+34XXXXXXXXX",
    │     "type": "interactive",
    │     "interactive": {
    │       "type": "button",
    │       "body": { "text": "..." },
    │       "action": { ... buttons ... }
    │     }
    │   }
    │
    └─► Handle response
        ├─► Success (201)
        │   └─► Log message_id + timestamp
        │
        └─► Failure
            └─► Retry with exponential backoff
                (1s, 2s, 4s, 8s, 16s)

PASO 7: CLIENTE INTERACTÚA
━━━━━━━━━━━━━━━━━━━━━━━━━━
  👤 Cliente
  [Tap "3 PM"]  ───────────────────► WhatsApp
                                      (Button callback webhook)
                                      │
                                      ▼
                                    [Webhook Handler]
                                    • message_id
                                    • button_reply
                                    • reply_id: "3_pm_slot"

PASO 8: CONFIRMAR CITA
━━━━━━━━━━━━━━━━━━━━━
  [Chat Engine]
    ├─► Parse button reply
    ├─► Acquire lock (pessimistic)
    │   → SELECT * FROM appointments
    │      WHERE scheduled_at = '2024-06-09 3 PM'
    │      FOR UPDATE
    │
    ├─► Create appointment
    │   INSERT INTO appointments
    │   (business_id, customer_id, scheduled_at, status, ...)
    │   VALUES (...)
    │   RETURNING *
    │
    ├─► Update customer
    │   UPDATE customers
    │   SET lifetime_value = lifetime_value + 45
    │
    ├─► Log interaction
    │   INSERT INTO conversation_messages
    │   (conversation_id, content, interaction_type, ...)
    │
    └─► Trigger workflow: appointment_created event
        └─► Background job: Send confirmation SMS/Email

PASO 9: ENVIAR CONFIRMACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Response Generator]
    └─► "✅ ¡Confirmado!"
        "Manicura Premium - Mañana 3 PM"
        "📍 Calle Principal 123"
        "Recuerda cancelar 2 horas antes"
        "¿Algo más en lo que podamos ayudarte?"

PASO 10: RECORDATORIO AUTOMÁTICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Cron Job: Every 5 min]
    └─► Query appointments where:
        • status = 'scheduled'
        • scheduled_at - NOW() = 24h ± 5min
        • reminder_sent = false
        │
        └─► For each appointment:
            ├─► Create message in queue
            ├─► Send WhatsApp
            ├─► Mark reminder_sent = true
            └─► Log event

  Message: "🔔 Recordatorio: Manicura mañana a las 3 PM
            ¿Confirmas asistencia?"
            [Buttons: "Confirmo" | "Reprogramar" | "Cancelar"]

FIN: CITA EN SISTEMA
━━━━━━━━━━━━━━━━━━
✅ Appointment guardada en DB
✅ Customer actualizado
✅ Conversation logged
✅ Reminders scheduled
✅ Business notificado (email/dashboard)
```

---

## DIAGRAMA 2: Arquitectura de Microservicios (No MVP, pero planeada)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ARQUITECTURA ESCALADA                             │
│                            (Fase 2, Mes 4+)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                              🌐 INTERNET
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              (WhatsApp API)           (Instagram Graph)
                    │                           │
                    └─────────┬─────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  API Gateway       │
                    │  (CloudFlare)      │
                    │  • Rate limit      │
                    │  • Auth (JWT)      │
                    │  • Route traffic   │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   [Webhook               [REST API            [WebSocket
    Handler]              Server]               Server]
    (Go/Rust)            (Node.js)             (Node.js)
    • Ingesta fast        • Business logic     • Real-time
    • Queue msg           • User mgmt          • Chat updates
    • Validate sig        • Reports            • Notifications
        │                     │                    │
        └─────────┬───────────┼────────────────────┘
                  │           │
              ┌───▼───────────▼───┐
              │  Message Bus       │
              │  (RabbitMQ/Kafka)  │
              │  • Async events    │
              │  • At-least-once   │
              │  • Guaranteed      │
              └───┬────────────────┘
                  │
    ┌─────────────┼─────────────┬──────────────────┐
    │             │             │                  │
    ▼             ▼             ▼                  ▼
 [Chat         [Scheduler    [Analytics       [Notification
  Service]      Service]      Service]         Service]
  • NLU         • Cron jobs   • Events         • SMS (Twilio)
  • Rules       • Reminders   • Aggregation   • Email
  • Responses   • Follow-ups  • Queries       • Push notif

    │             │             │                  │
    └─────────────┼─────────────┴──────────────────┘
                  │
         ┌────────▼──────────┐
         │  Data Layer       │
         ├───────────────────┤
         │ Primary DB        │
         │ (PostgreSQL       │
         │  Write Master)    │
         └────┬──────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
[Read Replica 1]   [Read Replica 2]
(Standby)          (Analytics)
    │                   │
    └─────────┬─────────┘
              │
    ┌─────────▼──────────┐
    │  Cache Layer       │
    │  (Redis Cluster)   │
    │  • Sessions        │
    │  • Rate limits     │
    │  • Hot data        │
    └────────────────────┘

    ┌──────────────────────┐
    │  Search & Analytics  │
    │  (Elasticsearch)     │
    │  • Conversations     │
    │  • Full-text search  │
    │  • Aggregations      │
    └──────────────────────┘

    ┌──────────────────────┐
    │  Object Storage      │
    │  (S3/GCS)            │
    │  • Files             │
    │  • Backups           │
    │  • Media             │
    └──────────────────────┘

    ┌──────────────────────┐
    │  Observability       │
    │  • Prometheus        │
    │  • Grafana           │
    │  • Jaeger (tracing)  │
    │  • Sentry (errors)   │
    └──────────────────────┘
```

---

## DIAGRAMA 3: Patrón de Multi-Tenancy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MULTI-TENANCY ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

MVP APPROACH: Shared Database + Row-Level Security
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

            ┌─────────────────────────────────┐
            │     SHARED POSTGRESQL DB        │
            ├─────────────────────────────────┤
            │                                 │
            │  ┌──────────────────────────┐   │
            │  │ Tenant: ABC Beauty       │   │
            │  ├──────────────────────────┤   │
            │  │ • 5 staff members        │   │
            │  │ • 2000 customers         │   │
            │  │ • 50 appointments/month  │   │
            │  │ • Data: 50MB             │   │
            │  └──────────────────────────┘   │
            │                                 │
            │  ┌──────────────────────────┐   │
            │  │ Tenant: Barbershop XYZ   │   │
            │  ├──────────────────────────┤   │
            │  │ • 3 staff members        │   │
            │  │ • 1500 customers         │   │
            │  │ • 100 appointments/month │   │
            │  │ • Data: 30MB             │   │
            │  └──────────────────────────┘   │
            │                                 │
            │  [+ 100 more tenants...]        │
            │                                 │
            └─────────────────────────────────┘

Row-Level Security (RLS) Implementation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  User Login
    │
    ├─► JWT Token contains: tenant_id = "abc123"
    │
    ├─► Connection to PostgreSQL
    │   └─► SET app.current_tenant_id TO 'abc123'
    │
    └─► Query Example:
        SELECT * FROM customers
        WHERE tenant_id = current_setting('app.current_tenant_id')::uuid

PostgreSQL RLS Policy:
━━━━━━━━━━━━━━━━━━━━

CREATE POLICY tenant_isolation ON customers
USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

Result:
━━━━━

  Tenant A User            Tenant B User
       │                        │
       └────┬────────────────┬──┘
            │                │
            ▼                ▼
       [Same Database]
            │
       [RLS Policy]
            │
       ┌────┴────┐
       │          │
       ▼          ▼
    Sees only   Sees only
    Tenant A    Tenant B
    data        data
    ✓           ✓
    Cannot      Cannot
    see B       see A
    ✓           ✓


UPGRADE PATH (Fase 2-3): Database-per-Tenant
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

         Shared Metadata DB
         ┌────────────────┐
         │ Tenants        │
         │ Users          │
         │ Subscriptions  │
         │ Billing        │
         └────┬───────────┘
              │
    ┌─────────┼──────────┬──────────┐
    │         │          │          │
    ▼         ▼          ▼          ▼
  [DB1]     [DB2]      [DB3]   [...DB100]
 Tenant A  Tenant B   Tenant C  Tenant N
   │         │          │          │
   └─────────┴──────────┴──────────┘
         (Managed by routing layer)

Routing Logic:
  1. User logs in
  2. Get tenant_id from JWT
  3. Lookup tenant → db_connection_string
  4. Connect to specific DB
  5. Query (no RLS needed, isolated DB)


MATRIZ DE DECISIÓN
━━━━━━━━━━━━━━━━

┌──────────────────┬──────────────┬──────────────────┐
│ Aspecto          │ Shared DB    │ DB-per-Tenant    │
├──────────────────┼──────────────┼──────────────────┤
│ Complejidad      │ Baja         │ Media            │
│ Costo            │ Bajo         │ Alto             │
│ Seguridad        │ Media (RLS)  │ Alta (isolation) │
│ Escalabilidad    │ Media        │ Alta             │
│ Operaciones      │ Simple       │ Compleja         │
│ Performance      │ Degrada (N)  │ Lineal           │
│ Backup/Restore   │ Complejo     │ Simple (per DB)  │
│                  │              │                  │
│ MVP Ready?       │ ✅ YES       │ ❌ NO           │
│ Upgrade Path?    │ ✅ YES       │ From Shared      │
└──────────────────┴──────────────┴──────────────────┘

RECOMENDACIÓN: Empezar en Shared DB (MVP), upgrade en Mes 3-4
cuando tengas clarity sobre tamaño de clientes y requirements
de compliance.
```

---

## DIAGRAMA 4: Data Flow por Módulo

```
┌──────────────────────────────────────────────────────────────┐
│              MÓDULO 1: AUTH & MULTI-TENANCY                  │
└──────────────────────────────────────────────────────────────┘

Signup Flow:
  [User submits form] 
       ↓
  [Validate email + password]
       ↓
  [Hash password (bcrypt)] → $2b$12$...(60 chars)
       ↓
  [Create user + tenant]
       ↓
  [Send confirmation email]
       ↓
  [Setup business + default services]
       ↓
  [Generate JWT token] → {sub: user_id, tenant_id, role}
       ↓
  [Return to dashboard]

Login Flow:
  [Email + Password]
       ↓
  [Query user by email]
       ↓
  [bcrypt.compare(password, hash)]
       ↓
  IF match:
    ├─► Generate JWT (exp: 1 hour)
    ├─► Generate Refresh Token (exp: 7 days)
    └─► Return both
  ELSE:
    └─► Error 401 + rate limit check

JWT Token Structure:
{
  "sub": "user-uuid",
  "email": "admin@abc-beauty.com",
  "tenant_id": "tenant-uuid",
  "role": "admin",
  "permissions": ["read:appointments", "write:customers"],
  "iat": 1718000000,
  "exp": 1718003600
}


┌──────────────────────────────────────────────────────────────┐
│           MÓDULO 2: CHAT ENGINE & CONVERSATION              │
└──────────────────────────────────────────────────────────────┘

Message Ingestion Flow:
  [WhatsApp Webhook POST]
       ↓
  [Validate X-Signature with secret key]
       ↓
  [Extract: from, message_id, text, timestamp]
       ↓
  [Get or create conversation]
       ├─► Query: (phone, business_id)
       ├─► IF not exists: Create new
       └─► ELSE: Use existing
       ↓
  [Get or create customer]
       ├─► Query: (phone, business_id)
       ├─► IF not exists: Create with auto-name
       └─► ELSE: Use existing
       ↓
  [Save message to DB]
       ├─► INSERT INTO messages
       ├─► INSERT INTO conversation_activity_log
       └─► RETURN message_id
       ↓
  [Respond immediately with 200]
       │ (Don't block webhook response)
       │
       └─► [Background Job: Process Message]
           ├─► NLU analysis
           ├─► Extract intent
           ├─► Route to handler
           ├─► Generate response
           └─► Queue outgoing message

NLU/Intent Classification:
  Input: "Hola, quiero agendar una manicura"
       ↓
  [Tokenize + normalize]
  "hola quiero agendar manicura" (lowercase)
       ↓
  [Intent classifier: Rules or ML]
  IF contains: ("agendar", "cita", "reserva") → appointment
  IF contains: ("precio", "costo", "cuánto") → pricing
  IF contains: ("cancelar", "no puedo") → cancellation
       ↓
  [Entity extraction]
  Service: "manicura"
  Time: None (ask next)
  Status: incomplete
       ↓
  [Conversation state machine]
  CURRENT_STATE: need_service_selection
  NEXT_STATE: need_time_selection
       ↓
  [Response generation]
  Template: "service_selected"
  Variables: {service: "Manicura", price: "$45"}


┌──────────────────────────────────────────────────────────────┐
│        MÓDULO 3: APPOINTMENT SCHEDULING                      │
└──────────────────────────────────────────────────────────────┘

Availability Check Flow:
  [Request: service_id, desired_date]
       ↓
  [Get business config]
       ├─► Opening hours: 9 AM - 6 PM
       ├─► Service duration: 45 min
       ├─► Staff: 3 people
       └─► Timezone: America/Bogota
       ↓
  [Get occupied slots for date]
       ├─► SELECT scheduled_at FROM appointments
       ├─► WHERE date(scheduled_at) = '2024-06-09'
       ├─► AND status IN ('scheduled', 'confirmed')
       └─► ORDER BY scheduled_at
       ↓
  [Generate available slots]
       ├─► Start: 9:00 AM
       ├─► Loop each 45-min increment:
       │   ├─► Check if occupied
       │   ├─► IF free: Add to available
       │   └─► IF conflict: Skip (15 min buffer)
       ├─► End: 6:00 PM
       └─► Result: [9:00, 9:45, 10:30, ..., 5:15]
       ↓
  [Rank slots by preference]
       ├─► Business preference (busy hours)
       ├─► Customer history (likes 2-3 PM)
       ├─► AI prediction (high cancel rate at 6 PM)
       └─► Return top 3 options
       ↓
  [Format response]
  "¿Cuál prefieres?"
  [2 PM] [3 PM] [4 PM]

Booking Confirmation Flow:
  [User selects time: 3 PM]
       ↓
  [Lock row in database]
       ├─► SELECT * FROM appointments
       ├─► WHERE scheduled_at = '2024-06-09 3:00 PM'
       ├─► AND business_id = 'xyz'
       └─► FOR UPDATE (lock until transaction ends)
       ↓
  [Check if still available]
       ├─► Recount occupied slots
       ├─► IF available: Proceed
       └─► ELSE: Abort + notify customer
       ↓
  [Create appointment]
       ├─► INSERT INTO appointments VALUES (...)
       ├─► RETURNING *
       └─► Commit (lock released)
       ↓
  [Update customer lifetime value]
       ├─► UPDATE customers SET lifetime_value += price
       └─► Commit
       ↓
  [Create conversation log entry]
       ├─► INSERT INTO conversation_messages
       ├─► type = 'system'
       └─► content = 'Appointment created'
       ↓
  [Trigger workflows]
       ├─► event: appointment_created
       ├─► Queue: send_confirmation
       ├─► Queue: send_reminder (24h)
       └─► Queue: send_followup (48h after)
       ↓
  [Send confirmation to customer]
  "✅ ¡Reserva confirmada!"
  "📅 Mañana 3 PM"
  "📍 Calle Principal 123"


┌──────────────────────────────────────────────────────────────┐
│          MÓDULO 4: REMINDERS & NOTIFICATIONS                 │
└──────────────────────────────────────────────────────────────┘

Cron Job (Every 5 minutes):
  [Query appointments]
       ├─► WHERE scheduled_at - NOW() = 24 hours ± 5 min
       ├─► AND reminder_sent = false
       ├─► AND status = 'scheduled'
       └─► LIMIT 100 (batch)
       ↓
  [For each appointment]
       ├─► Get customer phone
       ├─► Get business config (message template)
       ├─► Format message with details
       │   ├─► Customer name
       │   ├─► Service
       │   ├─► Time
       │   └─► Location
       │
       ├─► Queue message
       │   ├─► type: 'reminder'
       │   ├─► priority: 'high'
       │   └─► retries: 3
       │
       ├─► Mark reminder_sent = true
       │   (So we don't send twice)
       │
       └─► Log event
           INSERT INTO appointment_events
           (appointment_id, event_type, timestamp)

Message Sending (from Queue):
  [Dequeue message]
       ↓
  [Rate limit check]
       ├─► Business: X msgs/day
       ├─► API: 80 msgs/sec globally
       └─► IF limit exceeded: Re-queue with delay
       ↓
  [Send to WhatsApp API]
       ├─► POST https://graph.instagram.com/v18.0/...
       ├─► auth: Bearer token
       └─► body: {...message...}
       ↓
  [Response handling]
       ├─► 201 Created
       │   └─► message_id returned
       │       ├─► Log: message_id + timestamp
       │       └─► Mark as sent
       │
       └─► 400-500 Error
           ├─► IF retryable (rate limit, timeout)
           │   └─► Re-queue with exponential backoff
           └─► IF not retryable (invalid phone)
               └─► Mark as failed + alert business


┌──────────────────────────────────────────────────────────────┐
│             MÓDULO 5: ANALYTICS & REPORTING                  │
└──────────────────────────────────────────────────────────────┘

Event Collection:
  Every important action generates an event:
  
  Events:
  ├─► customer_created
  ├─► conversation_started
  ├─► message_sent
  ├─► appointment_created
  ├─► appointment_confirmed
  ├─► appointment_cancelled
  ├─► reminder_sent
  ├─► response_time_recorded
  └─► message_delivered / failed

Analytics Tables:
  [analytics_events]
    ├─► tenant_id (partition key)
    ├─► business_id
    ├─► event_type
    ├─► timestamp
    ├─► metadata (JSON)
    └─► (Fast inserts, batched writes)
  
  [analytics_daily_summary]
    ├─► tenant_id + date (PK)
    ├─► total_conversations
    ├─► total_appointments
    ├─► confirmation_rate
    ├─► cancellation_rate
    ├─► revenue
    └─► (Computed nightly by Batch Job)

Dashboard Queries:
  This Month's Metrics:
    SELECT 
      COUNT(*) as appointments,
      AVG(EXTRACT(EPOCH FROM (confirmed_at - created_at))/60) 
        as avg_booking_time_minutes,
      SUM(price) as revenue,
      COUNT(CASE WHEN status='cancelled' THEN 1 END)::float / 
        COUNT(*) as cancellation_rate
    FROM appointments
    WHERE business_id = $1
    AND created_at >= DATE_TRUNC('month', NOW())
    GROUP BY DATE(created_at)
```

---

## DIAGRAMA 5: Infraestructura & Deployment

```
┌─────────────────────────────────────────────────────────────┐
│              LOCAL DEVELOPMENT ENVIRONMENT                   │
└─────────────────────────────────────────────────────────────┘

Developer Machine:
  ├─► Docker Desktop installed
  ├─► docker-compose.yml (defines all services)
  │
  └─► Services running:
      ├─► Node.js (backend) - port 3001
      ├─► React dev server - port 3000
      ├─► PostgreSQL - port 5432
      ├─► Redis - port 6379
      ├─► Mailhog (dev email) - port 1025
      └─► PgAdmin (DB UI) - port 5050

docker-compose.yml:
  version: '3.9'
  services:
    backend:
      build: ./backend
      ports: ["3001:3001"]
      env_file: .env.local
      volumes: ["./backend:/app"]
      depends_on: [postgres, redis]
    
    frontend:
      build: ./frontend
      ports: ["3000:3000"]
      volumes: ["./frontend:/app"]
    
    postgres:
      image: postgres:16
      ports: ["5432:5432"]
      environment:
        POSTGRES_PASSWORD: dev_password
      volumes: ["postgres_data:/var/lib/postgresql/data"]
    
    redis:
      image: redis:7
      ports: ["6379:6379"]
    
    mailhog:
      image: mailhog/mailhog:latest
      ports: ["1025:1025", "8025:8025"]

Workflow:
  1. Clone repo
  2. Create .env.local with dev values
  3. docker-compose up -d
  4. npm install && npm run dev (in both directories)
  5. Access http://localhost:3000
  6. Made changes → Hot reload (both frontend & backend)


┌─────────────────────────────────────────────────────────────┐
│          CI/CD PIPELINE (GitHub Actions)                     │
└─────────────────────────────────────────────────────────────┘

Trigger: Push to branch

Stage 1: Lint & Test (5 min)
  ├─► npm run lint
  │   └─► ESLint + Prettier
  ├─► npm run test:unit
  │   └─► Jest (backend + frontend)
  └─► npm run test:integration
      └─► Test database + APIs

Stage 2: Security Scan (3 min)
  ├─► npm audit
  ├─► SonarQube (code quality)
  └─► Snyk (vulnerability scan)

Stage 3: Build (8 min)
  ├─► npm run build:backend
  ├─► npm run build:frontend
  ├─► docker build backend
  └─► docker build frontend

Stage 4: Deploy to Staging (2 min)
  ├─► DigitalOcean: Deploy to staging environment
  ├─► Run smoke tests
  └─► Alert if failed

Result:
  ├─► IF all passed → Deploy to production ready
  ├─► IF failed → Notify team
  └─► Success: Deploy takes 15 minutes total

On Production Push:
  ├─► Same pipeline
  ├─► Manual approval step
  └─► Blue-green deployment (zero downtime)


┌─────────────────────────────────────────────────────────────┐
│         PRODUCTION INFRASTRUCTURE (DigitalOcean)             │
└─────────────────────────────────────────────────────────────┘

                        ┌─────────────┐
                        │ CloudFlare  │
                        │ • DNS       │
                        │ • CDN       │
                        │ • DDoS      │
                        └──────┬──────┘
                               │
                    ┌──────────▼──────────┐
                    │  Load Balancer      │
                    │  (DigitalOcean ALB) │
                    │  • SSL termination  │
                    │  • Health checks    │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
        ┌────────┐         ┌────────┐        ┌────────┐
        │ Droplet│         │ Droplet│        │ Droplet│
        │ #1     │         │ #2     │        │ #3     │
        │App:    │         │App:    │        │ Backup │
        │3000    │         │3000    │        │ (cold) │
        └──┬─────┘         └──┬─────┘        └────────┘
           │                  │
           └──────────┬───────┘
                      │
        ┌─────────────▼──────────────┐
        │  PostgreSQL (Managed)      │
        │  • 1GB (MVP)               │
        │  • Automatic backups       │
        │  • Daily snapshots         │
        │  • WAL archiving           │
        └────────────────────────────┘
        
        ┌─────────────────────────────┐
        │  Redis (Managed)            │
        │  • 256MB                    │
        │  • Sessions + cache         │
        │  • Message queue            │
        └─────────────────────────────┘

Health Check:
  Load Balancer pings:
  GET /health
  ├─► Response: 200 OK + {"status": "healthy"}
  ├─► Interval: 30 seconds
  └─► Mark unhealthy: 3 consecutive failures → remove from rotation

Autoscaling Rules (Future):
  ├─► CPU > 70% for 5 min → Add 1 container
  ├─► CPU < 30% for 10 min → Remove 1 container
  └─► Max containers: 10
  └─► Min containers: 2


┌─────────────────────────────────────────────────────────────┐
│         MONITORING & ALERTING STACK                          │
└─────────────────────────────────────────────────────────────┘

Sentry (Error Tracking):
  ├─► Captures all exceptions
  ├─► Groups by error type
  ├─► Alerts on critical errors
  └─► Example Alert:
      "NullPointerException in ChatEngine
       Occurred 5 times in last 5 minutes
       → Post to #alerts-prod Slack channel"

CloudFlare Analytics:
  ├─► Requests per second
  ├─► Error rates (4xx, 5xx)
  ├─► Cache hit ratio
  └─► Geographic distribution

Checkly (Uptime Monitoring):
  ├─► Synthetic tests every 1 min
  ├─► Test endpoints:
  │   ├─► GET /health
  │   ├─► GET /api/appointments (auth required)
  │   └─► POST /api/messages (webhook simulation)
  └─► Alert if > 2 failures consecutive

Custom Dashboards:
  ├─► API latency (P50, P95, P99)
  ├─► Database connections in use
  ├─► Redis memory usage
  ├─► Message queue depth
  ├─► Webhook success rate
  └─► Active conversations
  
  Refresh: Every 30 seconds

On-Call Runbook:
  IF alert triggered:
    1. Check Sentry for error details
    2. Check CloudFlare for DDoS
    3. SSH to production box
    4. Check logs: docker logs <container>
    5. If database issue: Check DigitalOcean dashboard
    6. Rollback last deploy if needed
    7. Notify team in Slack
```

---

## DIAGRAMA 6: Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY DEFENSE LAYERS                   │
└─────────────────────────────────────────────────────────────┘

Layer 1: PERIMETER (DDoS, Rate Limiting)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Attacker
    ↓
  [CloudFlare DDoS Protection]
  ├─► Rate limit suspicious IPs
  ├─► Detect bot patterns
  ├─► Block known attack IPs
  └─► Whitelist CloudFlare IPs
    ↓
  [Application Rate Limiting]
  ├─► 100 req/min per IP (global)
  ├─► 1000 req/min per user (authenticated)
  ├─► 10 req/min for password attempts
  └─► 5 req/min for signup (prevent spam)

Layer 2: TRANSPORT (HTTPS, TLS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  All traffic must be HTTPS
  ├─► TLS 1.3 minimum
  ├─► HSTS header enforced (1 year)
  ├─► Certificate pinning (mobile future)
  └─► No HTTP redirects (direct HTTPS)

Layer 3: AUTHENTICATION (JWT, 2FA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  User Login:
    ├─► Email + Password
    ├─► Check account status (not suspended)
    ├─► Verify password (bcrypt)
    ├─► Generate JWT (1 hour expiry)
    ├─► Generate Refresh Token (7 days, httpOnly)
    └─► Optional: 2FA (TOTP) for admin users
  
  JWT Token:
    ├─► RS256 (asymmetric) - can verify without secret
    ├─► Contains: user_id, tenant_id, role, permissions
    ├─► Signed with private key (server only)
    ├─► Verified with public key
    └─► Expires: 1 hour (short-lived)
  
  Refresh Token:
    ├─► Stored in httpOnly cookie (secure)
    ├─► Expires: 7 days
    ├─► Used to get new JWT without re-login
    └─► Rotated on each use

Layer 4: AUTHORIZATION (RBAC, RLS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Every endpoint checks:
    ├─► User authenticated? (has valid JWT)
    ├─► User role has permission?
    │   ├─► admin: All operations
    │   ├─► manager: Business operations
    │   └─► user: Read-only + own data
    │
    └─► Database RLS:
        └─► SELECT * FROM appointments
            WHERE tenant_id = current_user_tenant_id
            (database enforces isolation)

Layer 5: API SECURITY (Input Validation, Signatures)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Webhook Validation:
    ├─► Every WhatsApp webhook has X-Signature header
    ├─► Server verifies: HMAC-SHA256(payload, secret)
    ├─► IF signature invalid → 401 + discard
    └─► Prevents webhook spoofing
  
  Input Validation:
    ├─► Every POST/PUT validates schema (JSON Schema)
    ├─► String length limits enforced
    ├─► Email format validated
    ├─► Phone number format validated
    ├─► Amount fields (price) are positive decimals
    └─► Dates are valid ISO8601
  
  API Key Security:
    ├─► API keys are 64-char random strings
    ├─► Stored hashed in DB (sha256)
    ├─► Hashed with salt + pepper
    ├─► Rotatable by user anytime
    └─► Can be scoped (read/write, specific resources)

Layer 6: DATABASE SECURITY (Encryption, Isolation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PostgreSQL:
    ├─► Encrypted in transit (SSL)
    ├─► Encrypted at rest (managed by DigitalOcean)
    ├─► Connection pooling (no direct access)
    ├─► Prepared statements (SQL injection proof)
    ├─► RLS policies enforce tenant isolation
    └─► Audit logging on sensitive tables
  
  Sensitive Data:
    ├─► Passwords: bcrypt (never plaintext)
    ├─► API keys: Encrypted + hashed
    ├─► Payment tokens: Delegated to Stripe (PCI-DSS)
    └─► PII: Encrypted at rest (future enhancement)

Layer 7: SESSION MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━
  Sessions stored in Redis:
    ├─► Key: session:{user_id}
    ├─► Value: {authenticated: true, last_activity: timestamp}
    ├─► TTL: 30 days with activity
    ├─► Inactivity: Auto logout after 14 days
    └─► Logout: Immediately delete from Redis
  
  CSRF Protection:
    ├─► SameSite=Strict on all cookies
    ├─► CSRF tokens for state-changing operations
    └─► Prevents cross-origin attacks

Layer 8: LOGGING & MONITORING (Audit Trail)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Security Events Logged:
    ├─► Login attempts (success & failure)
    ├─► Permission denied
    ├─► Data export requests
    ├─► Admin actions
    ├─► API key creation/deletion
    ├─► Webhook validation failures
    └─► Rate limit violations
  
  Log Retention:
    ├─► Critical: 90 days
    ├─► Warning: 30 days
    ├─► Info: 7 days
    └─► No PII in logs (redacted)
  
  Alerts:
    ├─► 5+ failed logins → Block account + email
    ├─► Rapid permission changes → Slack alert
    ├─► Unexpected API key creation → Investigation
    └─► 401/403 spike → Check for attack

Layer 9: DEPENDENCY SECURITY (Updates, Audit)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Dependencies:
    ├─► npm audit (automatic on every commit)
    ├─► Dependabot enabled (auto-update proposals)
    ├─► Snyk (vulnerability scanning)
    └─► Lock files (prevent supply chain attacks)
  
  Updates:
    ├─► Security patches: ASAP (same day)
    ├─► Minor updates: Weekly
    ├─► Major updates: Monthly review
    └─► Testing before deployment

Layer 10: INCIDENT RESPONSE
━━━━━━━━━━━━━━━━━━━━━━━━━
  IF security incident detected:
    ├─► 1. Alert on-call immediately
    ├─► 2. Isolate affected systems if needed
    ├─► 3. Preserve logs for investigation
    ├─► 4. Communicate to affected users
    ├─► 5. Fix vulnerability
    ├─► 6. Deploy hotfix
    ├─► 7. Post-mortem & preventive measures
    └─► 8. Update this document
```

---

Este documento complementa el ARQUITECTURA_MVP.md con visuales detalladas.
Referencia cruzada: Ver secciones 5-9 en el documento principal para explicaciones completas.
