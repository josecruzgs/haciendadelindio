# Hacienda del Indio Hotel

Sitio en Next.js 15 (App Router + Tailwind) con sistema de reservación y panel de administración.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completa las variables (ver abajo)
npm run dev                  # http://localhost:3000
```

- Sitio público: `/`, `/habitaciones`, `/menu`, `/reservar`
- Panel: `/admin` (usuario y contraseña definidos en las variables de entorno)

## Variables de entorno

| Variable | Descripción |
|---|---|
| `ADMIN_USER` | Usuario del panel |
| `ADMIN_PASSWORD_HASH` | Hash de la contraseña. Genéralo con `npm run hash-password -- "<contraseña>"` |
| `SESSION_SECRET` | Cadena aleatoria de 32+ caracteres (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`) |
| `DATABASE_URL` | Postgres (Neon, Supabase, Vercel Postgres…). **Obligatoria en Vercel.** |
| `PGLITE_DIR` | Opcional. Sin `DATABASE_URL` se usa PGlite (Postgres embebido) en `./.data/pglite` |
| `STRIPE_SECRET_KEY` | Llave secreta de Stripe (`sk_test_…` / `sk_live_…`) para cobrar en línea |
| `STRIPE_WEBHOOK_SECRET` | Secreto (`whsec_…`) del webhook `https://<dominio>/api/stripe/webhook` |
| `SITE_URL` | Dominio público para las ligas de pago, p. ej. `https://www.haciendadelindiohotel.com` |

Las tablas se crean solas en la primera conexión.

## Cómo funcionan las reservaciones

1. El huésped llena el widget (puede **agregar desayuno** eligiendo en un popup cuántos desayunos por día, de 1 al
   número de huéspedes) y elige:
   - **Reservar ahora**: se guarda como **pendiente** con un folio (`HDI-00001`) y el huésped ve «Tu reservación
     está en proceso»: cuando recepción confirme la disponibilidad le llegará un link de pago por WhatsApp.
   - **Por WhatsApp**: se guarda igual y además se abre WhatsApp con el mensaje y el folio.
   - **Llamar**: marca al teléfono del hotel.
2. En `/admin` → detalle de la reservación, recepción revisa la disponibilidad:
   - **Hay disponibilidad · Confirmar y enviar liga de pago**: la reservación pasa a **Esperando pago**, se genera
     la liga `/pagar/<token>` y se abre WhatsApp con el mensaje listo para el huésped (también se puede copiar).
   - **Sin disponibilidad · Ofrecer otras opciones**: abre WhatsApp con un mensaje para proponer otras fechas o
     habitaciones.
3. El huésped abre la liga, revisa su estancia y paga con **Stripe Checkout**. Al pagar, la reservación pasa
   sola a **Confirmada** (vía webhook y también al regresar a la página de pago). Cuánto se cobra en línea
   (pago total, un porcentaje o un monto fijo, y si aplica la tarifa promo) se define en **`/admin/ajustes`**;
   el saldo se paga en recepción.
4. Cada reservación tiene botones de **Responder por WhatsApp** con mensajes prellenados (recordatorio de pago,
   confirmación, datos de llegada…). Los textos se editan y se agregan en `/admin/ajustes` con variables como
   `{nombre}`, `{folio}`, `{anticipo}` o `{liga}`.
5. **Cancelar** solo se hace a petición del cliente, desde el detalle: invalida la liga de pago, permite
   reembolsar por Stripe el total, una parte o nada (y reembolsar después), y abre WhatsApp con el mensaje de
   cancelación. Los reembolsos hechos directo en el Dashboard de Stripe se sincronizan por webhook.
6. Recepción puede además confirmar sin pago en línea (p. ej. pagó en recepción), marcar como **completada** y
   agregar notas internas.
7. En `/admin/disponibilidad` se bloquean noches (todas las habitaciones o un tipo); el calendario público las
   muestra tachadas y el servidor rechaza solicitudes en esas fechas.

### Configurar Stripe

1. En el Dashboard de Stripe → Developers → API keys copia la llave secreta en `STRIPE_SECRET_KEY`.
2. En Developers → Webhooks agrega el endpoint `https://<dominio>/api/stripe/webhook` con los eventos
   `checkout.session.completed`, `checkout.session.async_payment_succeeded` y `charge.refunded`; copia el «Signing secret» en
   `STRIPE_WEBHOOK_SECRET`.
3. Pruebas locales: `stripe listen --forward-to localhost:3000/api/stripe/webhook` y la tarjeta `4242 4242 4242 4242`.

## Despliegue

- **Vercel:** configura las variables anteriores, incluida `DATABASE_URL` (el disco de Vercel no es persistente).
- **Servidor propio / VPS:** `npm run build && npm start`. Puede usar PGlite sin `DATABASE_URL` si la carpeta
  `.data/` (o `PGLITE_DIR`) está en un disco persistente y con respaldo.
