# Guía de defensa — Historias Fantásticas

Documento de apoyo para explicar el proyecto. Estado verificado: **73/73 pruebas OK**, `npm run build` correcto y Lighthouse local con performance ≥96 y el resto de categorías en 100.

---

## 1. Resumen en 30 segundos

> «Es una tienda de libros para Historias Fantásticas construida con HTML, CSS y JavaScript nativo, sin frameworks ni dependencias en tiempo de ejecución. El catálogo real de 20 títulos con portadas WebP se consume desde `data/books.json` a través de una capa única, `js/api.js`. Sobre esa capa se montan filtros, quiz, carrito, lista de deseos, pedidos por WhatsApp y un panel de administración. La entrega actual es un prototipo funcional: la persistencia es `localStorage`, así que el backend, los correos y la autenticación segura quedan para la siguiente fase. El build genera además cinco páginas SEO estáticas y se despliega como sitio estático.»

---

## 2. Arquitectura y flujo de datos (decirlo en este orden)

1. **Fuente de verdad:** `data/books.json` → 20 libros, 4 colecciones, 3 escritores. Cada libro trae precios, disponibilidad, `ebookAuthorized`, oferta con fechas, portada, páginas y metadatos del quiz.
2. **Capa de datos:** `js/api.js` es la única frontera. `fetchBaseData()` lee el JSON con el prefijo de `meta[name="hf-base"]` (`''` en la raíz, `../` en subpáginas y admin). Aplica overrides del panel (`hf_books_override`, `hf_books_deleted`, etc.) y calcula `discountPct` solo si `isOfferActive()`.
3. **Adaptador:** `js/data.js::loadCatalog()` compacta cada libro a `{id,t,a,p,e,img,bg,fg,c,cn,d,g,h,n,synopsis,available,ebookAuthorized,mq}` y antepone `../` a la portada cuando hace falta.
4. **Vistas:** `js/main.js` reparte el catálogo entre `carousel.js`, `catalog.js`, `quiz.js`, `offers.js`, `writers.js`, `wishlist.js`, `cart.js` y `order.js`. Todo el render usa `el()` + `textContent`, no `innerHTML` con datos.
5. **Carrito:** `js/cart.js` persiste solo `{i, fmt, qty}` en `ds-cart`; los precios **no se guardan**, se recalculan en cada render. Expone `window.__cart = {getItems, total, clear}`. El botón «Hacer pedido por WhatsApp» cierra el drawer y llama a `window.__openOrder()`.
6. **Pedido:** `js/order.js` valida cliente/teléfono/entrega/consentimiento y llama a `createOrder()`. Esa función **vuelve a validar contra el catálogo**, recalcula precios y total, genera `HF-AAAAMMDD-XXXX`, guarda en `hf_orders` y abre `wa.me` con el mensaje prellenado. Luego limpia el carrito y muestra la confirmación.
7. **Admin:** bundle separado `admin/admin.js` que reutiliza la misma `api.js` y el mismo `localStorage`. Gestiona pedidos, catálogo, colecciones, escritores, ofertas, recomendación semanal y suscriptores.
8. **Build/SEO:** `build.mjs` empaqueta con esbuild (`target es2020`), copia assets y genera `/catalogo/`, `/colecciones/`, `/ofertas/`, `/escritores/` y `/contacto/`, cada una con H1, canonical, OG, `WebPage` en JSON-LD y `meta hf-section`. `SITE_URL` centraliza el dominio.

**Frase clave:** «La fuente de verdad es el JSON; `api.js` es la única frontera; el carrito guarda solo identificadores y cantidades, y el precio se calcula dos veces: en la UI y, de forma autoritativa, en `createOrder()`».

---

## 3. Mapa de requisitos

### Funcionales

