# Canchas — Plataforma SaaS de Gestión para Complejos Deportivos
### Documento de Arquitectura y Producto (Fase 0 — antes de escribir código)

> **Nota de pivot (post-lanzamiento del MVP):** se descartó el plan gratuito permanente
> descripto en la sección 7. El modelo actual es **100% pago desde el día uno**, con un
> trial de 14 días como gancho de venta (no un "free forever"). Precios en pesos
> argentinos (ARS), tal como se ve en la landing y en `settings/billing`. La sección 7
> queda como referencia histórica de la lógica Free/Pro original — la lógica de qué
> features son "básicas" vs "premium" se mantuvo, solo cambió que ninguna es gratis para
> siempre. El nombre del producto también cambió de "¿Hay Cancha?" a **Canchas**, para
> no pisarse con un competidor real que ya opera con ese nombre en Colombia.

> Nombre de trabajo: **Canchas**. Cambialo cuando definas marca — lo uso solo como referencia interna en el código (schema, env vars, etc).

---

## 1. Filosofía de producto

Tres decisiones no negociables que van a condicionar todo el resto del diseño:

1. **El calendario es el producto.** Todo lo demás (torneos, pagos, clientes) orbita alrededor de la agenda. Si el dueño tarda más de 3 clics en crear una reserva, fallamos.
2. **Los deportes son datos, no código.** Nunca hardcodeamos "fútbol" o "pádel" en el schema. Un complejo crea sus propios deportes y configura reglas (duración de turno, cantidad de jugadores, si permite torneos, etc). Esto es lo que nos permite vender a cualquier disciplina sin tocar el producto.
3. **Free tiene que doler un poco, no mentir.** El plan gratuito debe ser 100% funcional para un complejo chico (1-2 canchas), pero cada vez que el negocio *crece* (más canchas, más reservas, quiere cobrar online, quiere WhatsApp) el techo del Free se vuelve visible de forma natural, no artificial. Ese es el motor de conversión.

---

## 2. Arquitectura multi-tenant

### 2.1 Estrategia elegida: **Shared Database, Shared Schema, con `tenantId` en cada tabla**

Para este caso (miles de PyMEs, no bancos ni salud) la estrategia correcta es **single database, row-level multi-tenancy**, no schema-per-tenant ni database-per-tenant. Razones:

- Costo operativo bajo con miles de tenants (un schema-per-tenant con 5.000 clientes es una pesadilla de migraciones).
- Prisma + Postgres con Row Level Security (RLS) nos da aislamiento fuerte sin la complejidad operativa.
- Permite features cross-tenant a futuro (marketplace de complejos, ranking nacional de jugadores) sin joins federados.

**Implementación concreta:**

- Cada tabla de negocio tiene `complexId` (FK a `Complex`, que es el tenant).
- **Postgres Row Level Security (RLS)** activado en todas las tablas tenant-scoped: una policy que compara `complexId` contra `current_setting('app.current_complex_id')`, seteado por el middleware en cada request. Esto es la red de seguridad final: aunque un desarrollador se olvide un `where complexId` en una query, la base de datos igual bloquea el acceso cruzado.
- A nivel aplicación, un **Prisma Client Extension** inyecta automáticamente `complexId` en todas las queries (findMany, create, update, delete) para que sea imposible "olvidarse" del filtro en el 99% de los casos. RLS cubre el 1% restante.
- Subdominio por complejo: `nombredelcomplejo.canchas.app` (Free) y dominio propio vía CNAME (Pro). El subdominio resuelve el `complexId` en middleware de Next.js antes de tocar cualquier route handler.

### 2.2 Por qué NO database-per-tenant (al menos en el MVP)

Vas a tener (con suerte) miles de complejos chicos, no 50 clientes enterprise. Database-per-tenant te mata en:
- Migraciones (correr una migración en 3.000 bases de datos).
- Costos de infraestructura (connection pooling explota).
- Analytics cross-tenant para vos como founder (necesitás saber cuántas reservas se hacen en toda la plataforma, no complejo por complejo).

Si en el futuro un cliente enterprise pide aislamiento físico total (bancos, gobierno), ahí se evalúa una excepción puntual, no la arquitectura por defecto.

---

## 3. Modelo de datos (Prisma schema — resumen conceptual)

