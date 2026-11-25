# Historias Fantásticas — Tareas Pendientes (v2.0)

> Estado al **18 nov 2026**. Las fases 1–3 y el botón flotante de WhatsApp están completos y el build pasa sin errores. Lo que sigue es trabajo pendiente, ordenado por prioridad para la muestra y el sistema completo.

---

## 🔴 Prioridad Alta — Flujo de Compra (Fase 4)

### T-01 · Refactorizar `js/cart.js` — Eliminar lógica de "envío gratis"
**Archivo:** `js/cart.js`  
**Requerimiento:** RF07  
**Descripción:**  
El carrito actual tiene una barra de progreso de envío gratis (\$40) y el botón "Ir a pagar" abre una demo sin función. Debe:
- Eliminar la barra de envío gratis y toda referencia a `FREE = 40` (línea 5–56).
- Reemplazar el botón "Ir a pagar" por **"Hacer pedido"** que abre el `<dialog>` del formulario de pedido (`#orderDlg`).
- Los ebooks conservan cantidad 1 (ya existe, conservar).
- Actualizar `test.mjs` para confirmar que ya no existe la barra de envío.

---

### T-02 · Crear `js/order.js` + `<dialog id="orderDlg">` en `index.html`
**Archivos nuevos/editados:** `js/order.js`, `index.html`, `css/sections.css`  
**Requerimiento:** RF09, D04  
**Descripción:**  
Formulario de pedido completo dentro de un `<dialog>`:

| Campo | Tipo | Notas |
|---|---|---|
| Nombre completo | `text` | Requerido |
| Teléfono | `tel` | Requerido |
| Forma de entrega | `radio` | "Retiro en el local" / "Envío a domicilio" |
| Dirección | `text` | Solo visible si elige envío |
| Notas opcionales | `textarea` | — |
| Aviso de privacidad | `checkbox` | Requerido para enviar |

**Al enviar el formulario:**
1. Bloquear libros agotados (no deben estar en el carrito, pero validar).
2. Llamar a `api.createOrder(order)` generando un código **`HF-AAAAMMDD-XXXX`** (año-mes-día + 4 dígitos aleatorios).
3. Abrir `https://wa.me/50377578592?text=...` con el mensaje prellenado usando `CONFIG.whatsappMessages.orderTemplate(order)`.
4. Mostrar pantalla de confirmación con el código de pedido y el mensaje "Coordinaremos pago y entrega por WhatsApp".
5. Vaciar el carrito.

**Incluir** resumen del pedido (libros, cantidades, total) junto al formulario (panel lateral en desktop, arriba en mobile).  
Agregar prueba en `test.mjs`.

---

### T-03 · Actualizar `js/api.js` — función `createOrder` y `getOrders`
**Archivo:** `js/api.js`  
**Requerimiento:** RF09, D02  
**Descripción:**  
- `createOrder(order)`: guardar en `localStorage` bajo la clave `hf-orders` como array JSON. Cada orden lleva `id`, `createdAt`, `status: "Nuevo"`, `items[]`, `total`, datos del cliente.
- `getOrders()`: leer y retornar el array.
- `updateOrderStatus(id, status)`: cambiar el campo `status` de una orden.
- Marcar todo con comentario `// MOCK: reemplazar por llamada HTTP al backend`.

---

## 🟠 Prioridad Media — Panel de Administración (Fase 5)

### T-04 · Crear `admin/index.html` — Panel de administración simulado
**Archivos nuevos:** `admin/index.html`, `admin/admin.js`, `admin/admin.css`  
**Requerimiento:** D07, RF09  
**Descripción:**  
Página separada con `<meta name="robots" content="noindex">`. Tabs o secciones:

**Pestaña 1 — Pedidos**
- Listar pedidos de `api.getOrders()` ordenados por fecha desc.
- Mostrar: código, fecha, cliente, total, estado (`Nuevo` / `Preparando` / `Listo` / `Entregado`).
- Selector de estado editable por pedido (llama a `api.updateOrderStatus`).

**Pestaña 2 — Catálogo**
- Listar libros de `api.getBooks()`.
- Formulario para editar: precio físico, precio ebook, disponibilidad (`available`), oferta (`percent`, `start`, `end`).
- Guardar en `localStorage` bajo `hf-admin-books` (capa admin sobre `books.json`).

**Pestaña 3 — Suscriptores**
- Listar suscriptores de `localStorage` (`hf-subs`).
- Botón para eliminar/desuscribir individualmente.

> **Nota de acceso:** para la muestra, la URL simplemente es `admin/`. No hace falta autenticación real ahora (eso viene con el backend).

---

## 🟡 Prioridad Media — Mejoras de Módulos Existentes

### T-05 · `js/quiz.js` — Botón "Anterior" y resultados añadibles
**Archivo:** `js/quiz.js`  
**Requerimiento:** RF04  
**Descripción:**  
- Agregar botón **"Volver"** en cada pregunta (excepto la primera) para retroceder.
- Agregar botón **"Repetir quiz"** en la pantalla de resultados.
- Los 3 libros del resultado deben mostrar botón "Añadir al carrito" y corazón de wishlist (igual que las tarjetas del catálogo).
- Solo mostrar libros con `available: true`.

