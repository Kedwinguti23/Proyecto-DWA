// Capa de API e integración de datos para Historias Fantásticas (v2.0)
// Diseñada para ser completamente intercambiable: simula persistencia local mediante localStorage y books.json.
// Cada función simula endpoints REST / llamadas asíncronas hacia el backend futuro.

const STORAGE_KEYS = {
  BOOKS: 'hf_books_override',
  ORDERS: 'hf_orders',
  SUBSCRIPTIONS: 'hf_subscriptions',
  WRITERS: 'hf_writers_override',
  COLLECTIONS: 'hf_collections_override'
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

// Carga inicial desde books.json
let cachedRawData = null;
async function fetchBaseData() {
  if (cachedRawData) return cachedRawData;
  const basePath = location.pathname.includes('/admin') ? '../data/books.json' : 'data/books.json';
  const res = await fetch(basePath);
  if (!res.ok) throw new Error('No se pudo cargar data/books.json');
  cachedRawData = await res.json();
  return cachedRawData;
}

/**
 * Obtiene todos los libros del catálogo, aplicando modificaciones locales del admin y calculando ofertas activas.
 * // MOCK: reemplazar por llamada HTTP al backend (GET /api/books)
 */
export async function getBooks() {
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
export async function getBook(id) {
  const books = await getBooks();
  return books.find(b => b.id === id) || null;
}

/**
 * Obtiene todas las colecciones temáticas con su eslogan y lista de libros.
 * // MOCK: reemplazar por llamada HTTP al backend (GET /api/collections)
 */
export async function getCollections() {
  const base = await fetchBaseData();
  let collections = [...base.collections];
  try {
    const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.COLLECTIONS) || '[]');
    if (Array.isArray(custom) && custom.length > 0) {
      const map = new Map(custom.map(c => [c.id, c]));
      collections = collections.map(c => map.get(c.id) || c);
    }
  } catch (_) {}
  return collections;
}

/**
 * Obtiene la lista de escritores emergentes.
 * // MOCK: reemplazar por llamada HTTP al backend (GET /api/writers)
 */
export async function getWriters() {
  const base = await fetchBaseData();
  let writers = [...(base.writers || [])];
  try {
    const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.WRITERS) || '[]');
    if (Array.isArray(custom) && custom.length > 0) {
      const map = new Map(custom.map(w => [w.id, w]));
      writers = writers.map(w => map.get(w.id) || w);
      custom.forEach(w => {
        if (!writers.some(x => x.id === w.id)) writers.push(w);
      });
    }
  } catch (_) {}
  return writers;
}

/**
 * Registra un nuevo pedido y retorna el objeto con su identificador único HF-AAAAMMDD-XXXX.
 * // MOCK: reemplazar por llamada HTTP al backend (POST /api/orders)
 */
export async function createOrder(orderInput) {
  // Validar libros y disponibilidad
  const books = await getBooks();
  const booksMap = new Map(books.map(b => [b.id, b]));

  for (const item of orderInput.items) {
    const b = booksMap.get(item.id);
    if (!b) throw new Error(`El libro "${item.id}" no existe.`);
    if (!b.available) throw new Error(`El libro "${b.title}" se encuentra agotado.`);
  }

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
    customerName: orderInput.customerName.trim(),
    customerPhone: orderInput.customerPhone.trim(),
    deliveryType: orderInput.deliveryType, // 'retiro' | 'envio'
    address: orderInput.address ? orderInput.address.trim() : '',
    notes: orderInput.notes ? orderInput.notes.trim() : '',
    items: orderInput.items.map(it => {
      const b = booksMap.get(it.id);
      return {
        id: it.id,
        title: b.title,
        author: b.author,
        format: it.format,
        qty: it.qty,
        price: it.price
      };
    }),
    total: orderInput.total
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

  const existing = subs.find(s => s.email === normalizedEmail);
  if (existing) {
    existing.active = true;
    existing.subscribedAt = new Date().toISOString();
  } else {
    subs.push({
      email: normalizedEmail,
      consent: true,
      active: true,
      subscribedAt: new Date().toISOString()
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

export async function adminSaveBook(book) {
  const books = await getBooks();
  const idx = books.findIndex(b => b.id === book.id);
  if (idx >= 0) {
    books[idx] = { ...books[idx], ...book };
  } else {
    books.unshift(book);
  }
  localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
  return book;
}

export async function adminDeleteBook(bookId) {
  let books = await getBooks();
  books = books.filter(b => b.id !== bookId);
  localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
  return { ok: true, id: bookId };
}

export async function adminToggleAvailability(bookId) {
  const books = await getBooks();
  const book = books.find(b => b.id === bookId);
  if (book) {
    book.available = !book.available;
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    return book;
  }
  throw new Error('Libro no encontrado');
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