```prisma
// ============ TENANT ============
model Complex {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique      // subdominio
  customDomain  String?  @unique       // solo PRO
  plan          Plan     @default(FREE)
  planStatus    PlanStatus @default(ACTIVE) // ACTIVE, PAST_DUE, CANCELED
  timezone      String   @default("America/Argentina/Buenos_Aires")
  logoUrl       String?
  primaryColor  String?
  createdAt     DateTime @default(now())

  sports        Sport[]
  courts        Court[]
  users         Membership[]
  customers     Customer[]
  bookings      Booking[]
  tournaments   Tournament[]
  branches      Branch[]         // multi sucursal (PRO)
  subscription  Subscription?
}

model Branch {                    // PRO: multi sucursal
  id          String  @id @default(cuid())
  complexId   String
  name        String
  address     String?
  courts      Court[]
}

// ============ DEPORTES CONFIGURABLES ============
model Sport {
  id                String   @id @default(cuid())
  complexId         String
  name              String              // "Pádel", "Fútbol 5", lo que sea
  icon              String?
  defaultSlotMinutes Int     @default(60)
  minPlayers        Int?
  maxPlayers        Int?
  allowsTournaments Boolean @default(true)
  courts            Court[]
}

model Court {
  id          String   @id @default(cuid())
  complexId   String
  branchId    String?
  sportId     String
  name        String              // "Cancha 1"
  isActive    Boolean @default(true)
  pricing     PricingRule[]
  bookings    Booking[]
}

model PricingRule {              // precio por franja horaria/día
  id          String   @id @default(cuid())
  courtId     String
  dayOfWeek   Int?               // 0-6, null = todos
  startTime   String             // "14:00"
  endTime     String             // "18:00"
  pricePerHour Decimal
}

// ============ USUARIOS Y PERMISOS ============
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  phone         String?
  passwordHash  String?
  memberships   Membership[]     // un user puede pertenecer a varios complejos (ej: empleado en 2 complejos)
}

model Membership {                // rol de un User dentro de un Complex
  id          String   @id @default(cuid())
  userId      String
  complexId   String
  role        Role                // OWNER, EMPLOYEE, SUPER_ADMIN
  permissions Json?               // overrides finos por empleado (PRO)
  @@unique([userId, complexId])
}

model Customer {                  // el "cliente final" que reserva, no tiene login propio necesariamente
  id          String   @id @default(cuid())
  complexId   String
  name        String
  phone       String
  email       String?
  isVip       Boolean @default(false)
  loyaltyPoints Int    @default(0)
  bookings    Booking[]
  createdAt   DateTime @default(now())
}

// ============ RESERVAS ============
model Booking {
  id            String   @id @default(cuid())
  complexId     String
  courtId       String
  customerId    String?
  createdById   String              // Membership que la creó (o null si la creó el cliente)
  startTime     DateTime
  endTime       DateTime
  status        BookingStatus       // PENDING, CONFIRMED, CANCELED, COMPLETED, NO_SHOW
  totalPrice    Decimal
  depositPaid   Decimal  @default(0)
  paymentMethod PaymentMethod?      // MERCADO_PAGO, TRANSFER, CASH
  notes         String?
  isRecurring   Boolean  @default(false)  // futuro: reservas fijas semanales
  createdAt     DateTime @default(now())
}

// ============ TORNEOS (PRO) ============
model Tournament {
  id          String   @id @default(cuid())
  complexId   String
  sportId     String
  name        String
  format      TournamentFormat  // SINGLE_ELIM, DOUBLE_ELIM, ROUND_ROBIN, GROUPS_KNOCKOUT, LEAGUE
  status      TournamentStatus  // DRAFT, REGISTRATION_OPEN, IN_PROGRESS, FINISHED
  registrationFee Decimal?
  publicSlug  String   @unique    // link público /t/{slug}
  coverImageUrl String?
  teams       TournamentTeam[]
  matches     Match[]
  sponsors    Sponsor[]
}

model TournamentTeam {
  id            String  @id @default(cuid())
  tournamentId  String
  name          String
  players       Json               // nombres/contactos, simple para MVP
  paidRegistration Boolean @default(false)
  seed          Int?
}

model Match {
  id            String   @id @default(cuid())
  tournamentId  String
  round         String              // "Cuartos de final", "Fecha 3", etc
  courtId       String?
  scheduledAt   DateTime?
  teamAId       String?
  teamBId       String?
  scoreA        Int?
  scoreB        Int?
  status        MatchStatus         // SCHEDULED, PLAYED, WALKOVER
  nextMatchId   String?             // para bracket de eliminación
}

model Sponsor {
  id            String  @id @default(cuid())
  tournamentId  String
  name          String
  logoUrl       String?
}

// ============ FACTURACIÓN SAAS (billing de complejos, no de canchas) ============
model Subscription {
  id                String   @id @default(cuid())
  complexId         String   @unique
  plan              Plan
  mercadoPagoId     String?
  currentPeriodEnd  DateTime?
  status            PlanStatus
}

enum Plan { FREE PRO }
enum PlanStatus { ACTIVE PAST_DUE CANCELED TRIALING }
enum Role { SUPER_ADMIN OWNER EMPLOYEE }
enum BookingStatus { PENDING CONFIRMED CANCELED COMPLETED NO_SHOW }
enum PaymentMethod { MERCADO_PAGO TRANSFER CASH }
enum TournamentFormat { SINGLE_ELIM DOUBLE_ELIM ROUND_ROBIN GROUPS_KNOCKOUT LEAGUE }
enum TournamentStatus { DRAFT REGISTRATION_OPEN IN_PROGRESS FINISHED }
enum MatchStatus { SCHEDULED PLAYED WALKOVER }
```