| ID | Estado | Evidencia / matiz |
|---|---|---|
| RF01 Catálogo y etiquetas | ✅ | Tarjetas con portada WebP, precio, `<del>` si hay oferta, Físico/Ebook/Agotado, carrito y corazón. El detalle muestra sinopsis, páginas, géneros y **colección**. Ebook solo si `ebookAuthorized`. |
| RF02 Buscador y filtros | ✅ | Texto, formato, género, temática, autor, precio y duración; debounce, contador, estado vacío, parámetros en URL y cajón móvil accesible. El tope de precio se deriva del catálogo. |
| RF03 Colecciones | ✅ | 4 colecciones con carruseles y CRUD en el panel. Cambios del panel son locales al navegador. |
| RF04 Quiz | ✅ | 5 preguntas, retroceso, progreso con `aria-valuenow`, 3 recomendaciones ordenadas por afinidad, repetir, sin cuenta. |
| RF05 Ofertas | ✅ | Vigencia por fechas corregida (una sola fecha vencida ya no queda activa), porcentaje 1–100 validado, recálculo en carrito y en la API. Falta la recurrencia mensual del día 15 (P03). |
| RF06 Escritores | ⚠️ | 3 fichas con obras y CTA de contacto. Son autores clásicos del catálogo, no emergentes salvadoreños; por eso el H2 dice «Escritores recomendados» (el `<title>` de la subpágina conserva «Escritores Emergentes»). |
| RF07 Carrito | ✅ | Añadir/quitar/cantidad, total en vivo, persistencia, drawer, envío gratis ≥$40 (supuesto P04). Flujo conectado al pedido. |
| RF08 Lista de deseos | ✅ | Corazón con `aria-pressed`, persistencia `ds-wish`, quitar, pasar al carrito, aviso de almacenamiento local. |
| RF09 Pedido como invitado | ✅ (mock) | Validación doble (UI + API), resumen, consentimiento, ID único, WhatsApp con fallback, confirmación. Guardado en `localStorage`, no en BD. |
| RF10 Botones WhatsApp | ✅ | Número, mensajes y enlaces centralizados en `CONFIG`; 5 CTAs + flotante + confirmación + panel. |
| RF11 Información comercial | ✅ | Dirección, horario, WhatsApp y coherencia con el JSON-LD. |
| RF12 Recomendación semanal | ⚠️ | Alta con consentimiento y `consentAt`, selección semanal en el panel. **No hay envío de correo**. |
| RF13 Baja | ⚠️ | Funciona por `?unsub=correo`, pero sin token ni confirmación previa (pendiente de backend). |
| RF14 Admin de contenido | ✅ (demo) | CRUD completo. Autenticación simulada en el cliente; no es seguridad de producción. |
| RF15 Gestión de pedidos | ✅ (demo) | Lista, filtros, detalle, 5 estados y WhatsApp. Pedidos visibles solo en el dispositivo donde se crearon. |
| RF16 Marca y logo | ✅ | «Historias Fantásticas» en título, OG, JSON-LD, header y footer; `Digital Story` solo nombre interno del repo. |
| RF17 Diseño | ✅ | Paleta, bento, carruseles, tipografías locales, solo modo claro, etiqueta «Agotado» con estilo propio. |

### No funcionales

| ID | Estado | Evidencia / matiz |
|---|---|---|
| RNF01 Compatibilidad | ⚠️ | Build ES2020 y CSS moderno (`dialog`, `:has()`, `color-mix()`). **Sin matriz manual** Chrome/Edge/Firefox/Safari. |
| RNF02 Responsivo | ✅ | Breakpoints 760/900, tabbar, cajón de filtros, bento de una columna. Sin capturas formales. |
| RNF03 Rendimiento | ✅ | 20 WebP + miniaturas de 320 px (1.5 MB → 400 KB), `loading="lazy"`, `decoding="async"`, dimensiones reales, `content-visibility:auto`, hero preload con `fetchpriority=high`, `books.json` una sola vez, caché en `_headers`. Lighthouse local: **performance 97–98 en inicio y 96–97 en subpáginas**, sin degradar el resto. |
| RNF04 Accesibilidad | ✅ | Foco violeta, labels, `aria-*`, diálogos con foco inicial, `prefers-reduced-motion`, `alt` descriptivo, nombres accesibles que incluyen el texto visible y contraste corregido. Lighthouse: **100**. |
| RNF05 SEO | ✅ | Título/description/canonical/OG únicos, H1 propio, JSON-LD `BookStore`+`FAQPage`+`WebPage`, robots y sitemap. Dominio por defecto `.example`: definir `SITE_URL` al desplegar. |
| RNF06 CTA | ✅ | Botones píldora, color por acción e iconos con `aria-label`. |
| RNF07 Mantenibilidad | ✅ | Config centralizada, capa `api.js` intercambiable, README con comandos y despliegue. |
| RNF08 Semántico | ✅ | `header/nav/main/section/article/footer`, Grid y Flexbox. |
| RNF09 Seguridad | ⚠️ | CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy y `noopener`; validación y recálculo en la API. **El login es demo**: hash en el bundle y sesión en `sessionStorage`. No presentarlo como seguridad real. |
| RNF10 Privacidad | ✅ | Aviso visible, consentimiento explícito con fecha, baja y panel restringido. Sin BD ni política de retención real. |

