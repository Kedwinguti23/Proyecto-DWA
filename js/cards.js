import { el, money } from './utils.js';
import { isWished } from './wishlist.js';

const heartTpl = document.createElement('template');
heartTpl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';
const HEART_NODE = heartTpl.content.firstElementChild;

const booksById = new Map();

// Delegación única para abrir detalles y limpiar imágenes rotas
document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-detail]');
  if (!trigger) return;
  const b = booksById.get(trigger.dataset.detail);
  if (b) openBookDetail(b);
});

document.addEventListener('error', e => {
  if (e.target?.classList?.contains('book__cover-img')) e.target.remove();
}, true);

// Portada real (.webp) con color de respaldo si la imagen no está disponible.
export function coverImage(b, full = false) {
  if (!b.img) return null;
  const img = el('img', 'book__cover-img');
  img.src = full ? (b.imgFull || b.img) : b.img;
  img.alt = `Portada de ${b.t}`;
  img.width = b.imgW || 400;
  img.height = b.imgH || 600;
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}

export function openBookDetail(b) {
  let dlg = document.querySelector('#bookDetailDlg');
  if (!dlg) {
    dlg = el('dialog', 'quiz');
    dlg.id = 'bookDetailDlg';
    dlg.setAttribute('aria-labelledby', 'bdtTitle');
    document.body.append(dlg);
  }

  dlg.replaceChildren();

  const top = el('div', 'quiz__top');
  const h2 = el('h2', null, b.t);
  h2.id = 'bdtTitle';
  const closeBtn = el('button', 'icon-btn');
  closeBtn.setAttribute('aria-label', 'Cerrar detalle');
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  closeBtn.onclick = () => dlg.close();
  top.append(h2, closeBtn);

  const body = el('div');
  body.style.cssText = 'display:grid;gap:var(--s4);grid-template-columns:repeat(auto-fit,minmax(240px,1fr));align-items:start;margin-top:var(--s4)';

  const cover = el('div', 'book__cover');
  cover.style.background = b.bg;
  cover.style.color = b.fg;
  cover.style.minHeight = '280px';
  cover.setAttribute('aria-hidden', 'true');
  const detailImg = coverImage(b, true);
  if (detailImg) {
    cover.classList.add('book__cover--image');
    cover.append(detailImg);
  } else cover.textContent = b.t.split(':')[0].split(' y ')[0];

  const info = el('div');
  info.style.cssText = 'display:grid;gap:var(--s3)';

  const author = el('p', 'book__author', 'Por ' + b.a);
  author.style.fontSize = '1.1rem';
  author.style.fontWeight = '700';

  const tags = el('div');
  tags.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  if (b.p) tags.append(el('span', 'tag', 'Físico'));
  if (b.e && b.ebookAuthorized) tags.append(el('span', 'tag tag--ebook', 'Ebook'));
  if (b.d > 0) tags.append(el('span', 'tag tag--offer', 'Oferta -' + b.d + '%'));
  if (!b.available) tags.append(el('span', 'tag tag--out', 'Agotado'));

  const syn = el('p', null, b.synopsis || 'Una cautivadora historia disponible en Historias Fantásticas.');
  syn.style.lineHeight = '1.6';

  const metaList = el('ul', 'ticks');
  metaList.append(
    el('li', null, `${b.n} páginas`),
    el('li', null, `Tiempo estimado de lectura: ~${b.readingTime || Math.round(b.n * 1.3)} minutos`)
  );
  if (b.g && b.g.length) metaList.append(el('li', null, `Géneros: ${b.g.join(', ')}`));
  if (b.cn && b.cn.length) metaList.append(el('li', null, `Colección: ${b.cn.join(', ')}`));

  const pricesDiv = el('div', 'row');
  pricesDiv.style.margin = '0';
  if (!b.available) {
    const outTxt = el('strong', null, 'Actualmente agotado');
    outTxt.style.color = 'var(--coral)';
    pricesDiv.append(outTxt);
  } else {
    if (b.p) {
      const pPrice = b.d > 0 ? (b.p * (100 - b.d) / 100) : b.p;
      pricesDiv.append(el('span', null, `Físico: ${money(pPrice)}`));
    }
    if (b.e && b.ebookAuthorized) {
      const ePrice = b.d > 0 ? (b.e * (100 - b.d) / 100) : b.e;
      pricesDiv.append(el('span', null, `Ebook: ${money(ePrice)}`));
    }
  }

  const actions = el('div', 'row');
  actions.style.marginTop = 'var(--s4)';

  if (b.available) {
    const addBtn = el('button', 'btn', 'Añadir al carrito');
    addBtn.dataset.add = b.id;
    actions.append(addBtn);
  } else {
    const outBtn = el('button', 'btn', 'Agotado');
    outBtn.disabled = true;
    actions.append(outBtn);
  }

  const wishBtn = el('button', 'btn btn--ghost wish-toggle-btn');
  wishBtn.dataset.id = b.id;
  wishBtn.textContent = isWished(b.id) ? 'En tu Wishlist ♥' : 'Añadir a Wishlist ♡';
  wishBtn.onclick = () => {
    const wishIcon = document.querySelector(`.wish[data-id="${b.id}"]`);
    if (wishIcon) wishIcon.click();
    wishBtn.textContent = isWished(b.id) ? 'En tu Wishlist ♥' : 'Añadir a Wishlist ♡';
  };
  actions.append(wishBtn);

  info.append(author, tags, syn, metaList, pricesDiv, actions);
  body.append(cover, info);
  dlg.append(top, body);

  dlg.showModal();
}

