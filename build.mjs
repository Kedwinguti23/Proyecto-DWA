import {build} from 'esbuild';
import {cpSync, rmSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';

// PENDIENTE P06: dominio definitivo. Un único lugar para canonical, OG, sitemap, robots y JSON-LD.
const PLACEHOLDER = 'https://historiasfantasticas.example';
const SITE_URL = (process.env.SITE_URL || PLACEHOLDER).replace(/\/$/, '');

rmSync('dist', {recursive: true, force: true});
mkdirSync('dist', {recursive: true});

// 1. Bundle JS y CSS
await build({
  entryPoints: {
    'css/main': 'css/main.css',
    'css/admin': 'css/admin.css',
    'js/main': 'js/main.js',
    'js/section': 'js/section.js',
    'admin/admin': 'admin/admin.js'
  },
  outdir: 'dist',
  bundle: true,
  minify: true,
  target: ['es2020'],
  format: 'esm',
  external: ['*.woff2'],
  legalComments: 'none'
});

// 2. Copiar assets estáticos
for (const f of ['data', 'assets', '_headers']) {
  cpSync(f, 'dist/' + f, {recursive: true});
}
writeFileSync('dist/robots.txt',
  readFileSync('robots.txt', 'utf8').replaceAll(PLACEHOLDER, SITE_URL), 'utf8');

// 3. Normalizar el dominio en la raíz y en el panel
const BASE_HTML = readFileSync('index.html', 'utf8').replaceAll(PLACEHOLDER, SITE_URL);
writeFileSync('dist/index.html', BASE_HTML, 'utf8');
mkdirSync('dist/admin', {recursive: true});
cpSync('admin/index.html', 'dist/admin/index.html');

// 4. Generador de páginas estáticas (opción A — build.mjs, RF SEO)
// Cada sub-página comparte la misma SPA con metadatos propios para SEO.
const BASE_HTML = readFileSync('index.html', 'utf8');

const pages = [
  {
    slug: 'catalogo',
    section: 'catalogo',
    title: 'Catálogo de Libros',
    h1: 'Explora nuestro catálogo de libros',
    lead: 'Filtra por género, formato, autor y precio para encontrar tu próxima lectura.',
    description: 'Explora el catálogo completo de libros físicos y ebooks de Historias Fantásticas. Filtra por género, formato, autor y precio.'
  },
  {
    slug: 'colecciones',
    section: 'mas-vendidos',
    title: 'Colecciones Temáticas',
    h1: 'Colecciones temáticas para cada lector',
    lead: 'Mundos por explorar, misterios y lecturas breves reunidos en una sola lista.',
    description: 'Descubre las colecciones temáticas de Historias Fantásticas: mundos por explorar, misterio, fantasía y más.'
  },
  {
    slug: 'ofertas',
    section: 'ofertas',
    title: 'Ofertas Vigentes',
    h1: 'Ofertas vigentes',
    lead: 'Libros con descuento por tiempo limitado, en físico y ebook.',
    description: 'Libros con descuento en Historias Fantásticas. Ofertas por tiempo limitado en libros físicos y ebooks.'
  },
  {
    slug: 'escritores',
    section: 'escritores',
    title: 'Escritores Emergentes',
    h1: 'Escritores y nuevas voces',
    lead: 'Autores del catálogo y un espacio abierto a nuevas voces salvadoreñas.',
    description: 'Conoce a los autores del catálogo de Historias Fantásticas y postúlate para publicar tu obra en San Miguel.'
  },
  {
    slug: 'contacto',
    section: 'contacto',
    title: 'Contacto',
    h1: 'Escríbenos por WhatsApp',
    lead: 'Atendemos pedidos y consultas de lunes a sábado, de 8:00 a. m. a 8:00 p. m.',
    description: 'Contáctanos por WhatsApp. Horario: lunes a sábado 8 a. m. a 8 p. m. Colonia Vista Hermosa, San Miguel, El Salvador.'
  }
];
/**
 * Genera una variante de index.html con metadatos, H1 y datos estructurados propios.
 * Las rutas se reescriben con "../" porque la página vive en /slug/; el prefix
 * se comunica a la SPA mediante <meta name="hf-base"> para que fetch y el logo
 * sigan apuntando a la raíz. El scroll se hace con un script externo (CSP).
 */
function makePage({ slug, title, description, section, h1, lead }) {
  const canonical = `${SITE_URL}/${slug}/`;
  let html = BASE_HTML
    .replace(/<title>[^<]*<\/title>/, `<title>${title} | Historias Fantásticas</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${description}"`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${canonical}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${title} | Historias Fantásticas"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${canonical}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${description}"`)
    .replace(/<h1>[^<]*<\/h1>/, `<h1>${h1}</h1>`)
    .replace(/(<p class="muted">)Libros físicos con envío rápido y ebooks con descarga inmediata\.(<\/p>)/, `$1${lead}$2`)
    // Rutas relativas a la raíz desde /slug/
    .replace(/(href|src)="(assets|css|js)\//g, '$1="../$2/');

  // Prefijo de rutas y sección objetivo para js/section.js
  html = html.replace(/(<meta name="viewport"[^>]*>)/,
    `$1\n  <meta name="hf-base" content="../">\n  <meta name="hf-section" content="${section}">`);

  // WebPage propio por página: evita que las 5 variantes compartan el mismo @id
  const ldTag = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (ldTag) {
    try {
      const data = JSON.parse(ldTag[1]);
      data['@graph'].push({
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: `${title} | Historias Fantásticas`,
        description,
        isPartOf: {'@id': `${SITE_URL}/#tienda`}
      });
      html = html.replace(ldTag[0], `<script type="application/ld+json">${JSON.stringify(data)}</script>`);
    } catch (_) {}
  }

for (const page of pages) {
  const dir = `dist/${page.slug}`;
  mkdirSync(dir, {recursive: true});
  writeFileSync(`${dir}/index.html`, makePage(page), 'utf8');
}

// 5. Actualizar sitemap.xml con las nuevas URLs
const sitemapBase = readFileSync('sitemap.xml', 'utf8').replaceAll(PLACEHOLDER, SITE_URL);
const today = new Date().toISOString().split('T')[0];
const extraUrls = pages.map(p =>
  `  <url>\n    <loc>${SITE_URL}/${p.slug}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
).join('\n');
const updatedSitemap = sitemapBase.replace('</urlset>', extraUrls + '\n</urlset>');
writeFileSync('dist/sitemap.xml', updatedSitemap, 'utf8');

console.log('Build listo en dist/');
console.log('Páginas generadas:', pages.map(p => `/${p.slug}/`).join(', '));
