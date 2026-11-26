import {$,$$,el,bump,money,goCat} from './utils.js';
import {coverImage, openBookDetail} from './cards.js';

const KEY = 'ds-wish';
let set = new Set();

try {
  const v = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (Array.isArray(v)) set = new Set(v.filter(x => typeof x === 'string'));
} catch (_) {}

export const isWished = id => set.has(id);

export function initWishlist(books) {
  const byId = Object.create(null);
  books.forEach(b => byId[b.id] = b);

  // Filtrar IDs conocidos
  set = new Set([...set].filter(id => byId[id]));
  $('#wishCount').textContent = set.size;
  $('#wishCount').closest('button').setAttribute('aria-label', set.size + ', lista de deseos');

  const wishDlg = $('#wishDlg');
  const wBody = $('#wBody');
  const wFoot = $('#wFoot');

  function update() {
    try {
      localStorage.setItem(KEY, JSON.stringify([...set]));
    } catch (_) {}

    const c = $('#wishCount');
    if (c) {
      c.textContent = set.size;
      c.closest('button').setAttribute('aria-label', set.size + ', lista de deseos');
      bump(c);
    }

    // Actualizar todos los corazones visibles en tarjetas
    $$('.wish').forEach(x => {
      const id = x.dataset.id;
      if (id) x.setAttribute('aria-pressed', String(set.has(id)));
    });

    if (wishDlg && wishDlg.open) {
      renderWishlist();
    }
  }

  function renderWishlist() {
    if (!wBody || !wFoot) return;
    wBody.replaceChildren();
    wFoot.replaceChildren();

    const items = [...set].map(id => byId[id]).filter(Boolean);

    if (items.length === 0) {
      const empty = el('div', 'empty');
      const g = el('button', 'btn', 'Explorar catálogo');
      g.onclick = () => {
        wishDlg.close();
        goCat();
      };
      empty.append(
        el('h3', null, 'Tu lista de deseos está vacía'),
        el('p', 'muted', 'Guarda historias pulsando el icono del corazón en las tarjetas para no perderlas de vista.'),
        g
      );
      wBody.append(empty);
      return;
    }

    items.forEach(b => {
      const row = el('article', 'line');

      // Portada pequeña: botón para abrir la ficha con teclado
      const cv = el('button', 'line__cover');
      cv.type = 'button';
      cv.style.background = b.bg;
      cv.setAttribute('aria-label', `Ver detalles de ${b.t}`);
      cv.onclick = () => openBookDetail(b);
      const lineImg = coverImage(b);
      if (lineImg) {
        cv.classList.add('line__cover--image');
        cv.append(lineImg);
      } else cv.textContent = b.t.slice(0, 2);

      // Info
      const info = el('div');
      const h3 = el('h3');
      const titleBtn = el('button', 'book__title-btn', b.t);
      titleBtn.type = 'button';
      titleBtn.onclick = () => openBookDetail(b);
      h3.append(titleBtn);
      info.append(h3, el('p', 'book__author', b.a));

      const tags = el('div');
      tags.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:4px';
      if (b.p) tags.append(el('span', 'tag', 'Físico'));
      if (b.e && b.ebookAuthorized) tags.append(el('span', 'tag tag--ebook', 'Ebook'));
      if (b.d > 0) tags.append(el('span', 'tag tag--offer', `-${b.d}%`));
      if (!b.available) tags.append(el('span', 'tag tag--out', 'Agotado'));
      info.append(tags);

      // Precios y acciones
      const end = el('div', 'line__end');
      const rm = el('button', 'rm', 'Quitar');
      rm.setAttribute('aria-label', `Quitar ${b.t} de la lista de deseos`);
      rm.onclick = () => {
        set.delete(b.id);
        update();
      };
      end.append(rm);

      if (b.available) {
        const addBtn = el('button', 'btn btn--sm', 'Al carrito');
        addBtn.dataset.add = b.id;
        addBtn.setAttribute('aria-label', `Al carrito: ${b.t}`);
        end.append(addBtn);
      } else {
        const outSpan = el('span', 'tag tag--out', 'Agotado');
        end.append(outSpan);
      }

      // Precio mínimo
      const validPrices = [b.p, (b.ebookAuthorized ? b.e : null)].filter(Boolean);
      const baseMin = validPrices.length ? Math.min(...validPrices) : 0;
      const finalPrice = b.d > 0 ? (baseMin * (100 - b.d) / 100) : baseMin;
      end.append(el('strong', null, money(finalPrice)));

      row.append(cv, info, end);
      wBody.append(row);
    });

    // Acciones del pie
    const addAllBtn = el('button', 'btn', 'Pasar disponibles al carrito');
    addAllBtn.style.justifyContent = 'center';
    addAllBtn.onclick = () => {
      const availableItems = items.filter(b => b.available);
      if (availableItems.length === 0) return;
      availableItems.forEach(b => {
        const btn = document.querySelector(`[data-add="${b.id}"]`);
        if (btn) btn.click();
      });
      wishDlg.close();
      const cartBtn = $('#cartBtn');
      if (cartBtn) cartBtn.click();
    };

    const closeBtn = el('button', 'btn btn--ghost', 'Seguir explorando');
    closeBtn.style.justifyContent = 'center';
    closeBtn.onclick = () => wishDlg.close();

    wFoot.append(addAllBtn, closeBtn);
  }

  const openWishlist = () => {
    renderWishlist();
    if (wishDlg) wishDlg.showModal();
  };

  // Eventos de apertura
  const wishBtn = $('#wishBtn');
  if (wishBtn) wishBtn.onclick = openWishlist;

  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-wish]')) {
      e.preventDefault();
      openWishlist();
    }
  });

  // Cerrar modal
  const wClose = $('#wClose');
  if (wClose) wClose.onclick = () => wishDlg.close();

  if (wishDlg) {
    wishDlg.addEventListener('click', e => {
      if (e.target === wishDlg) wishDlg.close();
    });
  }

  // Delegación de clic para botones de wishlist en tarjetas (.wish)
  document.addEventListener('click', e => {
    const w = e.target.closest('.wish');
    if (!w) return;
    const id = w.dataset.id;
    if (!id) return;
    const on = !set.has(id);
    on ? set.add(id) : set.delete(id);
    update();
  });
}
