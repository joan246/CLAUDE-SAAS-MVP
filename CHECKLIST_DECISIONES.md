# ✅ CHECKLIST DE DECISIONES ARQUITECTÓNICAS

**Documento de referencia rápida para decisiones clave**

---

## 🎯 RUNTIME & FRAMEWORK

```
┌─ BACKEND RUNTIME
│  ├─ ✅ SELECCIONADO: Node.js 20 LTS
│  ├─ Framework: Fastify 5.0
│  ├─ Lenguaje: TypeScript strict mode
│  └─ Package manager: pnpm
│
├─ ALTERNATIVAS EVALUADAS:
│  ├─ ❌ Go (Rechazado: curva aprendizaje, 60 días es tight)
│  ├─ ❌ Python/FastAPI (Rechazado: concurrencia débil)
│  └─ ❌ Java (Rechazado: heavy para MVP)
│
├─ JUSTIFICACIÓN:
│  ├─ ✓ JSON nativo (WhatsApp/IG APIs)
│  ├─ ✓ Async/await excelente
│  ├─ ✓ Escalable horizontalmente
│  ├─ ✓ Rápido de desarrollar
│  └─ ✓ Equipo lo domina
└─ RIESGO: BAJO
```

---

## 💾 BASE DE DATOS PRIMARIA

```
┌─ SELECCIONADO: PostgreSQL 16
│  ├─ Multi-tenant: Row-Level Security (RLS)
│  ├─ Transacciones: ACID garantizado
│  ├─ Relaciones: Foreign keys + constraints
│  └─ Features: JSON, Full-text search, Extensions
│
├─ ALTERNATIVAS EVALUADAS:
│  ├─ ❌ MongoDB
│  │  ├─ Razón: Transacciones débiles en multi-tenant
│  │  └─ Impacto: Data inconsistency risk
│  │
│  ├─ ❌ MySQL
│  │  ├─ Razón: PostgreSQL superior en todo aspecto
│  │  └─ Impacto: No es reemplazo 1:1
│  │
│  ├─ ❌ DynamoDB
│  │  ├─ Razón: Vendor lock-in, caro en MVP
│  │  └─ Impacto: Escala pobre bajo 10K usuarios
│  │
│  └─ ❌ SQLite
│     ├─ Razón: No escala a multi-tenant
│     └─ Impacto: Necesitarías migraciones futuras
│
├─ CONFIGURACIÓN MVP:
│  ├─ Instance: t3.small (2GB RAM, 40GB storage)
│  ├─ Backups: 2x diarios automáticos
│  ├─ WAL archiving: Continuous to S3
│  ├─ Punto-in-time recovery: 30 días
│  └─ Costo: $15/mes (DigitalOcean managed)
│
└─ RIESGO: BAJO (RLS testeado, backups redundantes)
```

---

## ⚡ CACHE & SESSION STORE

```
┌─ SELECCIONADO: Redis 7.0+
│  ├─ Uso 1: Sessions (JWT invalidation)
│  ├─ Uso 2: Rate limiting
│  ├─ Uso 3: Message queue (Redis Streams)
│  ├─ Uso 4: Hot data caching
│  └─ Uso 5: Distributed locks
│
├─ TTL STRATEGY:
│  ├─ Sessions: 7 días (con refresh)
│  ├─ Business config cache: 1 hora
│  ├─ Availability slots: 5 minutos
│  ├─ Rate limit buckets: 60 segundos
│  └─ Message queue: Indefinido (manual cleanup)
│
├─ ALTERNATIVAS EVALUADAS:
│  ├─ ❌ Memcached
│  │  ├─ Razón: No tiene Redis Streams
│  │  └─ Impacto: Necesitarías message broker separado
│  │
│  └─ ❌ ElastiCache AWS
│     ├─ Razón: Más caro, vendor lock-in
│     └─ Impacto: Migración difícil a otro provider
│
├─ CONFIGURACIÓN MVP:
│  ├─ Instance: 256MB (escalable a 1GB)
│  ├─ Persistencia: RDB (snapshots)
│  ├─ Replicación: No (Fase 2+)
│  └─ Costo: $15/mes (DigitalOcean managed)
│
└─ RIESGO: BAJO (cache es nice-to-have, no critical)
```

---

## 🔄 MESSAGE QUEUE & ASYNC JOBS

