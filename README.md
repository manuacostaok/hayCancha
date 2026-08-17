# ¿Hay Cancha?

SaaS de gestión para complejos deportivos. Ver `docs/00-arquitectura-producto.md` para el diseño completo de producto y arquitectura.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma + **MongoDB** · NextAuth · Zod
Mercado Pago (Checkout Pro) · WhatsApp Cloud API

## Puesta en marcha (3 pasos)

```bash
npm install
```

Abrí `.env` (ya viene copiado de `.env.example`) y completá **solo 4 cosas**, todo lo demás ya está armado:

1. `DATABASE_URL` — connection string de Mongo Atlas (gratis en cloud.mongodb.com). Tiene que ser un cluster (no un standalone) porque Prisma usa `$transaction` en el onboarding, y eso requiere replica set — Atlas ya viene así por default.
2. `NEXTAUTH_SECRET` — cualquier string random (`openssl rand -base64 32`).
3. `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_PUBLIC_KEY` — credenciales de prueba desde tu panel de developers de Mercado Pago.
4. `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` — opcional para arrancar: si los dejás vacíos, el sistema no rompe, solo loguea en consola en vez de mandar el mensaje real.

Después:

```bash
npm run db:push     # crea las colecciones en tu Mongo
npm run db:seed     # carga el complejo demo "Cancha Central" con canchas, clientes y un torneo
npm run dev
```

Abrí **http://localhost:3000** → landing pública.
Abrí **http://localhost:3000/calendar** → ya te mete directo al complejo demo sembrado por el seed,
sin tener que configurar subdominios ni hosts a mano (ver el comentario en `middleware.ts`).
Para loguearte de verdad: `dueno@canchacentral.demo` / `demo1234`.

## Cómo probar cada pieza

- **Calendario**: tocá un horario libre → se crea la reserva de verdad en Mongo, y si configuraste WhatsApp, dispara la confirmación.
- **Mercado Pago**: `POST /api/payments` con `{ bookingId, title, amount }` te devuelve el link de pago (`init_point`). El webhook en `/api/webhooks/mercadopago` confirma la reserva sola cuando el pago se aprueba.
- **Torneos**: el seed ya carga "Copa Apertura" con 4 equipos. Entrá a Torneos → tocá el torneo → "Generar fixture" arma el bracket real de eliminación simple. Cargá resultados y el ganador avanza de ronda solo.

## Deploy
`vercel.json` ya está listo para Vercel (corre `prisma generate` antes del build). Conectá el repo,
cargá las mismas variables de entorno del `.env`, y listo — no lo pude ejecutar yo porque este
entorno de trabajo no tiene salida a internet, así que el último paso (`vercel deploy` o conectar
el repo desde el dashboard) te queda a vos.

## Pendiente para robustecer multi-tenant
Al migrar a MongoDB perdimos la capa de Row Level Security que tiene Postgres. El aislamiento
por tenant hoy vive enteramente en `lib/prisma.ts` (`tenantPrisma()`, que inyecta `complexId` en
cada query) y en el guard de sesión de `(app)/layout.tsx`. Es una arquitectura válida para el
volumen que estás manejando, pero tenelo presente si más adelante sumás gente al equipo de dev:
toda query nueva a un modelo tenant-scoped tiene que pasar por `tenantPrisma()`, nunca por
`basePrisma` directo.

## Mobile
No hay apps nativas todavía (roadmap futuro). Todo el frontend es responsive mobile-first:
calendario con agenda de un día + bottom nav estilo app en mobile, grilla semanal en desktop.