**Nota sobre `Customer` vs `User`:** son entidades separadas a propósito. `User` es alguien con login (dueño/empleado/super admin). `Customer` es el cliente final del complejo — en el MVP no necesita cuenta propia (lo carga el empleado o reserva por un link público). Esto simplifica muchísimo el MVP y deja la puerta abierta a la futura "app para jugadores" del roadmap de crecimiento, donde `Customer` podría vincularse opcionalmente a un `User`.

---

## 4. Sistema de permisos

### 4.1 Roles base

| Rol | Alcance | Descripción |
|---|---|---|
| **Super Admin** | Toda la plataforma | Sos vos / tu equipo. Panel interno para soporte, métricas globales de negocio, gestión de planes y facturación SaaS. No es un rol dentro de un complejo. |
| **Dueño (Owner)** | 1 Complex | Acceso total a su complejo: configuración, empleados, facturación, todos los módulos según su plan. |
| **Empleado (Employee)** | 1 Complex | Acceso operativo: calendario, reservas, clientes. En PRO, el dueño puede afinar permisos por empleado (ej: "puede cancelar reservas" sí/no, "ve reportes financieros" sí/no) usando el campo `permissions` (Json) de `Membership`. |
| **Cliente (Customer)** | Público / self-service | No tiene login en el MVP. Interactúa vía link público de reserva y link público de torneo. Fase 2: login liviano (magic link) para ver su historial. |

### 4.2 Implementación técnica

- Middleware de Next.js resuelve `complexId` (por subdominio) + sesión de NextAuth → arma un `context` con `{ user, membership, complexId }` disponible en todos los Server Actions / Route Handlers.
- Un helper `can(action, resource)` centralizado (tipo CASL o implementación propia liviana) evalúa: rol base + overrides de `permissions` Json. Nunca se chequean permisos "a mano" desintegrados por el código — todo pasa por este helper, testeable unitariamente.
- Gating de plan (Free/Pro) se resuelve en el mismo lugar: un helper `hasFeature(complexId, 'whatsapp')` consulta el plan actual. Esto permite que, si mañana agregás un plan intermedio, sea un cambio en un solo archivo de configuración de features por plan, no un rastrillaje por todo el código.

---

## 5. Estructura de carpetas (Next.js App Router)

```
courtos/
├─ apps/
│  └─ web/
│     ├─ app/
│     │  ├─ (marketing)/              # landing pública, pricing, blog
│     │  │  ├─ page.tsx
│     │  │  └─ pricing/page.tsx
│     │  ├─ (auth)/
│     │  │  ├─ login/page.tsx
│     │  │  ├─ register/page.tsx      # onboarding del complejo (<5 min)
│     │  │  └─ layout.tsx
│     │  ├─ (app)/                    # todo lo autenticado, dentro del subdominio del tenant
│     │  │  ├─ layout.tsx             # resuelve tenant + sesión + sidebar
│     │  │  ├─ calendar/page.tsx      # EL centro de la app
│     │  │  ├─ bookings/[id]/page.tsx
│     │  │  ├─ customers/page.tsx
│     │  │  ├─ courts/page.tsx
│     │  │  ├─ sports/page.tsx
│     │  │  ├─ tournaments/
│     │  │  │  ├─ page.tsx
│     │  │  │  ├─ [id]/page.tsx
│     │  │  │  └─ [id]/bracket/page.tsx
│     │  │  ├─ dashboard/page.tsx
│     │  │  ├─ employees/page.tsx     # PRO
│     │  │  ├─ branches/page.tsx      # PRO
│     │  │  ├─ marketing/             # cupones, happy hour, fidelización (PRO)
│     │  │  ├─ settings/
│     │  │  │  ├─ billing/page.tsx
│     │  │  │  ├─ branding/page.tsx
│     │  │  │  └─ integrations/page.tsx
│     │  ├─ (public)/                 # sin login, público
│     │  │  ├─ book/[complexSlug]/page.tsx     # reserva pública embebible
│     │  │  └─ t/[tournamentSlug]/page.tsx     # torneo público
│     │  ├─ (super-admin)/            # panel interno tuyo
│     │  │  └─ admin/page.tsx
│     │  └─ api/
│     │     ├─ webhooks/mercadopago/route.ts
│     │     ├─ webhooks/whatsapp/route.ts
│     │     └─ trpc/[trpc]/route.ts    # o route handlers REST simples
│     ├─ components/
│     │  ├─ ui/                       # shadcn/ui
│     │  ├─ calendar/                 # componente de calendario propio, reusable
│     │  ├─ tournaments/bracket/      # visualización de llaves
│     │  └─ shared/
│     ├─ lib/
│     │  ├─ auth.ts                   # NextAuth config
│     │  ├─ prisma.ts                 # client + extension multi-tenant
│     │  ├─ permissions.ts            # helper can() / hasFeature()
│     │  ├─ tenant.ts                 # resolución de subdominio
│     │  └─ payments/mercadopago.ts
│     ├─ server/
│     │  ├─ actions/                  # Server Actions por dominio (bookings, tournaments, ...)
│     │  └─ services/                 # lógica de negocio pura, testeable
│     └─ prisma/
│        ├─ schema.prisma
│        └─ seed.ts
├─ packages/                          # si escala a monorepo (Turborepo) para app móvil futura
│  └─ shared-types/
└─ ...
```