```
┌─ SELECCIONADO: Redis Streams (MVP)
│  ├─ Throughput: 10K msgs/min (suficiente)
│  ├─ Latencia: < 10ms (vs 200ms RabbitMQ)
│  ├─ Complejidad: Simple
│  └─ Operacional: Una infraestructura (Redis)
│
├─ UPGRADE A: RabbitMQ (cuando)
│  ├─ Necesites garantías transaccionales complejas
│  ├─ > 1M events/día
│  ├─ Plugins específicos (routing avanzado)
│  └─ Estimado: Mes 4-6 si justificado
│
├─ ALTERNATIVAS EVALUADAS:
│  ├─ ❌ AWS SQS
│  │  ├─ Razón: Latencia alta (200ms+)
│  │  ├─ Costo: Escala pobre < 100K msgs/día
│  │  └─ Impacto: Webhook timeouts
│  │
│  └─ ❌ Apache Kafka
│     ├─ Razón: Overkill para MVP
│     ├─ Operacional: Complejo (cluster management)
│     └─ Impacto: DevOps overhead
│
├─ PATRÓN IMPLEMENTATION:
│  ├─ Producer: Webhook handler enqueues immediately
│  ├─ Consumer: Background job processes async
│  ├─ Retry: Exponential backoff (1s, 2s, 4s, 8s, 16s)
│  ├─ DLQ: Dead Letter Queue para failed jobs
│  └─ Idempotency: Deduplication keys por message_id
│
└─ RIESGO: BAJO (patterns proven, fallback manual exists)
```

---

## 🔍 SEARCH & ANALYTICS

```
┌─ MVP (MONTHS 0-3):
│  └─ PostgreSQL full-text search
│     ├─ Suficiente para < 100K conversations
│     ├─ Queries < 500ms
│     └─ Costo: $0 (incluido en DB)
│
├─ FASE 2 (MONTH 4+):
│  └─ Elasticsearch (si > 100K conversations/mes)
│     ├─ Real-time search
│     ├─ Advanced aggregations
│     ├─ Analytics dashboard
│     └─ Costo: $500+/mes
│
├─ ALTERNATIVAS EVALUADAS:
│  ├─ ❌ Algolia
│  │  ├─ Razón: Caro para MVP (>$100/mes)
│  │  └─ Impacto: Vendor lock-in
│  │
│  ├─ ❌ Meilisearch
│  │  ├─ Razón: Overkill, menos maturo
│  │  └─ Impacto: Not production-ready yet
│  │
│  └─ ❌ AWS CloudSearch
│     ├─ Razón: Complejidad, setup time
│     └─ Impacto: Distrae en MVP
│
├─ DECISION TREE:
│  ├─ PostgreSQL FTS hasta Mes 4
│  ├─ Measure: Conversation query latency
│  ├─ IF P95 > 1 second → Plan Elasticsearch
│  └─ IF P95 < 500ms → Stay with PostgreSQL
│
└─ RIESGO: BAJO (fácil upgrade cuando necesario)
```

---

## 🏢 MULTI-TENANCY

```
┌─ MVP STRATEGY: Shared Database + Row-Level Security
│  ├─ Schema:
│  │  ├─ 1 PostgreSQL database
│  │  ├─ RLS policies enforce tenant_id isolation
│  │  ├─ Each query auto-filtered by context
│  │  └─ No data leakage possible (DB-level)
│  │
│  ├─ Implementación:
│  │  ├─ SET app.current_tenant_id in middleware
│  │  ├─ RLS policy checks current_setting()
│  │  ├─ Test: Try to query another tenant's data → Blocked
│  │  └─ Performance: Minimal (1 WHERE clause)
│  │
│  ├─ Ventajas:
│  │  ├─ ✓ Operacionalmente simple (1 DB)
│  │  ├─ ✓ Bajo costo ($15/mes)
│  │  ├─ ✓ Fácil para < 5K tenants
│  │  └─ ✓ Escalable hasta ~10K tenants
│  │
│  └─ Limitaciones:
│     ├─ Performance degrada con muchas tables/indexes
│     ├─ Backup/restore es "all-or-nothing"
│     ├─ No isolation a nivel infraestructura
│     └─ Compliance strict (HIPAA) requiere DB separada
│
├─ PHASE 2+ STRATEGY: Database-per-Tenant (si necesario)
│  ├─ Cuando: Mes 4-6, si clientes enterprise demandan
│  ├─ Setup:
│  │  ├─ Shared metadata DB (tenants, subscriptions)
│  │  ├─ N databases (1 per tenant)
│  │  ├─ Router: tenant_id → connection string
│  │  └─ Migraciones per-tenant
│  │
│  ├─ Ventajas:
│  │  ├─ ✓ Máximo aislamiento (security)
│  │  ├─ ✓ Mejor performance (no contención)
│  │  ├─ ✓ Fácil per-tenant backups
│  │  └─ ✓ HIPAA-ready
│  │
│  └─ Desventajas:
│     ├─ ✗ Overhead operacional (N databases)
│     ├─ ✗ Migraciones más complejas
│     ├─ ✗ Costo escalado (×N)
│     └─ ✗ Connection pooling trickier
│
├─ ALTERNATIVAS EVALUADAS:
│  ├─ ❌ Separate app instance per tenant
│  │  ├─ Razón: Escalada operacional (N apps, N DBs)
│  │  └─ Impacto: DevOps nightmare
│  │
│  └─ ❌ Row-level filtering in app (no RLS)
│     ├─ Razón: Error-prone, security risk
│     └─ Impacto: Data leaks when bug introduced
│
└─ RIESGO: BAJO (RLS testeado, upgrade path clear)
```

