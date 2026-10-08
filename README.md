# Digital Story

Landing de tienda de libros (HTML, CSS y JavaScript vanilla, sin dependencias en producción).

## Comandos
- `npm install` instala las herramientas de desarrollo (esbuild y jsdom).
- `npm run dev` sirve el proyecto en local (necesario para cargar `data/books.json`; no abras `index.html` con doble clic).
- `npm run build` genera `dist/` con CSS y JS empaquetados y minificados.
- `npm test` prueba de humo de los flujos principales (filtros, wishlist, carrito, quiz, newsletter).

## Despliegue
Sube la carpeta `dist/` a Netlify o Cloudflare Pages (ambos leen `_headers`). En Vercel, traduce `_headers` a `vercel.json`.

## Antes de publicar
- Sustituye `https://digitalstory.example` por tu dominio en `index.html`, `robots.txt` y `sitemap.xml`.
- Añade imagen Open Graph (`og:image`) y portadas reales en WebP/AVIF.
- Reemplaza testimonios y textos de FAQ por los reales; crea páginas de Privacidad, Términos y Cookies.
- Conecta el pago (Stripe) y el envío de la newsletter: hoy son demostraciones.
