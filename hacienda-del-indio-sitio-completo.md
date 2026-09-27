# Hacienda del Indio Hotel — Extracción completa del sitio

> **Fuente:** https://www.haciendadelindiohotel.com/ (extraído 2026-09-27)
> **Plataforma actual:** Wix (Thunderbolt), idioma `es-MX`
> **Objetivo:** Brief para que Claude Code genere el sitio en **Next.js** (App Router + Tailwind).

---

## 0. Instrucciones para Claude Code (Next.js)

Construye un sitio en **Next.js 15 (App Router) + TypeScript + Tailwind CSS** que replique (y mejore) el sitio de Hacienda del Indio Hotel con el contenido de este documento.

- Rutas requeridas:
  - `/` → Home
  - `/habitaciones` → Listado de habitaciones
  - `/habitaciones/sencilla`, `/habitaciones/doble`, `/habitaciones/triple` → Detalle de habitación (usar ruta dinámica `/habitaciones/[slug]` alimentada por un archivo `data/rooms.ts`)
  - `/menu` → Restaurante 24/7 (descarga de menú PDF)
  - `/reservar` → Página de reservación (el sitio actual tiene `/booking-engine` vacío; implementar formulario o CTA a WhatsApp/teléfono)
- Configura **redirects** en `next.config.ts` desde las URLs viejas de Wix: `/habitación-sencilla`, `/habitación-doble`, `/habitación-triple`, `/menú`, `/booking-engine`, `/habitaciones-1` → nuevas rutas.
- Componentes compartidos: `Header` (logo + menú + botón "Reservar"), `Footer` ("Más información" con contactos), `RoomCard`, `AmenityList`, `Gallery` (slideshow), `MapEmbed`, `WhatsAppButton` flotante.
- Usar `next/image` con `static.wixstatic.com` en `images.remotePatterns` (o descargar las imágenes a `/public/images`).
- Metadatos SEO por página (`generateMetadata`) con los títulos/descripciones de abajo. Agregar JSON-LD `Hotel` / `LodgingBusiness`.
- Totalmente responsive (mobile-first). Idioma `lang="es-MX"`.
- Moneda: precios en **M.N. (MXN)**.

---

## 1. Identidad de marca

| Elemento | Valor |
|---|---|
| Nombre | Hacienda del Indio (Hotel) |
| Ciudad | Mexicali, Baja California, México |
| Propietario / grupo | Grupo VB ("Todos los derechos Grupo VB") |
| Tagline (hero) | **"Descanso y Comodidad para tu tribu."** |
| Propuesta | Hotel enfocado a brindar el descanso que tú y tu equipo de trabajo o familia necesitan. |
| Público | Familias y equipos de trabajo (cuadrillas, viajeros de negocios) |

### Meta description (sitio)
> Hacienda del Indio es un Hotel enfocado a brindar el descanso que tu y tu equipo de trabajo o familia necesitan. Contamos con todo tipo de habitaciones y servicios que asegurarán el descanso de los tuyos.

### Paleta de colores (extraída del CSS computado)

| Token sugerido | Color | Uso probable |
|---|---|---|
| `--orange` / accent | `#D58540` (rgb 213,133,64) | Acento principal, botones, formas decorativas ("Shape-Orange") |
| `--navy` | `#283B62` (rgb 40,59,98) | Fondos/secciones y títulos |
| `--brown-dark` | `#332D25` (rgb 51,45,37) | Texto oscuro / footer |
| `--gray-light` | `#F7F7F7` | Fondos de sección |
| `--white` | `#FFFFFF` | Fondo, texto sobre oscuro |
| `--black` | `#000000` | Texto |

### Tipografía (fuentes custom subidas a Wix)

| Fuente | Uso sugerido | Alternativa en Google Fonts |
|---|---|---|
| **Made Sunflower** (display, estilo retro/western) | Títulos grandes (hero, "Habitaciones", "Servicios") | `Rye`, `Alfa Slab One` o licenciar Made Sunflower |
| **Gilroy ExtraBold** | Subtítulos, precios, nombres de habitación | `Plus Jakarta Sans` 800 / `Manrope` 800 |
| **Gilroy Light** | Texto de cuerpo | `Plus Jakarta Sans` 300 |
| **Kristopher Regular** (script) | Detalles decorativos | `Kaushan Script` / `Pacifico` |
| Open Sans / Helvetica | Texto de sistema | `Open Sans` |

### Logos
- Logo horizontal (color): `https://static.wixstatic.com/media/34610f_e1aee8415437488c99289fa2f89335e3~mv2.png`
- Logo blanco (footer): `https://static.wixstatic.com/media/34610f_a62c6a93dd3a46efaef2ad905b05a7fa~mv2.png`
- Favicon: `https://static.wixstatic.com/media/34610f_518bb299220840e1ab4a4bf9545d3f8f~mv2.png`

