// Carga y normaliza el catálogo consumiendo la capa desacoplada js/api.js
import {getBooks, getCollections, getWriters} from './api.js';

export async function loadCatalog() {
  const [rawBooks, rawCollections, writers] = await Promise.all([
    getBooks(),
    getCollections(),
    getWriters()
  ]);

  const books = rawBooks.map(b => {
    return {
      id: String(b.id),
      t: String(b.title),
      a: String(b.author),
      authorId: b.authorId || '',
      p: b.physicalPrice,
      e: b.ebookPrice,
      bg: b.cover.bg,
      fg: b.cover.fg,
      f: (b.isNew ? 'n' : '') + (b.bestseller ? 'b' : '') + (b.featured ? 'f' : ''),
      c: Array.isArray(b.collections) ? b.collections : (b.collection ? [b.collection] : []),
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