---

### T-06 · `js/form.js` — Newsletter con consentimiento y confirmación
**Archivo:** `js/form.js`  
**Requerimiento:** RF12, RF13  
**Descripción:**  
- Agregar casilla de **consentimiento** (`required`) junto al campo de correo.
- Al suscribirse: llamar a `api.subscribe(email, consent)` que guarda en `localStorage` (`hf-subs`) con fecha.
- Mostrar mensaje de confirmación visible ("¡Te suscribiste! Pronto recibirás novedades.").
- Agregar enlace de desuscripción (puede ser una URL `?unsub=email` que llame a `api.unsubscribe`).
- Actualizar prueba en `test.mjs`.

---

### T-07 · `data/books.json` — Revisar y completar campos v2.0
**Archivo:** `data/books.json`  
**Requerimiento:** RF01, RF03, RF05, RF06  
**Descripción:**  
Verificar que cada libro tenga todos los campos del modelo v2.0:
- `authorId` (referencia al escritor)
- `formats.physical.price` y `formats.ebook.price` (si aplica)
- `ebookAuthorized` (boolean)
- `offer` con `percent`, `start`, `end` (donde corresponda)
- `available` (boolean)
- `readingTime`, `themes[]`, `collection`

> Los datos son de ejemplo; dejarlos claramente marcados. No inventar precios reales.

---

## 🟢 Prioridad Baja — SEO y Producción (Fase 6)

### T-08 · Generar páginas estáticas con `build.mjs` (opción A aprobada)
**Archivo:** `build.mjs`, nuevas páginas HTML  
**Requerimiento:** 5.1 URLs limpias  
**Descripción:**  
Extender el script de build para generar páginas separadas:
- `dist/catalogo/index.html`
- `dist/colecciones/index.html`
- `dist/ofertas/index.html`
- `dist/escritores/index.html`
- `dist/contacto/index.html`

Cada una usa el mismo `<head>` base con `<title>` y `<meta description>` propios, y carga el JS/CSS del bundle. El contenido dinámico se monta igual que en la SPA.

---

### T-09 · Página de Contacto
**Archivo:** `dist/contacto/index.html` (o sección `#contacto` en `index.html`)  
**Requerimiento:** RF10, RF11  
**Descripción:**  
- Mostrar horario, dirección y número de WhatsApp (desde `config.js`).
- Mapa estático o indicación de ubicación (Colonia Vista Hermosa, San Miguel).
- Botón de WhatsApp con mensaje contextual de contacto general.

---

### T-10 · JSON-LD y metadatos SEO actualizados
**Archivo:** `index.html`  
**Requerimiento:** RF16  
**Descripción:**  
- Revisar que el bloque `<script type="application/ld+json">` incluya los datos de horario, dirección y teléfono actualizados.
- Agregar `FAQPage` para las preguntas frecuentes si existe sección.
- Verificar `og:image` (actualmente falta).

---

## 📋 Resumen rápido para asignación

| ID | Tarea | Archivos principales | Dificultad | Fase |
|---|---|---|---|---|
| T-01 | Eliminar barra de envío gratis en carrito | `cart.js` | ⭐ Baja | 4 |
| T-02 | Formulario de pedido + WhatsApp | `order.js`, `index.html` | ⭐⭐⭐ Alta | 4 |
| T-03 | `api.createOrder` / `getOrders` | `api.js` | ⭐⭐ Media | 4 |
| T-04 | Panel de administración | `admin/` (nuevo) | ⭐⭐⭐ Alta | 5 |
| T-05 | Quiz: botón anterior + resultados al carrito | `quiz.js` | ⭐⭐ Media | 3 |
| T-06 | Newsletter con consentimiento | `form.js` | ⭐ Baja | 3 |
| T-07 | Completar `books.json` v2.0 | `data/books.json` | ⭐ Baja | 2 |
| T-08 | Páginas estáticas en `build.mjs` | `build.mjs` | ⭐⭐ Media | 6 |
| T-09 | Página de Contacto | `contacto/index.html` | ⭐ Baja | 6 |
| T-10 | JSON-LD y SEO | `index.html` | ⭐ Baja | 6 |

---

> [!IMPORTANT]
> **Reglas para todos los colaboradores**
> - Ejecutar `node build.mjs` y `node test.mjs` antes de entregar cualquier tarea. Ambos deben pasar sin errores.
> - Todo lo simulado lleva `// MOCK: reemplazar por llamada HTTP al backend`.
> - No inventar datos reales (precios, zonas de envío). Usar `// PENDIENTE: confirmar con el cliente` en `config.js`.
> - Mantener accesibilidad: `aria-label`, foco de teclado, `prefers-reduced-motion`.
> - **No agregar dependencias de runtime** (solo devDependencies si son imprescindibles).