---

## 2. Navegación global

### Header (todas las páginas)
- Logo (→ `/`)
- Menú:
  - **Habitaciones** (→ `/habitaciones`) con submenú:
    - Habitación Sencilla
    - Habitación Doble
    - Habitación Triple
  - Ícono Reservar (→ `/booking-engine`)
  - Ícono Facebook (→ facebook.com/Haciendadelindiohotel)
- Botón CTA **"Reservar"** (→ `#contacto` en home)

### Footer — "Más información" (todas las páginas)

| Canal | Dato | Acción / Link |
|---|---|---|
| Llamada | **(686) 557-2277** | Botón "Llamar" → `tel:+526865572277` |
| WhatsApp | **(686) 335-0571** | Botón "WhatsApp" → `https://wa.link/eeb0sw` (también `https://wa.link/somj7f`) |
| Facebook | **/Haciendadelindiohotel** | Messenger `http://m.me/Haciendadelindiohotel` · Botón "Ver en Fb" → `http://fb.com/Haciendadelindiohotel` |
| Quejas y sugerencias | **aud.hoteles@outlook.com** | `mailto:` |

- Logo blanco
- Texto legal: "Todos los derechos Grupo VB"
- Íconos: celular, WhatsApp, Facebook, email (blancos)

> ⚠️ En el sitio actual el link `tel:+521686557-2277` está mal formado. Usar `tel:+526865572277`.

---

## 3. Página: Home (`/`)

- **Title:** `Hotel | Hacienda del Indio | Mexicali`
- **Meta description:** (la del sitio, ver arriba)

### 3.1 Hero
- Título: **"Descanso y Comodidad para tu tribu."** (en 3 líneas: "Descanso y / Comodidad / para tu tribu.")
- Botón: **Reservar** (→ `#contacto`)
- Imágenes: foto de habitación `Indio-Habitacion-foto.png` + forma naranja decorativa `Shape-Orange.png` + ilustración/foto `FAMILIA_INDIO.png`
  - `https://static.wixstatic.com/media/34610f_fa567f994be94f49be89b0be55eaf5ce~mv2.png`
  - `https://static.wixstatic.com/media/34610f_d23ca8c44ff746d58e021f5f550a1e1d~mv2.png`
  - `https://static.wixstatic.com/media/34610f_7b3c49b079004837bc0d4531a14fc856~mv2.png`

### 3.2 Habitaciones (3 tarjetas)

| Tarjeta | Precio | Botón | Imagen |
|---|---|---|---|
| **ESTÁNDAR** | $849 M.N./Noche | Ver más → Sencilla | `34610f_8b2f9df3878c448597499148c53979fc~mv2.jpg` |
| **DOBLE** | $999 M.N./Noche | Ver más → Doble | `34610f_10567bffbfd842dabc3b131219061651~mv2.jpg` |
| **TRIPLE** | $1099 M.N./Noche | Ver más → Triple | `34610f_086330711148424197b958262eb62804~mv2.jpg` |

(Base URL: `https://static.wixstatic.com/media/`)

> Nota: en home la sencilla se llama "ESTÁNDAR" y en su página "Habitación Sencilla". Unificar nombre (sugerido: "Sencilla / Estándar").

### 3.3 Servicios
- Título: **Servicios**
- Texto: "Deliciosos platillos y comodidades que aseguran tu descanso."
- 3 íconos:
  - **Wifi Gratis** (ícono `34610f_40ff6938f1f046dfac226b0c7fa630e4~mv2.png`)
  - **Botanas** (ícono popcorn `34610f_e6c79af1a5d2426895259425ee10750d~mv2.png`)
  - **Cocina 24/7** (ícono restaurante `34610f_e98773028062439da21819168564fd3c~mv2.png`)
- Botón: **Ver Menú** → PDF `https://www.haciendadelindiohotel.com/_files/ugd/d3154d_274b8be0a0364d4d9ade8c7ca16707ae.pdf`
- Imagen de sección: `foto-seccion2-INDIO.png` → `34610f_fb003cf2e3c949028df5dc2dc65cafda~mv2.png`

### 3.4 Ubicación
- Título: **Ubicación**
- **Dirección: Blvd. López Mateos, Zona Urbana Zacatecas, 21070 Mexicali, B.C.**
- Mapa de Google embebido (usar `https://www.google.com/maps?q=Hacienda+del+Indio+Hotel+Mexicali&output=embed` o coordenadas exactas)