---

## ☁️ HOSTING & DEPLOYMENT

```
┌─ SELECCIONADO: DigitalOcean App Platform
│  ├─ Deployment: Push code to Git → auto deploy
│  ├─ Scaling: Manual or auto (1-10 containers)
│  ├─ Services:
│  │  ├─ PostgreSQL managed (automated backups)
│  │  ├─ Redis managed (automated persistence)
│  │  ├─ Load balancer (SSL/HTTPS automatic)
│  │  └─ Container registry (ECR alternative)
│  │
│  ├─ Costo:
│  │  ├─ 2x containers @ $10 = $20/mes
│  │  ├─ PostgreSQL @ $15/mes
│  │  ├─ Redis @ $15/mes
│  │  └─ Total: $50/mes
│  │
│  └─ Ventajas:
│     ├─ ✓ Simple (no Kubernetes)
│     ├─ ✓ Costo predecible
│     ├─ ✓ Managed services (less ops)
│     ├─ ✓ Good documentation
│     └─ ✓ Easy multi-region (future)
│
├─ ALTERNATIVA 1: AWS (si compliance required)
│  ├─ ECS Fargate (serverless containers)
│  ├─ RDS PostgreSQL Multi-AZ
│  ├─ ElastiCache Redis
│  ├─ ALB (load balancer)
│  ├─ CloudFront CDN
│  │
│  ├─ Costo:
│  │  ├─ ECS Fargate: ~$100/mes
│  │  ├─ RDS: ~$50/mes (t3.micro)
│  │  ├─ ElastiCache: ~$30/mes
│  │  ├─ ALB: ~$20/mes
│  │  └─ Total: ~$200/mes
│  │
│  └─ Cuándo: Si HIPAA/PCI compliance needed
│
├─ ALTERNATIVA 2: Vercel + Railway (fullstack)
│  ├─ Vercel: Frontend (free tier viable)
│  ├─ Railway: Backend + PostgreSQL + Redis
│  ├─ Costo: $20-40/mes
│  ├─ Ventaja: Barato, simple
│  └─ Limitación: Menos control, menor escala
│
├─ INFRASTRUCTURE PRINCIPLES:
│  ├─ NO Kubernetes in MVP (overhead)
│  ├─ Managed services (reduce ops burden)
│  ├─ Auto-scaling configured
│  ├─ Health checks on every container
│  ├─ Automated backups (2x daily)
│  └─ Multi-AZ (future, when critical)
│
└─ RIESGO: BAJO (proven platform, easy to migrate)
```

---

## 🌐 FRONTEND FRAMEWORK

