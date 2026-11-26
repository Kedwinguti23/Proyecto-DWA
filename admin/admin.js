// Panel de administración MOCK (RF14, RF15, RNF09).
// Toda la persistencia pasa por js/api.js: cambiar la capa de datos no obliga a tocar esta UI.
import {$, $$, el, money} from '../js/utils.js';
import {login, logout, isAuthenticated} from '../js/auth.js';
import {CONFIG} from '../js/config.js';
import {
  getOrders, updateOrderStatus, getBooks, getBook, getCollections, getWriters,
  getSubscriptions, subscribe, unsubscribe, adminSaveBook, adminDeleteBook,
  adminToggleAvailability, adminSaveCollection, adminDeleteCollection,
  adminSaveWriter, adminDeleteWriter, getWeeklyPick, setWeeklyPick
} from '../js/api.js';

const STATUSES = ['Nuevo', 'Confirmado', 'Pagado', 'Entregado', 'Cancelado'];
const statusMsg = (text, error = false) => {
  const node = $('#adminStatus');
  node.textContent = text || '';
  node.style.color = error ? 'var(--coral)' : 'var(--teal-700)';
};
const slug = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const list = value => String(value || '').split(',').map(x => x.trim()).filter(Boolean);
const fmtDate = iso => {
  const d = new Date(iso);
  return isNaN(d) ? String(iso || '') : d.toLocaleString('es-SV', {dateStyle: 'medium', timeStyle: 'short'});
};
const btn = (label, onClick, cls = 'btn btn--sm') => {
  const b = el('button', cls, label);
  b.type = 'button';
  b.onclick = onClick;
  return b;
};
const row = (title, meta, actions, tags = []) => {
  const node = el('div', 'admin-row');
  const main = el('div', 'admin-row__main');
  main.append(el('strong', null, title));
  if (meta) main.append(el('div', 'admin-row__meta', meta));
  if (tags.length) {
    const wrap = el('div');
    tags.forEach(t => wrap.append(el('span', `admin-tag${t.tone ? ' admin-tag--' + t.tone : ''}`, t.label)));
    main.append(wrap);
  }
  const acts = el('div', 'admin-row__actions');
  actions.forEach(a => acts.append(a));
  node.append(main, acts);
  return node;
};
// Confirmación en dos pasos (evita borrados accidentales y es accesible sin window.confirm)
const deleteBtn = onConfirm => {
  let armed = false;
  const b = btn('Eliminar', async () => {
    if (!armed) { armed = true; b.textContent = '¿Confirmar borrado?'; return; }
    await onConfirm();
  });
  return b;
};

// ---------------------------------------------------------------- login
function enterPanel() {
  $('#loginView').hidden = true;
  $('#adminView').hidden = false;
  selectTab('pedidos');
  refreshAll();
}
$('#loginForm').addEventListener('submit', e => {
  e.preventDefault();
  try {
    login($('#loginUser').value, $('#loginPass').value);
    $('#loginErr').textContent = '';
    $('#loginPass').value = '';
    enterPanel();
  } catch (err) {
    $('#loginErr').textContent = err.message;
  }
});
$('#logoutBtn').onclick = () => {
  logout();
  $('#adminView').hidden = true;
  $('#loginView').hidden = false;
  $('#loginPass').value = '';
};
if (isAuthenticated()) enterPanel();

// ---------------------------------------------------------------- tabs
function selectTab(tab) {
  $$('.admin-tab').forEach(x => x.setAttribute('aria-selected', String(x.dataset.tab === tab)));
  $$('.admin-section').forEach(s => { s.hidden = s.id !== `tab-${tab}`; });
  refreshTab(tab);
}
$$('.admin-tab').forEach(tab => { tab.onclick = () => selectTab(tab.dataset.tab); });
async function refreshAll() {
  await Promise.all([renderOrders(), renderBooks(), renderCollections(), renderWriters(),
    renderOffers(), renderPick(), renderSubs()]);
}
async function refreshTab(tab) {
  const views = {
    pedidos: renderOrders, catalogo: renderBooks, colecciones: renderCollections,
    escritores: renderWriters, ofertas: renderOffers, recomendacion: renderPick,
    suscriptores: renderSubs
  };
  await (views[tab] || renderOrders)();
}

