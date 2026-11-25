// Panel de Administración Simulado — Historias Fantásticas (T-04)
// MOCK: reemplazar por llamada HTTP al backend cuando exista autenticación y API real.

import {
  getOrders,
  updateOrderStatus,
  getBooks,
  adminSaveBook,
  getSubscriptions,
  unsubscribe,
  adminDeleteSubscription
} from '../js/api.js';

const ORDER_STATUSES = ['Nuevo', 'Confirmado', 'Pagado', 'Entregado', 'Cancelado'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let allBooks = [];
let toastTimer;

function showToast(msg) {
  const t = $('#admToast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
}

function money(n) {
  return '$' + Number(n || 0).toFixed(2);
}

// ── Navegación por pestañas ──────────────────────────────────
function initTabs() {
  const tabs = $$('[role="tab"]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        const active = t === tab;
        t.setAttribute('aria-selected', String(active));
        const panel = $('#' + t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !active;
      });
    });
  });
}

// ── Pestaña 1: Pedidos ───────────────────────────────────────
async function renderOrders() {
  // MOCK: reemplazar por llamada HTTP al backend (GET /api/orders)
  const orders = (await getOrders()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  $('#countOrders').textContent = orders.length;

  const container = $('#ordersList');
  if (!orders.length) {
    container.innerHTML = `
      <div class="adm-empty">
        <h3>No hay pedidos registrados todavía</h3>
        <p class="adm-muted">Los pedidos realizados desde el carrito de la tienda aparecerán aquí.</p>
      </div>`;
    return;
  }

  container.replaceChildren(...orders.map(order => {
    const card = document.createElement('article');
    card.className = 'adm-card';

    const itemsHtml = (order.items || [])
      .map(it => `<li>${it.title} (${it.format === 'ebook' ? 'Ebook' : 'Físico'}) × ${it.qty} — <strong>${money(it.price * it.qty)}</strong></li>`)
      .join('');

    const delivery = order.deliveryType === 'envio'
      ? `Envío a domicilio (${order.address || 'sin dirección'})`
      : 'Retiro en local';

    card.innerHTML = `
      <div class="adm-card__top">
        <div>
          <span class="adm-code">${order.id}</span>
          <p class="adm-muted">${formatDate(order.createdAt)}</p>
        </div>
        <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
          <strong>Total: ${money(order.total)}</strong>
          <label>
            <span class="sr-only">Estado del pedido ${order.id}</span>
            <select class="adm-select" data-order-id="${order.id}"></select>
          </label>
        </div>
      </div>
      <div>
        <p style="margin:0 0 .25rem"><strong>Cliente:</strong> ${order.customerName} · ${order.customerPhone}</p>
        <p class="adm-muted" style="margin:0 0 .5rem"><strong>Entrega:</strong> ${delivery}${order.notes ? ' · <strong>Notas:</strong> ' + order.notes : ''}</p>
        <ul class="adm-order-items">${itemsHtml}</ul>
      </div>
    `;

    const sel = card.querySelector('select');
    ORDER_STATUSES.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      opt.selected = order.status === st;
      sel.append(opt);
    });

    sel.addEventListener('change', async () => {
      try {
        await updateOrderStatus(order.id, sel.value);
        showToast(`Pedido ${order.id} actualizado a "${sel.value}"`);
      } catch (err) {
        showToast('Error al actualizar estado: ' + err.message);
      }
    });

    return card;
  }));
}