### 3.5 Contacto (`#contacto`)
- Botón: **Reserva Aquí** (ancla `#contacto`) → lleva al footer "Más información" (teléfono/WhatsApp/Facebook).

---

## 4. Página: Habitaciones (`/habitaciones`)

- **Title:** `Habitaciones | Hacienda del Indio`
- Contenido: título **Habitaciones** + las mismas 3 tarjetas del home (Estándar $849, Doble $999, Triple $1099) con "Ver más".

---

## 5. Páginas de detalle de habitación

Estructura común de las 3 páginas:
1. Galería / slideshow de fotos (con flechas "Next item")
2. Nombre + capacidad
3. Lista de amenidades con íconos (10 items, iguales en las 3)
4. Precio por noche + persona adicional
5. Botón **Reserva Aquí**
6. Aviso: **NO SE ADMITEN MASCOTAS**

### Amenidades (comunes a todas las habitaciones)

| Amenidad | Ícono (base `https://static.wixstatic.com/media/`) |
|---|---|
| WiFi Gratis | `34610f_73866c85eab04dddaebcb3a6e45fcc49~mv2.png` |
| Seguridad 24/7 | `34610f_03110df0c0c14123ba7adf711bd3614a~mv2.png` |
| Estacionamiento Incluido | `34610f_bf152d70f6ce4b6eb3403f9f27c48482~mv2.png` |
| Servicio a la habitación | `34610f_9a68a8c9b783487ebadddfad8bdfccea~mv2.png` |
| Aire Acondicionado | `34610f_f1c470f74d4441ebbf0f7ed7677f5df1~mv2.png` |
| Recepción 24/7 | `34610f_dfa0f3d8b45a4db886154e3f5deb66d4~mv2.png` |
| Accesible para personas en silla de ruedas | `34610f_ec0087e77be04926845207bf29a0cc46~mv2.png` |
| Servicio Completo de Lavandería | `34610f_401ff5de53c047d7844edbb9f0ec74de~mv2.png` |
| Adecuado para niños | `34610f_aee30e0832034059b5e86c11ebc64488~mv2.png` |
| Comedor / Restaurante | `34610f_1684db7b18934de58afc717c732961a9~mv2.png` |

(En Next.js se pueden reemplazar por íconos de `lucide-react`: Wifi, ShieldCheck, ParkingSquare, ConciergeBell, AirVent, BellRing, Accessibility, WashingMachine, Baby, UtensilsCrossed.)

### 5.1 Habitación Sencilla (`/habitaciones/sencilla`)
- **Title:** `Habitación Sencilla | Hacienda del Indio`
- **Meta:** "Habitación sencilla para hasta 2 personas. Hacienda del Indio es un Hotel enfocado a brindar el descanso…"
- **Capacidad:** 1 recámara, hasta 2 personas.
- **Precio:** **$849 M.N. por noche**
- **Persona adicional:** +$200 M.N. (sobre el monto final)
- NO SE ADMITEN MASCOTAS
- **Galería** (base `https://static.wixstatic.com/media/`):
  - `34610f_8b2f9df3878c448597499148c53979fc~mv2.jpg`
  - `34610f_4b20543143b04fea8fba3cdc01a6a653~mv2.jpg`
  - `34610f_4b63872ea7d04dc38bb825d803151c01~mv2.jpg`
  - `34610f_d36f4a78e602422cb0177356a650fdc6~mv2.jpg`
  - `34610f_cd1e4815aa65436a8b2f3e3fc89ddc39~mv2.jpg`
  - `34610f_ccab161e76e54bbda4186bf978d20a44~mv2.png`
  - `34610f_a35c163c81794047b58942580828ea15~mv2.png`

### 5.2 Habitación Doble (`/habitaciones/doble`)
- **Title:** `Habitación Doble | Hacienda del Indio`
- **Capacidad:** 2 camas, hasta 4 personas.
- **Precio:** **$999 M.N. por noche**
- **Persona adicional:** +$200 M.N. (sobre el monto final)
- NO SE ADMITEN MASCOTAS
- **Galería:**
  - `34610f_10567bffbfd842dabc3b131219061651~mv2.jpg`
  - `34610f_17c5a850f75e4a41bb89ff2f797a4223~mv2.jpg`
  - `34610f_f348fd72ceac4a97a11c33a53bfd6908~mv2.jpg`
  - `34610f_ef4f93fd0bbb41748a523cae02bd6efe~mv2.jpg`
  - `34610f_c0f973f028ad4f2fac10390aa2957a0b~mv2.jpg`
  - `34610f_e80443d17ceb4358b1450b5063a2face~mv2.jpg`
  - `34610f_30a4a4c47ae94f2794281daca19703fa~mv2.jpg`
  - `34610f_6a3be7c8536d44e7943426d193efe675~mv2.jpg`

