import {build} from 'esbuild';
import {cpSync, rmSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';

rmSync('dist', {recursive: true, force: true});
mkdirSync('dist', {recursive: true});

// 1. Bundle JS y CSS
await build({
  entryPoints: {'css/main': 'css/main.css', 'js/main': 'js/main.js'},
  outdir: 'dist',
  bundle: true,
  minify: true,
  target: ['es2020'],
  format: 'esm',
  external: ['*.woff2'],
  legalComments: 'none'
});

// 2. Copiar assets estáticos
for (const f of ['data', 'assets', 'robots.txt', 'sitemap.xml', '_headers']) {
  cpSync(f, 'dist/' + f, {recursive: true});
}

// 3. Leer index.html base y distribuirla como raíz
cpSync('index.html', 'dist/index.html');

// 4. Generador de páginas estáticas (opción A — build.mjs, RF SEO)
// Cada sub-página comparte la misma SPA con metadatos propios para SEO.
const BASE_HTML = readFileSync('index.html', 'utf8');

/**
 * Genera una variante de index.html con title, description y canonical distintos.
 * El JS de la SPA se encarga de mostrar la sección correcta según la URL hash
 * o el pathname; para las páginas estáticas inyectamos un script de redirección
 * mínimo que hace scroll a la sección al cargar.
 */
function makePage({ slug, title, description, section }) {
  const canonical = `https://historiasfantasticas.example/${slug}/`;
  let html = BASE_HTML
    .replace(/<title>[^<]*<\/title>/, `<title>${title} | Historias Fantásticas</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${description}"`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${canonical}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${title} | Historias Fantásticas"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${canonical}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${description}"`);

  // Script de scroll automático a la sección al cargar la página estática
  const scrollScript = `<script>
(function(){
  var id="${section}";
  function go(){var el=document.getElementById(id);if(el)el.scrollIntoView({behavior:"auto"})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();
</script>`;
  html = html.replace('</body>', scrollScript + '\n</body>');
  return html;
}

const pages = [
  {
    slug: 'catalogo',
    section: 'catalogo',
    title: 'Catálogo de Libros',
    description: 'Explora el catálogo completo de libros físicos y ebooks de Historias Fantásticas. Filtra por género, formato, autor y precio.'
  },
  {
    slug: 'colecciones',
    section: 'mas-vendidos',
    title: 'Colecciones Temáticas',
    description: 'Descubre las colecciones temáticas de Historias Fantásticas: mundos por explorar, misterio, fantasía y más.'
  },
  {
    slug: 'ofertas',
    section: 'ofertas',
    title: 'Ofertas Vigentes',
    description: 'Libros con descuento en Historias Fantásticas. Ofertas por tiempo limitado en libros físicos y ebooks.'
  },
  {
    slug: 'escritores',
    section: 'escritores',
    title: 'Escritores Emergentes',
    description: 'Conoce a los autores emergentes de Historias Fantásticas. Publica tu obra y llega a nuevos lectores en San Miguel.'
  },
  {
    slug: 'contacto',
    section: 'contacto',
    title: 'Contacto',
    description: 'Contáctanos por WhatsApp. Horario: lunes a sábado 8 a. m. a 8 p. m. Colonia Vista Hermosa, San Miguel, El Salvador.'
  }
];

for (const page of pages) {
  const dir = `dist/${page.slug}`;
  mkdirSync(dir, {recursive: true});
  writeFileSync(`${dir}/index.html`, makePage(page), 'utf8');
}

// 5. Actualizar sitemap.xml con las nuevas URLs
const sitemapBase = readFileSync('sitemap.xml', 'utf8');
const today = new Date().toISOString().split('T')[0];
const extraUrls = pages.map(p =>
  `  <url>\n    <loc>https://historiasfantasticas.example/${p.slug}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
).join('\n');
const updatedSitemap = sitemapBase.replace('</urlset>', extraUrls + '\n</urlset>');
writeFileSync('dist/sitemap.xml', updatedSitemap, 'utf8');

console.log('Build listo en dist/');
console.log('Páginas generadas:', pages.map(p => `/${p.slug}/`).join(', '));