```
┌─ SELECCIONADO: React 18 + TypeScript
│  ├─ Build tool: Vite (x10 faster than CRA)
│  ├─ Styling: Tailwind CSS
│  ├─ Components: Shadcn/ui (headless)
│  ├─ State: React Query (server state)
│  ├─ Routing: React Router v6
│  ├─ Forms: React Hook Form + Zod
│  └─ Hosting: Vercel (auto-deploy from Git)
│
├─ ALTERNATIVAS EVALUADAS:
│  ├─ ❌ Vue 3
│  │  ├─ Razón: Igual viable, pero team prefiere React
│  │  └─ Impacto: Curva aprendizaje extra
│  │
│  ├─ ❌ Svelte
│  │  ├─ Razón: Menos job market, bibliotecas
│  │  └─ Impacto: Hiring difficultly future
│  │
│  └─ ❌ Angular
│     ├─ Razón: Heavy, overkill for MVP
│     └─ Impacto: Slower development
│
├─ MOBILE: React Native (NOT MVP)
│  ├─ Timeline: Start Week 9-12
│  ├─ Framework: React Native + Expo
│  ├─ OR: Flutter (if new project)
│  └─ MVP justificación: Web responsive en tablets
│
├─ PERFORMANCE TARGETS:
│  ├─ Lighthouse score: > 80
│  ├─ Time to Interactive: < 2s
│  ├─ Bundle size: < 200KB (gzipped)
│  └─ Monitor: Vercel Analytics
│
└─ RIESGO: BAJO (stable frameworks, large community)
```

---

## 🔐 SECURITY DECISIONS

```
┌─ AUTHENTICATION
│  ├─ ✅ JWT (RS256, asymmetric)
│  ├─ Token lifetime: 1 hour (short-lived)
│  ├─ Refresh token: 7 days (stored httpOnly)
│  ├─ Password hash: bcrypt (rounds: 12)
│  ├─ 2FA: TOTP for admins (future)
│  └─ Session: Redis + invalidation support
│
├─ AUTHORIZATION
│  ├─ RBAC: admin, manager, user roles
│  ├─ RLS: PostgreSQL row-level security
│  ├─ Endpoint-level: Middleware checks
│  └─ Scoped API keys: Per resource, read/write
│
├─ TRANSPORT
│  ├─ HTTPS/TLS 1.3: Enforced
│  ├─ HSTS: 1 year max-age
│  ├─ Certificate pinning: Mobile app only
│  └─ Secrets: .env vars, NOT in code
│
├─ API SECURITY
│  ├─ Webhook signing: HMAC-SHA256
│  ├─ Rate limiting: 100 req/min per IP
│  ├─ Input validation: JSON Schema
│  ├─ CORS: Whitelist specific origins
│  └─ CSRF: SameSite=Strict cookies
│
├─ DATABASE
│  ├─ Prepared statements: Prevents SQL injection
│  ├─ RLS policies: Multi-tenant isolation
│  ├─ Encryption: In transit (SSL) + at rest
│  ├─ Audit logging: Sensitive operations
│  └─ NO PII in logs: Redacted
│
├─ MONITORING
│  ├─ Sentry: Exception tracking
│  ├─ Structured logging: JSON format
│  ├─ Alerts: Slack #alerts-prod
│  ├─ Failed login tracking: Block after 5 attempts
│  └─ Unusual activity: Automated alerts
│
├─ INFRASTRUCTURE
│  ├─ CloudFlare DDoS protection: Free tier
│  ├─ WAF rules: Moderate
│  ├─ IP whitelisting: For webhooks (WhatsApp IPs)
│  └─ VPN: For database access (private network)
│
└─ RIESGO: BAJO (security by design, not afterthought)
```

---

## 📊 MONITORING & OBSERVABILITY

```
┌─ LOGGING
│  ├─ Format: Structured JSON
│  ├─ Levels: DEBUG, INFO, WARN, ERROR
│  ├─ Transport: CloudFlare or AWS CloudWatch
│  ├─ Retention: 7-90 days depending on level
│  └─ PII: Redacted before logging
│
├─ METRICS
│  ├─ System: CPU, Memory, Disk, Network
│  ├─ Application: Request rate, latency, errors
│  ├─ Database: Connections, query time, slow logs
│  ├─ Redis: Memory usage, ops/sec, evictions
│  └─ Webhook: Success rate, latency
│
├─ TRACING
│  ├─ MVP: Disabled (added complexity)
│  ├─ Future (Fase 2): Jaeger or Tempo
│  └─ Purpose: Trace request across services
│
├─ ALERTING
│  ├─ Critical errors: Immediate Slack notification
│  ├─ High latency (P95 > 500ms): Slack alert
│  ├─ Error rate > 1%: Slack alert
│  ├─ Database connections > 90%: Slack alert
│  └─ Uptime drop below 99.5%: Page on-call
│
├─ UPTIME MONITORING
│  ├─ Tool: Checkly
│  ├─ Endpoints checked:
│  │  ├─ GET /health
│  │  ├─ GET /api/appointments (auth)
│  │  └─ POST /webhook (simulation)
│  ├─ Interval: Every 1 minute
│  ├─ Locations: 5 global regions
│  └─ Costo: $20/mes
│
└─ RIESGO: LOW (monitoring from day 1, not afterthought)
```