### 5.3 Habitación Triple (`/habitaciones/triple`)
- **Title:** `Habitación Triple | Hacienda del Indio`
- **Capacidad:** 3 camas, hasta 6 personas.
- **Precio:** **$1099 M.N. por noche**
- **Persona adicional:** +$200 M.N. (sobre el monto final)
- NO SE ADMITEN MASCOTAS
- **Galería:**
  - `34610f_f1d1c85a84e84084b0fef36a083fafe3~mv2.jpg`
  - `34610f_f3d00932688b4b8aa7b84e4e72444b68~mv2.jpg`
  - `34610f_e77cf8086bf14317b373ddbf0828f0c0~mv2.jpg`
  - `34610f_1a09aecdc588478cb4bb70bf8c92fb15~mv2.jpg`
  - `34610f_ef69683e6b72406d8e65a044f6e1eef3~mv2.jpg`
  - `34610f_2e65992e8fa34558b579fc236661f985~mv2.jpg`
  - `34610f_52e5d5fac74e4213902448353ee65703~mv2.jpg`

> ⚠️ En el sitio actual la meta description de "Triple" dice "Habitación doble para hasta 4 personas" (error). Corregir a "Habitación triple para hasta 6 personas".

### Data sugerida (`data/rooms.ts`)

```ts
export const rooms = [
  { slug: "sencilla", name: "Habitación Sencilla", cardName: "Estándar", capacity: "1 recámara, hasta 2 personas", maxGuests: 2, price: 849 },
  { slug: "doble",    name: "Habitación Doble",    cardName: "Doble",    capacity: "2 camas, hasta 4 personas",   maxGuests: 4, price: 999 },
  { slug: "triple",   name: "Habitación Triple",   cardName: "Triple",   capacity: "3 camas, hasta 6 personas",   maxGuests: 6, price: 1099 },
] as const;
export const extraPersonFee = 200; // MXN, sobre el monto final
export const petsAllowed = false;
```

---

## 6. Página: Menú (`/menu`)

- **Title:** `Menú | Hacienda del Indio`
- Título: **Restaurante 24/7**
- Texto: "Descarga nuestro menú de deliciosos platillos hasta tu habitación."
- Botón: **Descargar** → PDF del menú: `https://www.haciendadelindiohotel.com/_files/ugd/d3154d_274b8be0a0364d4d9ade8c7ca16707ae.pdf`
- Imagen: `34610f_fb003cf2e3c949028df5dc2dc65cafda~mv2.png`

> Recomendación: descargar el PDF a `/public/menu-hacienda-del-indio.pdf` (y opcionalmente transcribir el menú en HTML para SEO).

---

## 7. Página: Reservar (`/booking-engine` → `/reservar`)

- **Title actual:** `Book a Room | Hacienda del Indio`
- Estado actual: **vacía** (el motor de reservas de Wix Hotels no tiene habitaciones cargadas).
- Propuesta para Next.js: formulario de solicitud de reservación (nombre, teléfono, fecha entrada/salida, tipo de habitación, número de personas) que abra WhatsApp con mensaje prellenado a `+52 686 335 0571`, + botón de llamada.

## 8. Página oculta: `/habitaciones-1` ("Habitaciones herramienta")

- Página de pruebas de Wix Hotels: "Nothing to book right now. Check back soon." con tarjetas Sencilla/Doble/Triple a **$249 M.N./Noche** (precios de prueba).
- **No migrar.** Redirigir a `/habitaciones`.

---

## 9. Otros elementos globales

- Banner de cookies (botones "Ajustes" / "Aceptar").
- Botón "Skip to Main Content" (accesibilidad) — mantener.
- Enlaces de reserva ancla: `#contacto` (home), `#reservaciondehs` (detalle de habitación).
- Sin blog, sin formulario de contacto, sin versión en inglés.

## 10. Mejoras recomendadas para la nueva web

1. Motor/formulario de reserva funcional (hoy no existe).
2. Botón flotante de WhatsApp.
3. JSON-LD `Hotel` con dirección, teléfono, `priceRange: "$849–$1099 MXN"`, amenidades, `petsAllowed: false`.
4. Horarios de check-in / check-out (no aparecen en el sitio — pedir al cliente).
5. Sección "Para empresas / cuadrillas" (el público "tu equipo de trabajo" está en el mensaje pero no tiene sección).
6. Reseñas / testimonios (Google/Facebook).
7. Corregir teléfono `tel:` y la meta de Triple.
8. Alt text descriptivo en todas las fotos de galería (hoy vacíos).
