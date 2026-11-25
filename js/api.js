// Capa de API e integración de datos para Historias Fantásticas (v2.0)
// Diseñada para ser completamente intercambiable: simula persistencia local mediante localStorage y books.json.
// Cada función simula endpoints REST / llamadas asíncronas hacia el backend futuro.

const STORAGE_KEYS = {
  BOOKS: 'hf_books_override',
  DELETED_BOOKS: 'hf_books_deleted',
  ORDERS: 'hf_orders',
  SUBSCRIPTIONS: 'hf_subscriptions',
  WRITERS: 'hf_writers_override',
  COLLECTIONS: 'hf_collections_override',
  WEEKLY_PICK: 'hf_weekly_pick'
};

// Utilidad para evaluar si una oferta por fechas está vigente hoy
export function isOfferActive(offer) {
  if (!offer || typeof offer.percent !== 'number' || offer.percent <= 0) return false;
  if (!offer.start || !offer.end) return true; // Si no tiene fechas, se asume permanente
  const now = new Date();
  const start = new Date(offer.start + 'T00:00:00');
  const end = new Date(offer.end + 'T23:59:59');
  return now >= start && now <= end;
}

// Prefijo de rutas: las páginas generadas y el panel viven un nivel por debajo de la raíz.
function basePath() {
  return document.querySelector('meta[name="hf-base"]')?.content || '';
}

// Carga inicial desde books.json
let cachedRawData = null;
async function fetchBaseData() {
  if (cachedRawData) return cachedRawData;
  const res = await fetch(`${basePath()}data/books.json`);
  if (!res.ok) throw new Error('No se pudo cargar data/books.json');
  cachedRawData = await res.json();
  return cachedRawData;
}

/**
 * Obtiene todos los libros del catálogo, aplicando modificaciones locales del admin y calculando ofertas activas.
 * // MOCK: reemplazar por llamada HTTP al backend (GET /api/books)
 */
export async function getBooks(options = {}) {
  const base = await fetchBaseData();
  let books = [...base.books];

  // Integrar modificaciones locales si existen
  try {
    const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS) || '[]');
    if (Array.isArray(custom) && custom.length > 0) {
      const customMap = new Map(custom.map(b => [b.id, b]));
      books = books.map(b => customMap.get(b.id) || b);
      // Agregar libros nuevos creados por el admin
      custom.forEach(b => {
        if (!books.some(existing => existing.id === b.id)) {
          books.push(b);
        }
      });
    }
  } catch (_) {}

  // Los libros eliminados por el administrador no vuelven a aparecer desde books.json.
  // Los ocultos siguen en la base pero no se muestran en la tienda (RF14).
  try {
    const deleted = JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_BOOKS) || '[]');
    if (Array.isArray(deleted) && deleted.length) {
      const removed = new Set(deleted);
      books = books.filter(b => !removed.has(b.id));
    }
  } catch (_) {}
  if (!options.includeHidden) books = books.filter(b => b.hidden !== true);

  // Normalizar campos y procesar ofertas por fecha
  return books.map(b => {
    const offerActive = isOfferActive(b.offer);
    const discountPct = offerActive ? Number(b.offer.percent) : 0;
    
    // Obtener precios
    let physPrice = 0;
    let ebookPrice = 0;
    if (b.formats) {
      if (typeof b.formats === 'object' && !Array.isArray(b.formats)) {
        physPrice = b.formats.physical ? Number(b.formats.physical.price) : 0;
        ebookPrice = (b.ebookAuthorized && b.formats.ebook) ? Number(b.formats.ebook.price) : 0;
      } else if (Array.isArray(b.formats)) {
        const pF = b.formats.find(x => x.type === 'fisico' || x.type === 'physical');
        const eF = b.formats.find(x => x.type === 'ebook');
        physPrice = pF ? Number(pF.price) : 0;
        ebookPrice = (b.ebookAuthorized && eF) ? Number(eF.price) : 0;
      }
    }

    return {
      ...b,
      available: b.available !== false,
      ebookAuthorized: Boolean(b.ebookAuthorized),
      discountPct,
      isOfferActive: offerActive,
      physicalPrice: physPrice,
      ebookPrice: ebookPrice
    };
  });
}

/**
 * Obtiene un libro específico por su identificador.
 * // MOCK: reemplazar por llamada HTTP al backend (GET /api/books/:id)
 */
export async function getBook(id, options = {}) {
  const books = await getBooks(options);
  return books.find(b => b.id === id) || null;
}

/**
 * Obtiene todas las colecciones temáticas con su eslogan y lista de libros.
 * // MOCK: reemplazar por llamada HTTP al backend (GET /api/collections)
 */
export async function getCollections() {
  const base = await fetchBaseData();
  // El panel guarda la lista completa: así se reflejan altas, ediciones y bajas.
  try {
    const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.COLLECTIONS) || 'null');
    if (Array.isArray(custom)) return custom;
  } catch (_) {}
  return [...base.collections];
}

/**
 * Obtiene la lista de escritores emergentes.
 * // MOCK: reemplazar por llamada HTTP al backend (GET /api/writers)
 */