// ---------------------------------------------------------------- pedidos
$('#orderStatusFilter').onchange = () => renderOrders();
$('#orderDateFilter').onchange = () => renderOrders();
$('#orderRefreshBtn').onclick = () => renderOrders();

async function renderOrders() {
  const box = $('#ordersList');
  box.replaceChildren();
  try {
    const orders = await getOrders();
    const status = $('#orderStatusFilter').value;
    const date = $('#orderDateFilter').value;
    const visible = orders.filter(o =>
      (!status || o.status === status) && (!date || String(o.createdAt || '').slice(0, 10) === date));

    if (!visible.length) {
      box.append(el('p', 'admin-empty', 'No hay pedidos que coincidan con los filtros.'));
      return;
    }
    visible.forEach(o => {
      const meta = `${fmtDate(o.createdAt)} · ${o.customerName} · ${money(Number(o.total) || 0)}`;
      box.append(row(`Pedido ${o.id}`, meta,
        [btn('Ver detalle', () => showOrderDetail(o.id))],
        [{label: o.status, tone: o.status === 'Cancelado' ? 'off' : ''}]));
    });
  } catch (err) { statusMsg(err.message, true); }
}

async function showOrderDetail(id) {
  const order = (await getOrders()).find(o => o.id === id);
  if (!order) return;
  const box = $('#orderDetail');
  box.replaceChildren();
  box.hidden = false;
  box.append(el('h3', null, `Detalle del pedido ${order.id}`));

  const dl = el('dl');
  const add = (key, value) => { dl.append(el('dt', null, key), el('dd', null, String(value ?? ''))); };
  add('Fecha', fmtDate(order.createdAt));
  add('Cliente', order.customerName);
  add('Teléfono', order.customerPhone);
  add('Entrega', order.deliveryType === 'envio' ? `Envío a ${order.address}` : 'Retiro en el local');
  if (order.notes) add('Notas', order.notes);
  add('Total', money(Number(order.total) || 0));
  box.append(dl);

  const ul = el('ul');
  (order.items || []).forEach(it => ul.append(el('li', null,
    `${it.title} (${it.format === 'ebook' ? 'Ebook' : 'Físico'}) x${it.qty} — ${money(it.price * it.qty)}`)));
  box.append(el('strong', null, 'Libros'), ul);

  const digits = String(order.customerPhone || '').replace(/\D/g, '');
  // wa.me espera el número con indicativo; el formulario pide 8 dígitos locales.
  const phone = digits.length <= 8 ? CONFIG.whatsapp.countryCode + digits : digits;
  const wa = el('a', 'btn btn--sm', 'Abrir chat de WhatsApp');
  wa.href = `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${order.customerName}, te escribo sobre tu pedido ${order.id}.`)}`;
  wa.target = '_blank';
  wa.rel = 'noopener noreferrer';

  const select = el('select');
  STATUSES.forEach(s => {
    const op = el('option', null, s);
    op.value = s;
    if (s === order.status) op.selected = true;
    select.append(op);
  });
  const apply = btn('Cambiar estado', async () => {
    try {
      await updateOrderStatus(order.id, select.value);
      statusMsg(`Pedido ${order.id} actualizado a ${select.value}`);
      await renderOrders();
      await showOrderDetail(order.id);
    } catch (err) { statusMsg(err.message, true); }
  }, 'btn btn--sm btn--sun');

  const actions = el('div', 'admin-actions');
  actions.append(wa, select, apply, btn('Cerrar detalle', () => { box.hidden = true; }));
  box.append(actions);
}

// ---------------------------------------------------------------- catálogo
async function renderBooks() {
  const box = $('#booksAdminList');
  box.replaceChildren();
  try {
    const books = await getBooks({includeHidden: true});
    books.forEach(b => {
      const meta = `${b.author} · ${money(b.physicalPrice || 0)}${b.ebookPrice ? ' / ebook ' + money(b.ebookPrice) : ''} · ${b.pages || 0} pág.`;
      const tags = [{label: b.available ? 'Disponible' : 'Agotado', tone: b.available ? '' : 'off'}];
      if (b.hidden) tags.push({label: 'Oculto', tone: 'off'});
      if (b.offer) tags.push({label: `${b.isOfferActive ? 'Vigente' : 'Programada'} -${b.offer.percent}%`, tone: 'warn'});
      const actions = [
        btn('Editar', () => fillBookForm(b)),
        btn(b.hidden ? 'Mostrar' : 'Ocultar', async () => {
          await adminSaveBook({...b, hidden: !b.hidden});
          statusMsg(b.hidden ? 'Libro visible en la tienda' : 'Libro oculto de la tienda');
          await renderBooks();
        }),
        btn(b.available ? 'Marcar agotado' : 'Marcar disponible', async () => {
          await adminToggleAvailability(b.id);
          statusMsg('Disponibilidad actualizada');
          await Promise.all([renderBooks(), renderOffers()]);
        }),
        deleteBtn(async () => {
          await adminDeleteBook(b.id);
          statusMsg('Libro eliminado del catálogo');
          await Promise.all([renderBooks(), renderOffers(), fillSelects()]);
        })
      ];
      box.append(row(b.title, meta, actions, tags));
    });
  } catch (err) { statusMsg(err.message, true); }
}

function setCheck(id, value) { $(id).checked = Boolean(value); }
function fillBookForm(b) {
  $('#bookFormTitle').textContent = `Editar: ${b.title}`;
  $('#bId').value = b.id || '';
  $('#bTitle').value = b.title || '';
  $('#bAuthor').value = b.author || '';
  $('#bAuthorId').value = b.authorId || '';
  $('#bGenres').value = (b.genres || []).join(', ');
  $('#bThemes').value = (b.themes || []).join(', ');
  $('#bCollections').value = (b.collections || []).join(', ');
  $('#bPages').value = b.pages || 0;
  $('#bReadingTime').value = b.readingTime || 0;
  $('#bPhysical').value = b.physicalPrice || 0;
  $('#bEbook').value = b.ebookPrice || 0;
  $('#bOfferPct').value = b.offer ? b.offer.percent : 0;
  $('#bOfferStart').value = b.offer?.start || '';
  $('#bOfferEnd').value = b.offer?.end || '';
  $('#bCover').value = b.cover?.image || '';
  $('#bBg').value = b.cover?.bg || '#2B1B7A';
  $('#bFg').value = b.cover?.fg || '#FFC800';
  $('#bMood').value = b.quiz?.mood || '';
  $('#bPace').value = b.quiz?.pace || '';
  $('#bSynopsis').value = b.synopsis || '';
  setCheck('#bAvailable', b.available !== false);
  setCheck('#bHidden', b.hidden);
  setCheck('#bEbookAuth', b.ebookAuthorized);
  setCheck('#bIsNew', b.isNew);
  setCheck('#bBest', b.bestseller);
  setCheck('#bFeature', b.featured);
  $('#bookForm').hidden = false;
}
$('#newBookBtn').onclick = () => {
  $('#bookForm').reset();
  $('#bookFormTitle').textContent = 'Nuevo libro';
  $('#bId').value = '';
  $('#bBg').value = '#2B1B7A';
  $('#bFg').value = '#FFC800';
  setCheck('#bAvailable', true);
  setCheck('#bHidden', false);
  $('#bookForm').hidden = false;
  $('#bTitle').focus();
};
$('#bookCancel').onclick = () => { $('#bookForm').hidden = true; };

$('#bookForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const id = $('#bId').value.trim() || slug($('#bTitle').value);
    if (!id) throw new Error('Escribe un título o un ID para el libro.');
    const physical = Number($('#bPhysical').value) || 0;
    const ebook = Number($('#bEbook').value) || 0;
    const pct = Number($('#bOfferPct').value) || 0;
    const book = {
      id,
      title: $('#bTitle').value.trim(),
      author: $('#bAuthor').value.trim(),
      authorId: $('#bAuthorId').value.trim(),
      genres: list($('#bGenres').value),
      themes: list($('#bThemes').value),
      collections: list($('#bCollections').value),
      pages: Number($('#bPages').value) || 0,
      readingTime: Number($('#bReadingTime').value) || 0,
      available: $('#bAvailable').checked,
      hidden: $('#bHidden').checked,
      ebookAuthorized: $('#bEbookAuth').checked,
      formats: {
        ...(physical > 0 ? {physical: {price: physical}} : {}),
        ...(ebook > 0 ? {ebook: {price: ebook}} : {})
      },
      cover: {
        ...($('#bCover').value.trim() ? {image: $('#bCover').value.trim()} : {}),
        bg: $('#bBg').value || '#2B1B7A',
        fg: $('#bFg').value || '#FFC800'
      },
      synopsis: $('#bSynopsis').value.trim(),
      quiz: {mood: $('#bMood').value.trim(), pace: $('#bPace').value.trim()},
      isNew: $('#bIsNew').checked,
      bestseller: $('#bBest').checked,
      featured: $('#bFeature').checked,
      offer: pct > 0 ? {
        percent: pct,
        ...($('#bOfferStart').value ? {start: $('#bOfferStart').value} : {}),
        ...($('#bOfferEnd').value ? {end: $('#bOfferEnd').value} : {})
      } : null
    };
    const existing = await getBook(id, {includeHidden: true});
    await adminSaveBook(existing ? {...existing, ...book} : book);
    statusMsg(`Libro «${book.title}» guardado`);
    $('#bookForm').hidden = true;
    await Promise.all([renderBooks(), renderOffers(), fillSelects()]);
  } catch (err) { statusMsg(err.message, true); }
});

// ---------------------------------------------------------------- colecciones
async function renderCollections() {
  const box = $('#collectionsList');
  box.replaceChildren();
  try {
    const items = await getCollections();
    items.forEach(c => box.append(row(c.name, `${c.bookIds?.length || 0} libros · ${c.slogan || ''}`, [
      btn('Editar', () => fillCollectionForm(c)),
      deleteBtn(async () => {
        await adminDeleteCollection(c.id);
        statusMsg('Colección eliminada');
        await renderCollections();
      })
    ])));
  } catch (err) { statusMsg(err.message, true); }
}
function fillCollectionForm(c) {
  $('#collectionFormTitle').textContent = `Editar: ${c.name}`;
  $('#cId').value = c.id;
  $('#cName').value = c.name;
  $('#cSlogan').value = c.slogan || '';
  $('#cBooks').value = (c.bookIds || []).join(', ');
  $('#collectionForm').hidden = false;
}
$('#newCollectionBtn').onclick = () => {
  $('#collectionForm').reset();
  $('#collectionFormTitle').textContent = 'Nueva colección';
  $('#collectionForm').hidden = false;
  $('#cId').focus();
};
$('#collectionCancel').onclick = () => { $('#collectionForm').hidden = true; };
$('#collectionForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await adminSaveCollection({
      id: $('#cId').value.trim(), name: $('#cName').value.trim(),
      slogan: $('#cSlogan').value.trim(), bookIds: list($('#cBooks').value)
    });
    statusMsg('Colección guardada');
    $('#collectionForm').hidden = true;
    await renderCollections();
  } catch (err) { statusMsg(err.message, true); }
});

// ---------------------------------------------------------------- escritores
async function renderWriters() {
  const box = $('#writersAdminList');
  box.replaceChildren();
  try {
    const items = await getWriters();
    items.forEach(w => box.append(row(w.name, `${w.bookIds?.length || 0} obras · ${(w.bio || '').slice(0, 90)}`, [
      btn('Editar', () => fillWriterForm(w)),
      deleteBtn(async () => {
        await adminDeleteWriter(w.id);
        statusMsg('Escritor eliminado');
        await renderWriters();
      })
    ])));
  } catch (err) { statusMsg(err.message, true); }
}
function fillWriterForm(w) {
  $('#writerFormTitle').textContent = `Editar: ${w.name}`;
  $('#wId').value = w.id;
  $('#wName').value = w.name;
  $('#wBio').value = w.bio || '';
  $('#wBooks').value = (w.bookIds || []).join(', ');
  $('#writerForm').hidden = false;
}
$('#newWriterBtn').onclick = () => {
  $('#writerForm').reset();
  $('#writerFormTitle').textContent = 'Nuevo escritor';
  $('#writerForm').hidden = false;
  $('#wId').focus();
};
$('#writerCancel').onclick = () => { $('#writerForm').hidden = true; };
$('#writerForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await adminSaveWriter({
      id: $('#wId').value.trim(), name: $('#wName').value.trim(),
      bio: $('#wBio').value.trim(), bookIds: list($('#wBooks').value)
    });
    statusMsg('Escritor guardado');
    $('#writerForm').hidden = true;
    await renderWriters();
  } catch (err) { statusMsg(err.message, true); }
});

// ---------------------------------------------------------------- ofertas
async function renderOffers() {
  const box = $('#offersAdminList');
  box.replaceChildren();
  try {
    const books = await getBooks({includeHidden: true});
    const withOffer = books.filter(b => b.offer);
    if (!withOffer.length) box.append(el('p', 'admin-empty', 'No hay ofertas programadas.'));
    withOffer.forEach(b => box.append(row(b.title,
      `-${b.offer.percent}% · ${b.offer.start || 'sin inicio'} → ${b.offer.end || 'sin fin'} · ${money(b.physicalPrice || 0)}`,
      [
        btn('Editar libro', () => fillBookForm(b)),
        btn('Quitar oferta', async () => {
          await adminSaveBook({...b, offer: null});
          statusMsg('Oferta eliminada');
          await Promise.all([renderOffers(), renderBooks()]);
        })
      ],
      [{label: b.isOfferActive ? 'Vigente' : 'Programada', tone: b.isOfferActive ? '' : 'off'}])));
    await fillSelects();
  } catch (err) { statusMsg(err.message, true); }
}
async function fillSelects() {
  const books = await getBooks();
  [$('#offerBook'), $('#pickBook')].forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    sel.replaceChildren();
    books.forEach(b => {
      const op = el('option', null, b.title);
      op.value = b.id;
      sel.append(op);
    });
    if (current && books.some(b => b.id === current)) sel.value = current;
  });
}
$('#offerForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const book = await getBook($('#offerBook').value);
    if (!book) throw new Error('Selecciona un libro.');
    const offer = {
      percent: Number($('#offerPct').value) || 0,
      ...($('#offerStart').value ? {start: $('#offerStart').value} : {}),
      ...($('#offerEnd').value ? {end: $('#offerEnd').value} : {})
    };
    if (offer.percent < 1 || offer.percent > 100) throw new Error('El descuento debe estar entre 1 y 100.');
    await adminSaveBook({...book, offer});
    statusMsg(`Oferta de ${offer.percent}% guardada para «${book.title}»`);
    await Promise.all([renderOffers(), renderBooks()]);
  } catch (err) { statusMsg(err.message, true); }
});

// ---------------------------------------------------------------- recomendación semanal
async function renderPick() {
  try {
    const pick = await getWeeklyPick();
    $('#pickCurrent').textContent = pick
      ? `Libro actual: ${pick.title} (seleccionado el ${fmtDate(pick.updatedAt)})`
      : 'Aún no hay libro recomendado esta semana.';
    await fillSelects();
    if (pick) $('#pickBook').value = pick.bookId;
  } catch (err) { statusMsg(err.message, true); }
}
$('#pickForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const pick = await setWeeklyPick($('#pickBook').value);
    statusMsg(`Recomendación semanal: ${pick.title}`);
    await renderPick();
  } catch (err) { statusMsg(err.message, true); }
});

// ---------------------------------------------------------------- suscriptores
$('#subsRefreshBtn').onclick = () => renderSubs();
async function renderSubs() {
  const box = $('#subsList');
  box.replaceChildren();
  try {
    const subs = await getSubscriptions();
    if (!subs.length) { box.append(el('p', 'admin-empty', 'Todavía no hay suscriptores.')); return; }
    subs.forEach(s => {
      const meta = `Alta: ${fmtDate(s.subscribedAt)}${s.consentAt ? ' · Consentimiento: ' + fmtDate(s.consentAt) : ''}${s.unsubscribedAt ? ' · Baja: ' + fmtDate(s.unsubscribedAt) : ''}`;
      const action = btn(s.active ? 'Dar de baja' : 'Reactivar', async () => {
        if (s.active) await unsubscribe(s.email);
        else await subscribe(s.email, true);
        statusMsg(s.active ? 'Baja registrada' : 'Suscripción reactivada');
        await renderSubs();
      });
      box.append(row(s.email, meta, [action],
        [{label: s.active ? 'Activa' : 'Dada de baja', tone: s.active ? '' : 'off'}]));
    });
  } catch (err) { statusMsg(err.message, true); }
}