---

## 6. Mapa de pantallas (MVP)

1. **Landing + Pricing** (marketing, pública)
2. **Onboarding / Registro** — wizard de 3 pasos: datos del complejo → primer deporte + cancha → listo, ya podés recibir reservas. Objetivo: <5 minutos.
3. **Calendario** (home de la app autenticada) — vista día/semana/mes/agenda, drag & drop, crear reserva en 1 clic.
4. **Detalle de reserva** — modal, no página completa (velocidad).
5. **Clientes** — listado, ficha con historial/pagos/puntos.
6. **Canchas y deportes** — ABM.
7. **Dashboard** — ingresos, ocupación, gráficos.
8. **Torneos** (PRO) — listado, wizard de creación, bracket interactivo, vista pública.
9. **Configuración** — branding, facturación/plan, integraciones (WhatsApp/Mercado Pago), empleados (PRO), sucursales (PRO).
10. **Página pública de reserva** — embebible en el Instagram/Linktree del complejo.
11. **Página pública de torneo** — tabla de posiciones, bracket, resultados, sponsors.
12. **Panel Super Admin** (interno) — métricas de negocio, gestión de tenants, soporte.

---

## 7. Justificación Free vs Pro (por qué cada feature está donde está)

El criterio no es "lo barato en Free, lo caro en Pro" — es: **Free resuelve "no perder el control de mi agenda en papel/Excel". Pro resuelve "hacer crecer el negocio y automatizar lo que hoy hago a mano".**

| Feature | Plan | Por qué |
|---|---|---|
| Agenda completa, gestión de reservas/clientes | Free | Es el reemplazo del cuaderno/Excel. Si esto no es gratis y completo, nadie migra — es la puerta de entrada. |
| Hasta 2 canchas / 200 reservas | Free | Cubre exactamente al complejo más chico (1 dueño, pocas canchas). En cuanto el negocio crece a 3+ canchas o supera 200 reservas/mes, el límite se vuelve visible *justo cuando el dueño ya confía en el sistema* — ahí está el momento de conversión, no antes. |
| Mercado Pago | Pro | Cobrar online no es "administrar", es "generar ingresos nuevos" (menos ausentismo, cobro de seña anticipado). Es valor económico directo y medible → se paga fácil. |
| WhatsApp automático | Pro | Reduce drásticamente el tiempo del dueño respondiendo mensajes — es ahorro de tiempo cuantificable, el argumento de venta más fuerte en LatAm donde WhatsApp es el canal #1. |
| Multi sucursal / empleados ilimitados | Pro | Solo lo necesita un negocio que ya escaló — el que más puede pagar. |
| Torneos | Pro | Es un generador de marketing e ingresos extra para el complejo (inscripciones, sponsors), no una necesidad operativa diaria. Alto valor percibido, bajo uso diario → ideal para Pro. |
| Reportes avanzados / exportaciones / API | Pro | Lo usan negocios que ya piensan en gestión seria (contador, decisiones basadas en datos) — típicamente ya convertidos o a un paso de convertir. |
| Cupones / Happy Hour / fidelización | Pro | Son herramientas de *crecimiento* del complejo, no de administración básica — coherente con el framing "Free administra, Pro hace crecer". |
| Dominio personalizado / sin publicidad | Pro | Percepción de marca profesional — apela directamente al ego/status del dueño que ya factura bien. |

