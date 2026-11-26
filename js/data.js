// Carga y normaliza el catálogo consumiendo la capa desacoplada js/api.js
import {getBooks, getCollections, getWriters} from './api.js';

export async function loadCatalog() {
  const [rawBooks, rawCollections, writers] = await Promise.all([
    getBooks(),
    getCollections(),
    getWriters()
  ]);

  // Las portadas viven en assets/Portadas de libros. En las páginas generadas
  // hay que anteponer "../" para que la ruta siga apuntando a la raíz.
  const base = document.querySelector('meta[name="hf-base"]')?.content || '';
  const collectionNames = new Map(rawCollections.map(c => [c.id, c.name]));

  // Las tarjetas usan miniaturas; la ficha y el hero conservan la portada original.
  const thumbOf = path => path.replace(/\/([^/]+)\.webp$/, '/thumbs/$1.webp');

  const books = rawBooks.map(b => {
    const colIds = Array.isArray(b.collections) ? b.collections : (b.collection ? [b.collection] : []);
    const cover = b.cover?.image ? `${base}${b.cover.image}` : '';
    return {
      id: String(b.id),
      t: String(b.title),
      a: String(b.author),
      authorId: b.authorId || '',
      p: b.physicalPrice,
      e: b.ebookPrice,
      img: cover ? thumbOf(cover) : '',
      imgFull: cover,
      imgW: Number(b.cover?.width) || 400,
      imgH: Number(b.cover?.height) || 600,
      bg: b.cover?.bg || '#2B1B7A',
      fg: b.cover?.fg || '#FFC800',
      f: (b.isNew ? 'n' : '') + (b.bestseller ? 'b' : '') + (b.featured ? 'f' : ''),
      c: colIds,
      cn: colIds.map(id => collectionNames.get(id) || id),
      d: Number(b.discountPct) || 0,
      g: b.genres || [],
      h: b.themes || [],
      n: Number(b.pages) || 0,
      readingTime: Number(b.readingTime) || 0,
      synopsis: b.synopsis || '',
      available: b.available !== false,
      ebookAuthorized: Boolean(b.ebookAuthorized),
      mq: b.quiz ? [b.quiz.mood, b.quiz.pace] : ['', '']
    };
  });

  return {
    books,
    collections: rawCollections,
    writers
  };
}