// ── Pestaña 2: Catálogo ──────────────────────────────────────
async function renderBooks(query = '') {
  // MOCK: reemplazar por llamada HTTP al backend (GET /api/books)
  allBooks = await getBooks();
  $('#countBooks').textContent = allBooks.length;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? allBooks.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
    : allBooks;

  const wrap = $('#booksList');
  if (!filtered.length) {
    wrap.innerHTML = '<div class="adm-empty"><p class="adm-muted">No se encontraron libros con esa búsqueda.</p></div>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Libro</th>
        <th>Físico</th>
        <th>Ebook</th>
        <th>Estado</th>
        <th>Oferta</th>
        <th>Acción</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  filtered.forEach(book => {
    const tr = document.createElement('tr');
    const offerText = book.offer && book.offer.percent > 0
      ? `<span class="adm-tag adm-tag--offer">-${book.offer.percent}%</span><br><span class="adm-muted">${book.offer.start || '—'} a ${book.offer.end || '—'}</span>`
      : '<span class="adm-muted">Sin oferta</span>';

    tr.innerHTML = `
      <td>
        <div class="adm-book-cell">
          <span class="adm-swatch" style="background:${book.cover?.bg || '#6C4DF6'};color:${book.cover?.fg || '#fff'}" aria-hidden="true">HF</span>
          <div>
            <strong>${book.title}</strong><br>
            <span class="adm-muted">${book.author}</span>
          </div>
        </div>
      </td>
      <td>${book.physicalPrice > 0 ? money(book.physicalPrice) : '—'}</td>
      <td>${book.ebookAuthorized && book.ebookPrice > 0 ? money(book.ebookPrice) : '—'}</td>
      <td>
        <span class="adm-tag ${book.available ? '' : 'adm-tag--out'}">
          ${book.available ? 'Disponible' : 'Agotado'}
        </span>
      </td>
      <td>${offerText}</td>
      <td><button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-edit="${book.id}">Editar</button></td>
    `;

    tr.querySelector('[data-edit]').addEventListener('click', () => openEditDialog(book));
    tbody.append(tr);
  });

  wrap.replaceChildren(table);
}

function openEditDialog(book) {
  const dlg = $('#editBookDlg');
  $('#editId').value = book.id;
  $('#editBookMeta').textContent = `${book.title} — ${book.author}`;
  $('#editPhysical').value = book.physicalPrice || 0;
  $('#editEbook').value = book.formats?.ebook?.price || book.ebookPrice || 0;
  $('#editAvailable').checked = book.available !== false;
  $('#editEbookAuth').checked = Boolean(book.ebookAuthorized);
  $('#editOfferPct').value = book.offer?.percent || 0;
  $('#editOfferStart').value = book.offer?.start || '';
  $('#editOfferEnd').value = book.offer?.end || '';
  dlg.showModal();
}

function initEditForm() {
  const dlg = $('#editBookDlg');
  const form = $('#editBookForm');

  $('#closeEditDlg').addEventListener('click', () => dlg.close());
  $('#cancelEditDlg').addEventListener('click', () => dlg.close());

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const id = $('#editId').value;
    const base = allBooks.find(b => b.id === id);
    if (!base) return;

    const phys = parseFloat($('#editPhysical').value) || 0;
    const ebook = parseFloat($('#editEbook').value) || 0;
    const pct = parseInt($('#editOfferPct').value, 10) || 0;
    const start = $('#editOfferStart').value;
    const end = $('#editOfferEnd').value;

    const formats = {};
    if (phys > 0) formats.physical = { price: phys };
    if (ebook > 0) formats.ebook = { price: ebook };

    const updated = {
      ...base,
      available: $('#editAvailable').checked,
      ebookAuthorized: $('#editEbookAuth').checked && ebook > 0,
      formats,
      offer: pct > 0 ? { percent: pct, start, end } : null
    };

    // MOCK: reemplazar por llamada HTTP al backend (PUT /api/books/:id)
    await adminSaveBook(updated);
    dlg.close();
    await renderBooks($('#bookSearch').value);
    showToast(`Libro "${base.title}" actualizado`);
  });
}

// ── Pestaña 3: Suscriptores ──────────────────────────────────
async function renderSubscribers() {
  // MOCK: reemplazar por llamada HTTP al backend (GET /api/subscriptions)
  const subs = await getSubscriptions();
  $('#countSubs').textContent = subs.filter(s => s.active !== false).length;

  const wrap = $('#subsList');
  if (!subs.length) {
    wrap.innerHTML = `
      <div class="adm-empty">
        <h3>Sin suscriptores todavía</h3>
        <p class="adm-muted">Los correos registrados en el formulario de newsletter aparecerán aquí.</p>
      </div>`;
    return;
  }

  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Correo electrónico</th>
        <th>Fecha de registro</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  subs.forEach(sub => {
    const tr = document.createElement('tr');
    const active = sub.active !== false;
    tr.innerHTML = `
      <td><strong>${sub.email}</strong></td>
      <td>${formatDate(sub.subscribedAt)}</td>
      <td><span class="adm-tag ${active ? '' : 'adm-tag--out'}">${active ? 'Activo' : 'Dado de baja'}</span></td>
      <td style="display:flex;gap:.4rem;flex-wrap:wrap">
        ${active ? `<button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-unsub="${sub.email}">Desuscribir</button>` : ''}
        <button type="button" class="adm-btn adm-btn--danger adm-btn--sm" data-del="${sub.email}">Eliminar</button>
      </td>
    `;

    tr.querySelector('[data-unsub]')?.addEventListener('click', async () => {
      await unsubscribe(sub.email);
      await renderSubscribers();
      showToast(`Suscripción cancelada para ${sub.email}`);
    });

    tr.querySelector('[data-del]').addEventListener('click', async () => {
      await adminDeleteSubscription(sub.email);
      await renderSubscribers();
      showToast(`Suscriptor ${sub.email} eliminado`);
    });

    tbody.append(tr);
  });

  wrap.replaceChildren(table);
}

// ── Inicio ───────────────────────────────────────────────────
initTabs();
initEditForm();
$('#refreshOrders').addEventListener('click', renderOrders);
$('#bookSearch').addEventListener('input', e => renderBooks(e.target.value));

(async () => {
  await Promise.all([renderOrders(), renderBooks(), renderSubscribers()]);
})();