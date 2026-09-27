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

Las tablas se crean solas en la primera conexión.

## Cómo funcionan las reservaciones

1. El huésped llena el widget y elige:
   - **Reservar ahora**: la reservación se guarda como **pendiente** con un folio (`HDI-00001`) y se confirma en
     pantalla. Recepción contacta al huésped para confirmar (en el panel aparece como «Reserva directa»).
   - **Por WhatsApp**: se guarda igual y además se abre WhatsApp con el mensaje y el folio. Si la base de datos
     fallara, el mensaje de WhatsApp se envía de todos modos.
   - **Llamar**: marca al teléfono del hotel.
2. No hay pago en línea; la disponibilidad la confirma recepción.
3. En `/admin` recepción la **confirma**, **cancela** o marca como **completada**, agrega notas internas y
   contesta al huésped con mensajes de WhatsApp prellenados.
4. En `/admin/disponibilidad` se bloquean noches (todas las habitaciones o un tipo); el calendario público las
   muestra tachadas y el servidor rechaza solicitudes en esas fechas.

## Despliegue

- **Vercel:** configura las variables anteriores, incluida `DATABASE_URL` (el disco de Vercel no es persistente).
- **Servidor propio / VPS:** `npm run build && npm start`. Puede usar PGlite sin `DATABASE_URL` si la carpeta
  `.data/` (o `PGLITE_DIR`) está en un disco persistente y con respaldo.
