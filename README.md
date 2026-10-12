# Historias Fantásticas

Sitio web y catálogo interactivo de libros físicos y ebooks para la librería **Historias Fantásticas** (San Miguel, El Salvador).
*(Nota técnica: `digital-story` es el nombre interno del repositorio de desarrollo; la marca pública es Historias Fantásticas)*.

Construido con estándares web nativos (HTML5 semántico, CSS moderno y JavaScript ES Modules), **sin dependencias en tiempo de ejecución**.

## Configuración rápida
- Toda la configuración comercial (WhatsApp, dirección, horario, ruta del logo y mensajes base) se gestiona centralizadamente en `js/config.js`.

## Comandos
- `npm install`: instala las herramientas de desarrollo (`esbuild` y `jsdom`).
- `npm run dev`: sirve el proyecto en local con un servidor estático (`npx serve .`).
- `npm run build`: genera la carpeta `dist/` con CSS y JS empaquetados y minificados.
- `npm test`: suite de pruebas automatizadas sobre JSDOM.

## Despliegue
Sube la carpeta `dist/` a Netlify o Cloudflare Pages (ambos leen `_headers`). En Vercel, traduce `_headers` a `vercel.json`.
