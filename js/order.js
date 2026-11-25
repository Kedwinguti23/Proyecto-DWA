// js/order.js — Formulario de pedido y apertura de WhatsApp (RF09, D04)
// MOCK: reemplazar por llamada HTTP al backend
import {$, el, money} from './utils.js';
import {createOrder} from './api.js';
import {CONFIG} from './config.js';

export function initOrder() {
  const dlg = $('#orderDlg');
  if (!dlg) return;

  const form       = $('#orderForm');
  const summary    = $('#orderSummary');
  const confirm    = $('#orderConfirm');
  const errBox     = $('#orderErr');
  const deliveryRa = () => [...document.querySelectorAll('input[name="deliveryType"]')];
  const addrWrap   = $('#addrWrap');

  // Mostrar/ocultar campo de dirección según forma de entrega
  dlg.addEventListener('change', e => {
    if (e.target.name === 'deliveryType') {
      const isEnvio = e.target.value === 'envio';
      addrWrap.hidden = !isEnvio;
      $('#orderAddress').required = isEnvio;
    }
  });

  // Renderizar resumen del carrito cada vez que se abre el diálogo
  dlg.addEventListener('click', e => { if (e.target === dlg) closeOrder(); });
  $('#orderClose').onclick = closeOrder;

  dlg.addEventListener('cancel', e => e.preventDefault()); // evitar Esc sin confirmación

  function closeOrder() {
    dlg.close();
    confirm.hidden = true;
    form.hidden = false;
    summary.hidden = false;
    errBox.textContent = '';
    form.reset();
    addrWrap.hidden = true;
    $('#orderAddress').required = false;
  }

  // Renderizar resumen lateral antes de abrir
  window.__openOrder = function openOrder() {
    const cart = window.__cart;
    if (!cart) return;
    const items = cart.getItems();
    if (!items.length) return;

    // Renderizar resumen
    summary.replaceChildren();
    const ul = el('ul', 'order-summary__list');
    items.forEach(it => {
      const li = el('li', 'order-summary__item');
      li.append(
        el('span', 'order-summary__title', `${it.title} (${it.format === 'ebook' ? 'Ebook' : 'Físico'})${it.qty > 1 ? ' ×' + it.qty : ''}`),
        el('span', 'order-summary__price', money(it.price * it.qty))
      );
      ul.append(li);
    });
    const tot = el('div', 'order-summary__total');
    tot.append(el('span', null, 'Total'), el('strong', null, money(cart.total())));
    summary.append(el('h3', 'order-summary__heading', 'Tu pedido'), ul, tot);

    dlg.showModal();
  };

  // Envío del formulario
  form.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.textContent = '';
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    try {
      const cart = window.__cart;
      const items = cart.getItems();
      const delivery = deliveryRa().find(r => r.checked)?.value || 'retiro';

      const orderInput = {
        customerName:  form.orderName.value.trim(),
        customerPhone: form.orderPhone.value.trim(),
        deliveryType:  delivery,
        address:       delivery === 'envio' ? form.orderAddress.value.trim() : '',
        notes:         form.orderNotes.value.trim(),
        items:         items.map(it => ({id: it.id, format: it.format, qty: it.qty, price: it.price})),
        total:         cart.total()
      };

      const order = await createOrder(orderInput);

      // Abrir WhatsApp con mensaje prellenado
      const msg = CONFIG.whatsappMessages.orderTemplate({
        id:           order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryType: order.deliveryType,
        address:      order.address,
        notes:        order.notes,
        items:        order.items,
        total:        order.total
      });
      window.open(`${CONFIG.whatsapp.link}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');

      // Vaciar carrito
      cart.clear();

      // Pantalla de confirmación
      form.hidden = true;
      summary.hidden = true;
      confirm.hidden = false;
      $('#confirmCode').textContent = order.id;

    } catch (err) {
      errBox.textContent = err.message || 'Ocurrió un error. Intenta de nuevo.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirmar pedido por WhatsApp';
    }
  });

  // Cierre del diálogo desde la pantalla de confirmación
  $('#confirmClose').onclick = () => { closeOrder(); dlg.close(); };
}