export async function getWriters() {
  const base = await fetchBaseData();
  try {
    const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.WRITERS) || 'null');
    if (Array.isArray(custom)) return custom;
  } catch (_) {}
  return [...(base.writers || [])];
}

/**
 * Registra un nuevo pedido y retorna el objeto con su identificador único HF-AAAAMMDD-XXXX.
 * // MOCK: reemplazar por llamada HTTP al backend (POST /api/orders)
 */
export async function createOrder(orderInput) {
  // Validar datos del cliente (el "servidor" no confía en el navegador)
  const name = String(orderInput.customerName || '').trim();
  const phone = String(orderInput.customerPhone || '').trim();
  if (name.length < 2) throw new Error('Escribe tu nombre completo.');
  if (phone.replace(/\D/g, '').length < 8) throw new Error('Escribe un teléfono válido.');
  if (!['retiro', 'envio'].includes(orderInput.deliveryType)) throw new Error('Elige una forma de entrega.');
  if (orderInput.deliveryType === 'envio' && !String(orderInput.address || '').trim()) {
    throw new Error('Escribe la dirección de entrega.');
  }
  if (!Array.isArray(orderInput.items) || orderInput.items.length === 0) {
    throw new Error('Tu carrito está vacío.');
  }

  // Validar libros, formato y disponibilidad; recalcular precios y total
  const books = await getBooks();
  const booksMap = new Map(books.map(b => [b.id, b]));

  const items = orderInput.items.map(item => {
    const b = booksMap.get(item.id);
    if (!b) throw new Error(`El libro "${item.id}" no existe.`);
    if (!b.available) throw new Error(`El libro "${b.title}" se encuentra agotado.`);

    const isEbook = item.format === 'ebook';
    if (isEbook && (!b.ebookAuthorized || !b.ebookPrice)) {
      throw new Error(`"${b.title}" no tiene versión ebook autorizada.`);
    }
    if (!isEbook && !b.physicalPrice) {
      throw new Error(`"${b.title}" no tiene versión física.`);
    }

    const base = isEbook ? b.ebookPrice : b.physicalPrice;
    const price = Math.round(base * (100 - (b.discountPct || 0))) / 100;
    const qty = isEbook ? 1 : Math.max(1, Math.min(9, Number(item.qty) || 1));

    return {
      id: b.id,
      title: b.title,
      author: b.author,
      format: isEbook ? 'ebook' : 'fisico',
      qty,
      price
    };
  });

  const total = Math.round(items.reduce((sum, it) => sum + it.price * it.qty, 0) * 100) / 100;

  // Generar ID único: HF-AAAAMMDD-XXXX
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderId = `HF-${y}${m}${d}-${rand}`;

  const newOrder = {
    id: orderId,
    createdAt: now.toISOString(),
    status: 'Nuevo', // Estados: Nuevo, Confirmado, Pagado, Entregado, Cancelado
    customerName: name.slice(0, 120),
    customerPhone: phone.slice(0, 30),
    deliveryType: orderInput.deliveryType, // 'retiro' | 'envio'
    address: String(orderInput.address || '').trim().slice(0, 200),
    notes: String(orderInput.notes || '').trim().slice(0, 500),
    items,
    total
  };

  // Guardar en localStorage
  try {
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    orders.unshift(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch (_) {}

  return newOrder;
}

/**
 * Obtiene la lista de pedidos para el panel de administración.
 * // MOCK: reemplazar por llamada HTTP al backend (GET /api/orders)
 */
export async function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  } catch (_) {
    return [];
  }
}

/**
 * Actualiza el estado de un pedido (Nuevo, Confirmado, Pagado, Entregado, Cancelado).
 * // MOCK: reemplazar por llamada HTTP al backend (PATCH /api/orders/:id)
 */
export async function updateOrderStatus(orderId, newStatus) {
  const allowed = ['Nuevo', 'Confirmado', 'Pagado', 'Entregado', 'Cancelado'];
  if (!allowed.includes(newStatus)) throw new Error(`Estado no permitido: ${newStatus}`);

  const orders = await getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('Pedido no encontrado');

  order.status = newStatus;
  order.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch (_) {}

  return order;
}

/**
 * Registra una suscripción a la newsletter con consentimiento explícito.
 * // MOCK: reemplazar por llamada HTTP al backend (POST /api/subscriptions)
 */
export async function subscribe(email, consent) {
  if (!consent) throw new Error('Se requiere consentimiento explícito.');
  const normalizedEmail = email.trim().toLowerCase();

  let subs = [];
  try {
    subs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS) || '[]');
  } catch (_) {}

  const consentAt = new Date().toISOString();
  const existing = subs.find(s => s.email === normalizedEmail);
  if (existing) {
    existing.active = true;
    existing.consent = true;
    existing.subscribedAt = consentAt;
    existing.consentAt = consentAt;
  } else {
    subs.push({
      email: normalizedEmail,
      consent: true,
      active: true,
      subscribedAt: consentAt,
      consentAt
    });
  }

  try {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subs));
  } catch (_) {}

  return { ok: true, email: normalizedEmail };
}