export function card(b) {
  booksById.set(b.id, b);
  const c = el('article', 'book');

  // Portada interactiva
  const cv = el('button', 'book__cover');
  cv.type = 'button';
  cv.dataset.detail = b.id;
  cv.style.background = b.bg;
  cv.style.color = b.fg;
  cv.setAttribute('aria-label', `Ver detalles de ${b.t}`);
  const cardImg = coverImage(b);
  if (cardImg) {
    cv.classList.add('book__cover--image');
    cv.append(cardImg);
  } else cv.textContent = b.t.split(':')[0].split(' y ')[0];

  // Botón Wishlist (clona el SVG en lugar de parsear innerHTML)
  const w = el('button', 'wish');
  w.dataset.id = b.id;
  w.setAttribute('aria-pressed', String(isWished(b.id)));
  w.setAttribute('aria-label', 'Añadir ' + b.t + ' a la wishlist');
  w.append(HEART_NODE.cloneNode(true));

  // Información del libro
  const info = el('div');
  const tEl = el('h3');
  const tBtn = el('button', 'book__title-btn', b.t);
  tBtn.type = 'button';
  tBtn.dataset.detail = b.id;
  tEl.append(tBtn);
  info.append(tEl, el('p', 'book__author', b.a));

  // Metadatos y etiquetas
  const meta = el('div', 'book__meta');
  const tags = el('span');
  tags.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap';

  if (b.p) tags.append(el('span', 'tag', 'Físico'));
  if (b.e && b.ebookAuthorized) tags.append(el('span', 'tag tag--ebook', 'Ebook'));
  if (b.d > 0) tags.append(el('span', 'tag tag--offer', '-' + b.d + '%'));
  if (!b.available) tags.append(el('span', 'tag tag--out', 'Agotado'));

  // Precios
  const priceEl = el('span', 'book__price');
  if (!b.available) {
    priceEl.textContent = 'Agotado';
    priceEl.style.color = 'var(--ink-soft)';
    priceEl.style.fontSize = '1.05rem';
  } else {
    const validPrices = [b.p, (b.ebookAuthorized ? b.e : null)].filter(Boolean);
    const baseMin = validPrices.length ? Math.min(...validPrices) : 0;
    if (b.d > 0) {
      const discounted = baseMin * (100 - b.d) / 100;
      priceEl.append(el('del', null, money(baseMin)), document.createTextNode(money(discounted)));
    } else {
      priceEl.textContent = money(baseMin);
    }
  }
  meta.append(tags, priceEl);

  // Botón de compra
  const add = el('button', 'btn btn--sm', b.available ? 'Añadir al carrito' : 'Agotado');
  if (!b.available) {
    add.disabled = true;
    add.setAttribute('aria-disabled', 'true');
  } else {
    add.dataset.add = b.id;
    add.setAttribute('aria-label', 'Añadir al carrito: ' + b.t);
  }

  c.append(cv, w, info, meta, add);
  return c;
}