---

## 8. Mecanismos de conversión Free → Pro (sin arruinar el Free)

Regla de oro: **nunca degradamos ni ocultamos algo que el usuario Free ya tenía funcionando.** Los mecanismos son todos "hacia adelante":

1. **Límite visible, nunca sorpresivo.** Barra de progreso "180/200 reservas este mes" siempre visible en el dashboard Free — el dueño lo ve venir con semanas de anticipación, no se entera cuando ya lo bloqueó.
2. **Feature teasers, no muros ciegos.** Los botones de features Pro (WhatsApp, Mercado Pago, Torneos) están visibles y clickeables en Free, pero al clickear muestran una preview real de lo que hace + 1 click para upgrade. Mejor que ocultarlos: generan deseo con contexto, no frustración.
3. **Trial automático de 14 días en el primer torneo.** Si un dueño Free intenta crear un torneo, se le activa Pro por 14 días sin pedir tarjeta. Los torneos son el feature con mayor "wow" y mayor viralidad (se comparten públicamente) — es el mejor gancho de todo el producto.
4. **Momento de conversión atado a un evento de negocio, no a una fecha de calendario.** En vez de "tu prueba termina el día X", el upsell se dispara cuando: superás 80% del límite de reservas, agregás una 3ra cancha, o un cliente pregunta por WhatsApp/pago online 3 veces en una semana (detectable si integrás número de WhatsApp del complejo).
5. **Referidos entre complejos.** Un dueño Pro que refiere a otro complejo (muy común: dueños de canchas se conocen entre sí en la misma ciudad) obtiene un mes gratis. Este es el motor de crecimiento orgánico más importante en un nicho donde todos se conocen.
6. **Reducción de abandono (churn):** encuesta de 1 clic al cancelar ("¿por qué te vas?"), downgrade a Free en vez de cancelación total (perdés el pago pero no perdés el tenant ni sus datos — reactivación futura mucho más fácil que reconquistar un cliente que se fue del todo).

---

## 9. Oportunidades de crecimiento identificadas (más allá del roadmap que ya listaste)

- **Efecto de red por torneo público:** cada torneo genera una página pública compartida por decenas de jugadores → la mejor publicidad orgánica del producto la generan tus propios clientes sin que hagas nada.
- **Datos como producto:** con el tiempo, agregado (anónimo) de ocupación por ciudad/deporte/franja horaria es información valiosa para vender a marcas deportivas como sponsors de torneos dentro de la plataforma (ingreso adicional, no solo suscripción).
- **Marketplace de complejos** (ya lo tenías en el roadmap) se construye gratis si el modelo de datos ya es multi-tenant con perfiles públicos — no requiere rearquitecturar nada, solo exponer lo que ya existe.
- **Reservas recurrentes** (ya en tu roadmap) son también un anti-churn fortísimo para el complejo: un cliente con turno fijo semanal es el cliente más "pegajoso" del negocio del dueño, y por lo tanto lo que hace más difícil que el dueño se vaya de tu plataforma.

---

## 10. Roadmap de desarrollo propuesto (MVP por módulos)

**Fase 0 — Fundaciones (esta semana):** setup del monorepo, schema Prisma inicial, auth + resolución de tenant por subdominio, RLS en Postgres.

**Fase 1 — MVP usable (objetivo: un complejo real puede migrarse):**
1. Onboarding + configuración de deportes/canchas
2. Calendario (día/semana) + CRUD de reservas con drag & drop
3. Gestión de clientes básica
4. Dashboard básico
5. Página pública de reserva

**Fase 2 — Monetización:**
6. Billing SaaS (Free/Pro, Mercado Pago para cobrar la suscripción)
7. Mercado Pago dentro del complejo (cobro de señas/reservas)
8. WhatsApp automático

**Fase 3 — El diferenciador:**
9. Módulo de torneos completo (empezar por eliminación simple + fase de grupos, que cubren el 80% de los casos, y sumar el resto después)

**Fase 4 — Retención y crecimiento:**
10. Reportes avanzados, cupones/fidelización, multi sucursal, empleados con permisos finos, API pública.

---

¿Con qué módulo arrancamos a escribir código? Mi recomendación como founder: **Fase 0 + el Calendario (paso 2 de Fase 1)** — es el corazón del producto y el que más rápido te deja "sentir" si la UX es la correcta antes de invertir en todo lo demás.