### Medición de rendimiento (Lighthouse)

Ejecutado sobre `dist/` servido localmente, con emulación móvil y Chrome 158:

| Página | Performance | Accesibilidad | Buenas prácticas | SEO |
|---|---:|---:|---:|---:|
| `/` | 97–98 | 100 | 100 | 100 |
| `/catalogo/` | 96 | 100 | 100 | 100 |
| `/colecciones/`, `/ofertas/`, `/escritores/`, `/contacto/` | 97 | 100 | 100 | 100 |

Métricas representativas en inicio: FCP 0.9 s, LCP 2.6 s, TBT 20–30 ms, CLS 0, Speed Index 0.9 s.

Optimizaciones aplicadas: miniaturas WebP de 320 px para tarjetas/carruseles (1.5 MB → 400 KB) y portada completa solo en hero/detalle; `loading="lazy"` + `decoding="async"` + `width`/`height` reales por libro; `content-visibility:auto` en secciones fuera de pantalla; `preload` y `fetchpriority="high"` en la portada LCP; caché de la promesa de `books.json` (antes se descargaba 3 veces); caché HTTP en `_headers`; y sustitución del scroll JS de subpáginas por orden CSS estático para eliminar un CLS de ~1.05.

**Fuente del documento:** `LabII_de.docx` / `/tmp/opencode/labii_documento.txt`. El propio documento distingue un prototipo Fase 1 con mocks (§3.4–3.5) del sistema con backend de la decisión D02. La defensa debe apoyarse en esa distinción.

---

## 4. Correcciones hechas en esta revisión

1. **Flujo de compra roto → arreglado.** El botón decía «Ir a pagar» y solo mostraba un texto demo de Stripe; `window.__cart` no existía y `window.__openOrder` nunca se llamaba. Ahora el botón «Hacer pedido por WhatsApp» abre el formulario, el resumen muestra los libros y el pedido se guarda y abre WhatsApp.
2. **El test mentía.** `ck()` solo imprimía «FALLA» y el proceso terminaba con código 0. Ahora acumula fallos y marca `process.exitCode = 1`. Se añadieron pruebas del flujo real.
3. **Ofertas:** una oferta con sola fecha de fin vencida seguía vigente; ahora cada límite se evalúa por separado y se rechaza un porcentaje fuera de 1–100.
4. **Carrito:** ya no restaura ni añade libros agotados ni ebooks no autorizados; la cantidad debe ser entera.
5. **WhatsApp del panel:** los teléfonos de 8 dígitos locales ahora reciben el indicativo `503`.
6. **Filtro de precio:** el tope se calcula desde el catálogo, no hardcodeado en $30.
7. **Datos y accesibilidad:** la ficha muestra la colección, las portadas tienen `alt` descriptivo y dimensiones, y «Agotado» tiene estilo propio.
8. **Errores silenciosos:** si `localStorage` falla, `createOrder()` lanza un error en vez de mostrar una confirmación falsa.
9. **Navegación y admin:** las subpáginas reintentan el scroll hasta que la sección inyectada existe; al reingresar al panel se selecciona correctamente la pestaña «Pedidos».
10. **Credenciales:** se quitaron del login visible y pasaron a `README.md`, con advertencia explícita de que es una demo.

---

## 5. Qué es mock y cómo decirlo

| Tema | Respuesta honesta y segura |
|---|---|
| Backend / BD | «La capa `api.js` simula los endpoints y persiste en `localStorage`. Está preparada para sustituirse por HTTP sin tocar la UI; es el trabajo pendiente de la Fase 2.» |
| Admin | «Es un demo académico: el hash y la sesión viven en el navegador. En producción irían a servidor con Argon2/bcrypt y cookie HttpOnly.» |
| Pagos | «No hay pasarela por decisión D04: el pedido se confirma y se coordina por WhatsApp.» |
| Correos | «La newsletter registra consentimiento y baja; el envío semanal requiere un servicio de correo en el backend.» |
| Dominio | «`SITE_URL` centraliza canonical, OG, robots y sitemap; el valor por defecto es un placeholder y se cambia en el build.» |
| Evidencia | «La suite cubre 73 comprobaciones JSDOM y pasa en verde; Lighthouse sí se ejecutó sobre `dist/` servido localmente con emulación móvil: 97/100/100/100 en inicio y ≥96/100/100/100 en las cinco subpáginas. La matriz cross-browser sigue pendiente.» |
| Pendientes del cliente | P01–P09 en `js/config.js`: libros de texto, horario, duración de ofertas, costos de envío, entrega de ebooks, dominio, texto legal, alcance editorial y prioridades. |

