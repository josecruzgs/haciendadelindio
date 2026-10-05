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

## Reserva automática

Con la opción activada en `/admin/ajustes` → **Reserva automática**, Stripe configurado y habitaciones dadas de alta
en Recepción, el sitio ya no espera confirmación manual:

1. El calendario público tacha las noches en que no queda ninguna habitación de ese tipo (además de los bloqueos).
2. Al tocar **Reservar y pagar** el servidor revisa la disponibilidad real; si hay lugar guarda la reservación como
   **Esperando pago**, asigna habitación, aparta el lugar por los minutos configurados (60 por defecto) y manda al
   huésped directo a Stripe Checkout. Si dos huéspedes reservan la última habitación al mismo tiempo, gana el primero.
3. Al pagar se confirma sola (webhook de Stripe). Si no paga a tiempo, el apartado vence: se cancela, se libera la
   habitación y la liga deja de funcionar (la sesión de Stripe vence al mismo tiempo). Los apartados vencidos se
   liberan solos al consultar disponibilidad, al reservar, al abrir la liga de pago o al abrir el panel.
5. La liga de pago (`/pagar/<token>`) sirve también para enviarla por WhatsApp desde el detalle si el huésped no
   terminó de pagar («Reenviar liga de pago»).
4. Los tipos sin habitaciones dadas de alta (o con la opción apagada) siguen el flujo manual de abajo.

## Cómo funcionan las reservaciones (flujo manual)

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
   (pago total, un porcentaje o un monto fijo; con la promo aplicada si califica) se define en **`/admin/ajustes`**;
   el saldo se paga en recepción.
4. Cada reservación tiene botones de **Responder por WhatsApp** con mensajes prellenados (recordatorio de pago,
   confirmación, datos de llegada…). Los textos se editan y se agregan en `/admin/ajustes` con variables como
   `{nombre}`, `{folio}`, `{anticipo}` o `{liga}`.
5. **Cancelar** solo se hace a petición del cliente, desde el detalle: invalida la liga de pago, permite
   reembolsar por Stripe el total, una parte o nada (y reembolsar después), y abre WhatsApp con el mensaje de
   cancelación. Los reembolsos hechos directo en el Dashboard de Stripe se sincronizan por webhook.
6. Los **precios** (habitaciones, desayuno y persona adicional) y la **promoción por pago anticipado** se editan en
   `/admin/ajustes`: activarla o no, noches mínimas y descuento (precio promo por habitación o % sobre la tarifa).
   La promo se cobra al pagar en línea con la liga de Stripe; el sitio y las cotizaciones usan siempre lo vigente. El panel se abre desde el link «Interno» del footer.
7. Recepción puede además confirmar sin pago en línea (p. ej. pagó en recepción), marcar como **completada** y
   agregar notas internas.
8. En `/admin/ajustes` → **Base de datos** se ve el espacio usado y se pueden eliminar reservaciones con salida de
   hace más de N meses (3 por defecto), con respaldo CSV previo, o activar la limpieza automática (una vez al día).
9. En `/admin/disponibilidad` se bloquean noches (todas las habitaciones o un tipo); el calendario público las
   muestra tachadas y el servidor rechaza solicitudes en esas fechas.

## Recepción (control de habitaciones)

1. **Habitaciones del hotel** (`/admin/recepcion/habitaciones`): se dan de alta los números y su tipo (sencilla,
   doble, triple), por rango (`1-10`) o sueltos (`12, 14, 20A`). Una habitación con historial no se borra: se da de baja.
2. **Recepción** (`/admin/recepcion`, vista por día): rack con el estado de cada habitación (ocupada, sale, llega,
   reservada, libre) y su limpieza (limpia, sucia, mantenimiento), más las llegadas y salidas pendientes del día
   (incluye llegadas atrasadas y salidas vencidas). Con las flechas o el selector se ve cualquier otro día.
3. **Calendario** (`/admin/calendario`, vista por mes): habitaciones × días con cada estancia como barra (color por
   estado) y el total de ocupadas por noche. Las reservaciones sin habitación aparecen como «Sin asignar» en su tipo.
4. **Asignar habitación**: en el detalle de la reservación → tarjeta «Recepción»; solo se ofrecen las habitaciones
   libres de ese tipo para esas fechas (el servidor también lo valida para que no se encimen).
5. **Entrada (check-in)**: con la(s) habitación(es) asignada(s) y la fecha de entrada ya llegada, la reservación pasa
   a **Hospedado**. Los datos de registro (identificación, procedencia, correo, vehículo/placas) se capturan ahí.
6. **Llegada sin reservación (walk-in)**: botón «Llegada sin reservación» o «Registrar llegada» en una habitación
   libre del rack; se elige la habitación, se capturan los datos y el pago recibido, y queda hospedado al guardar.
7. **Pagos en recepción** (efectivo, tarjeta, transferencia) se registran en el detalle y se descuentan del saldo.
8. **Salida (check-out)**: pide saldar la cuenta (o confirmar la salida con saldo pendiente); la reservación pasa a
   **Completada** y la habitación a «sucia». Se puede deshacer si se registró por error.

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