/**
 * Cancela una suscripción a la newsletter.
 * // MOCK: reemplazar por llamada HTTP al backend (POST /api/subscriptions/unsubscribe)
 */
export async function unsubscribe(email) {
  const normalizedEmail = email.trim().toLowerCase();
  let subs = [];
  try {
    subs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS) || '[]');
  } catch (_) {}

  const sub = subs.find(s => s.email === normalizedEmail);
  if (sub) {
    sub.active = false;
    sub.unsubscribedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subs));
    } catch (_) {}
  }
  return { ok: true, email: normalizedEmail };
}

// -------------------------------------------------------------
// Operaciones de Administración (Simuladas en localStorage)
// // MOCK: reemplazar por llamadas HTTP protegidas con JWT al backend
// -------------------------------------------------------------

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '');
    return Array.isArray(value) ? value : fallback;
  } catch (_) {
    return fallback;
  }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (_) {}
}

export async function adminSaveBook(book) {
  if (!book || !book.id) throw new Error('El libro necesita un identificador.');
  const custom = readStorage(STORAGE_KEYS.BOOKS, []);
  const idx = custom.findIndex(b => b.id === book.id);
  if (idx >= 0) custom[idx] = {...custom[idx], ...book};
  else custom.push({...book});
  writeStorage(STORAGE_KEYS.BOOKS, custom);

  // Si se vuelve a crear un libro eliminado, quitamos la marca de borrado
  const deleted = readStorage(STORAGE_KEYS.DELETED_BOOKS, []);
  writeStorage(STORAGE_KEYS.DELETED_BOOKS, deleted.filter(id => id !== book.id));
  return book;
}

export async function adminDeleteBook(bookId) {
  const deleted = readStorage(STORAGE_KEYS.DELETED_BOOKS, []);
  if (!deleted.includes(bookId)) deleted.push(bookId);
  writeStorage(STORAGE_KEYS.DELETED_BOOKS, deleted);
  writeStorage(STORAGE_KEYS.BOOKS, readStorage(STORAGE_KEYS.BOOKS, []).filter(b => b.id !== bookId));
  return {ok: true, id: bookId};
}

export async function adminToggleAvailability(bookId) {
  const book = await getBook(bookId, {includeHidden: true});
  if (!book) throw new Error('Libro no encontrado');
  return adminSaveBook({...book, available: !book.available});
}

export async function adminSaveCollection(collection) {
  if (!collection || !collection.id) throw new Error('La colección necesita un identificador.');
  const all = await getCollections();
  const idx = all.findIndex(c => c.id === collection.id);
  if (idx >= 0) all[idx] = {...all[idx], ...collection};
  else all.push({...collection});
  writeStorage(STORAGE_KEYS.COLLECTIONS, all);
  return collection;
}

export async function adminDeleteCollection(collectionId) {
  const all = await getCollections();
  writeStorage(STORAGE_KEYS.COLLECTIONS, all.filter(c => c.id !== collectionId));
  return {ok: true, id: collectionId};
}

export async function adminSaveWriter(writer) {
  if (!writer || !writer.id) throw new Error('El escritor necesita un identificador.');
  const all = await getWriters();
  const idx = all.findIndex(w => w.id === writer.id);
  if (idx >= 0) all[idx] = {...all[idx], ...writer};
  else all.push({...writer});
  writeStorage(STORAGE_KEYS.WRITERS, all);
  return writer;
}

export async function adminDeleteWriter(writerId) {
  const all = await getWriters();
  writeStorage(STORAGE_KEYS.WRITERS, all.filter(w => w.id !== writerId));
  return {ok: true, id: writerId};
}

/** Lista de correos y consentimientos para el panel (RF12, RNF10). */
export async function getSubscriptions() {
  return readStorage(STORAGE_KEYS.SUBSCRIPTIONS, []);
}

/** Libro elegido para la recomendación semanal (RF12). */
export async function getWeeklyPick() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.WEEKLY_PICK) || 'null'); }
  catch (_) { return null; }
}

export async function setWeeklyPick(bookId) {
  const book = await getBook(bookId);
  if (!book) throw new Error('Libro no encontrado');
  const pick = {bookId, title: book.title, updatedAt: new Date().toISOString()};
  try { localStorage.setItem(STORAGE_KEYS.WEEKLY_PICK, JSON.stringify(pick)); }
  catch (_) {}
  return pick;
}

/** NUEVAS FUNCIONES ------------- T-04
 * Obtiene la lista de suscriptores de la newsletter.
 * // MOCK: reemplazar por llamada HTTP al backend (GET /api/subscriptions)
 */
export async function getSubscriptions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS) || '[]');
  } catch (_) {
    return [];
  }
}

/**
 * Elimina un suscriptor de la lista local.
 * // MOCK: reemplazar por llamada HTTP al backend (DELETE /api/subscriptions/:email)
 */
export async function adminDeleteSubscription(email) {
  const normalized = email.trim().toLowerCase();
  const subs = (await getSubscriptions()).filter(s => s.email !== normalized);
  try {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subs));
  } catch (_) {}
  return { ok: true, email: normalized };
}