---

## 🔄 CI/CD PIPELINE

```
┌─ TRIGGER: Push to any branch
│  │
│  ├─ Stage 1: LINT (3 min)
│  │  ├─ ESLint + Prettier
│  │  ├─ TypeScript type check
│  │  └─ Fail if errors
│  │
│  ├─ Stage 2: TEST (5 min)
│  │  ├─ Unit tests (Jest)
│  │  ├─ Integration tests (test DB)
│  │  ├─ Coverage check (min 70%)
│  │  └─ Fail if coverage drops
│  │
│  ├─ Stage 3: SECURITY (3 min)
│  │  ├─ npm audit
│  │  ├─ Snyk vulnerability scan
│  │  └─ Fail if high-severity found
│  │
│  ├─ Stage 4: BUILD (8 min)
│  │  ├─ Compile TypeScript
│  │  ├─ Build React bundle
│  │  ├─ Create Docker images
│  │  └─ Push to container registry
│  │
│  ├─ Stage 5: DEPLOY TO STAGING (2 min)
│  │  ├─ Deploy to staging environment
│  │  ├─ Run smoke tests
│  │  └─ Notify team
│  │
│  └─ Stage 6: MANUAL APPROVAL
│     ├─ Human review required
│     ├─ Approve → Deploy to prod
│     └─ Reject → Stop
│
├─ BRANCH STRATEGIES:
│  ├─ main: Protected, PR required
│  ├─ develop: Integration branch
│  ├─ feature/*: Feature branches
│  └─ hotfix/*: Urgent production fixes
│
├─ DEPLOYMENT STRATEGY:
│  ├─ Blue-green: Zero downtime deploys
│  ├─ Canary (future): Gradual rollout
│  ├─ Rollback: 1-click revert if needed
│  └─ Database migrations: Before app deployment
│
└─ RIESGO: BAJO (automated, reduces human error)
```

---

## 🎯 SUCCESS CRITERIA BY PHASE

```
┌─ MVP (Weeks 1-4)
│  ├─ ✓ Zero data corruption (RLS working)
│  ├─ ✓ < 1 second latency (P95)
│  ├─ ✓ 100+ test coverage (business logic)
│  ├─ ✓ 99% webhook success rate
│  └─ ✓ Database RLS audit passed
│
├─ STABLE (Weeks 5-8)
│  ├─ ✓ 99.5% uptime (24x7 monitoring)
│  ├─ ✓ 1000+ requests/min sustained
│  ├─ ✓ < 0.1% message loss
│  ├─ ✓ 1K+ negocios onboarded
│  └─ ✓ Pending security audit completed
│
├─ SCALE (Weeks 9-12)
│  ├─ ✓ 5K+ negocios
│  ├─ ✓ < 200ms P95 latency
│  ├─ ✓ Advanced NLU functional
│  ├─ ✓ Custom rules engine working
│  └─ ✓ Mobile app MVP launched
│
└─ ENTERPRISE (Months 4-12)
   ├─ ✓ 50K+ negocios
   ├─ ✓ $100K MRR achieved
   ├─ ✓ Database-per-tenant (select clients)
   ├─ ✓ Multi-region deployment
   └─ ✓ HIPAA/SOC2 compliance ready
```

---

## 📋 APPROVAL CHECKLIST

**This document represents CTO architectural decisions. Approve:**

- [ ] **Backend:** Node.js + TypeScript + Fastify
- [ ] **Database:** PostgreSQL 16 + RLS multi-tenancy
- [ ] **Cache:** Redis Streams for queue
- [ ] **Frontend:** React 18 + Vite + Tailwind
- [ ] **Hosting:** DigitalOcean App Platform
- [ ] **Timeline:** 60 days realistic
- [ ] **Security:** Meets MVP requirements
- [ ] **Scalability:** 100K+ negocios viable
- [ ] **Cost:** $50-100/mo MVP, $2K+ at scale
- [ ] **Team:** Ready to execute

**Approved by:** _________________________

**Date:** _________________________

**Next review:** End of Sprint 2 (Week 4)

---

**Document Version:** 1.0 MVP  
**Last Updated:** June 2026  
**Maintained by:** CTO