---

## 6. Preguntas probables del jurado

**1. ¿Cómo demuestra que el pedido se guarda y que el total se recalcula?**
Se hace clic en «Hacer pedido por WhatsApp» desde el carrito, se valida el formulario y `createOrder()` vuelve a leer el catálogo, recalcula `base*(100-desc)/100` por ítem y genera el ID. La prueba `pedido guardado con total recalculado` comprueba `hf_orders`. El precio que envía el cliente se ignora.

**2. ¿Por qué `npm test` antes terminaba en verde con fallos?**
Porque `ck()` solo imprimía en consola. Se corrigió para acumular fallos y devolver `exitCode=1`; hoy hay 73/73.

**3. ¿El panel es seguro?**
No en producción: es un mock. Cabeceras y validación ayudan, pero el hash viaja en el bundle y la sesión se puede falsificar. Se debe decir explícitamente.

**4. ¿El build es reproducible?**
Sí dentro del mismo día y dominio: se limpia `dist/`, esbuild minifica con `target es2020` y los hashes coinciden. Cambia con `SITE_URL` y con la fecha del `lastmod` del sitemap.

**5. ¿Cómo se hizo SEO sin framework?**
`build.mjs::makePage()` deriva cada subpágina de `index.html`: cambia título/description/canonical/OG/H1, reescribe rutas a `../`, inyecta `meta hf-base` y `hf-section`, añade atributos `data-hf-page`/`data-hf-section` en `<html>` y crea un nodo `WebPage`. El orden de secciones se aplica con CSS desde el primer pintado; se eliminó el scroll programado porque generaba CLS alto en Lighthouse.

**6. ¿Qué hace la CSP?**
`_headers` restringe scripts, estilos, imágenes, fuentes y conexiones al mismo origen; bloquea frame-ancestors y mixed content. El JS es externo y el JSON-LD es un bloque inerte, por eso no hay `script` inline.

**7. ¿Ejecutó Lighthouse o probó en otros navegadores?**
Sí, Lighthouse se ejecutó sobre `dist/` servido localmente con emulación móvil (Chrome 158): inicio 97–98 de performance y 100 en accesibilidad, buenas prácticas y SEO; subpáginas 96–97 y 100 en el resto. LCP ~2.6 s, TBT 20–30 ms, CLS 0, FCP 0.9 s. **Cross-browser sigue pendiente**: JSDOM no sustituye a Firefox/Safari reales.

**8. ¿Dónde está el pago y el correo de confirmación?**
No existen: D04 sustituye la pasarela por WhatsApp. La confirmación abre `wa.me` con el resumen y ofrece enlace de respaldo si el popup se bloquea.

**9. ¿Qué pasa si el cliente cambia un precio desde el admin?**
El carrito guarda solo IDs, así que recalcula con el precio vigente; además `createOrder()` vuelve a validar contra el catálogo. Antes había textos hardcodeados en el bento; ahora los datos mandan.

**10. ¿Cuál es el mayor riesgo de la entrega?**
La persistencia local y la autenticación simulada: el propietario no ve pedidos de otros dispositivos y un visitante no ve cambios del admin. Mitigación presentada: capa `api.js` lista para backend y alcance explícito de prototipo Fase 1.

---

## 7. Comandos y credenciales

```bash
npm ci          # instalar dependencias de desarrollo
npm run dev     # servidor local (npx serve .)
npm test        # 73 verificaciones; falla con exit 1 si hay errores
npm run build   # genera dist/
SITE_URL=https://dominio.real npm run build
```

- Panel: `admin/index.html` → usuario `admin`, contraseña `historias2026` (**demo**).
- Despliegue: subir `dist/` a Netlify o Cloudflare Pages; `_headers` aporta CSP y caché.
- Storage keys relevantes: `ds-cart`, `ds-wish`, `hf_orders`, `hf_subscriptions`, `hf_books_override`, `hf_books_deleted`, `hf_collections_override`, `hf_writers_override`, `hf_weekly_pick`, `hf_admin_session`, `hf_admin_attempts`.
