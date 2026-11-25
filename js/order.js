// js/order.js — Formulario de pedido y apertura de WhatsApp (RF09, D04)
// MOCK: reemplazar por llamada HTTP al backend
import {$, el, money} from './utils.js';
import {createOrder} from './api.js';
import {CONFIG} from './config.js';

export function initOrder() {
  const dlg = $('#orderDlg');
  if (!dlg) return;

  const form        = $('#orderForm');
  const summary     = $('#orderSummary');
  const confirm     = $('#orderConfirm');
  const errBox      = $('#orderErr');
  const confirmWa   = $('#confirmWa');
  const confirmHint = $('#confirmHint');
  const deliveryRa  = () => [...document.querySelectorAll('input[name="deliveryType"]')];
  const addrWrap    = $('#addrWrap');

  // Mostrar/ocultar campo de dirección según forma de entrega
  dlg.addEventListener('change', e => {
    if (e.target.name === 'deliveryType') {
      const isEnvio = e.target.value === 'envio';
      addrWrap.hidden = !isEnvio;
      $('#orderAddress').required = isEnvio;
    }
  });

  // Limpiar el error de un campo en cuanto se corrige
  form.addEventListener('input', clearFieldError);
  form.addEventListener('change', clearFieldError);
  function clearFieldError(e) {
    if (e.target.hasAttribute('aria-invalid')) {
      e.target.removeAttribute('aria-invalid');
      errBox.textContent = '';
    }
  }

  // Validación en el cliente (RF09). La API vuelve a validar por su lado.
  function validate(items, delivery) {
    const errors = [];
    form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));

    const required = (input, msg) => {
      if (!input.value.trim()) {
        input.setAttribute('aria-invalid', 'true');
        errors.push(msg);
      }
    };

    required($('#orderName'), 'Escribe tu nombre completo.');

    const digits = $('#orderPhone').value.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      $('#orderPhone').setAttribute('aria-invalid', 'true');
      errors.push('Escribe un teléfono válido (entre 8 y 15 dígitos).');
    }

    if (!['retiro', 'envio'].includes(delivery)) {
      errors.push('Elige una forma de entrega.');
    } else if (delivery === 'envio') {
      required($('#orderAddress'), 'Escribe la dirección de entrega.');
    }

    if (!$('#orderPrivacy').checked) {
      $('#orderPrivacy').setAttribute('aria-invalid', 'true');
      errors.push('Debes aceptar el aviso de privacidad.');
    }

    if (!items.length) errors.push('Tu carrito está vacío.');
    return errors;
  }

  // Cerrar con click fuera o con el botón (Esc queda disponible)
  dlg.addEventListener('click', e => { if (e.target === dlg) closeOrder(); });
  $('#orderClose').onclick = closeOrder;

  function closeOrder() {
    dlg.close();
    confirm.hidden = true;
    form.hidden = false;
    summary.hidden = false;
    errBox.textContent = '';
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
    addrWrap.hidden = true;
    $('#orderAddress').required = false;
    if (confirmWa) { confirmWa.hidden = true; confirmWa.removeAttribute('href'); }
  }

  // Renderizar resumen lateral antes de abrir
  window.__openOrder = function openOrder() {
    const cart = window.__cart;
    if (!cart) return;
    const items = cart.getItems();
    if (!items.length) return;

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

    const cart = window.__cart;
    const items = cart ? cart.getItems() : [];
    const delivery = deliveryRa().find(r => r.checked)?.value || 'retiro';

    const errors = validate(items, delivery);
    if (errors.length) {
      errBox.textContent = errors.join(' ');
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    try {
      const orderInput = {
        customerName:  $('#orderName').value.trim(),
        customerPhone: $('#orderPhone').value.trim(),
        deliveryType:  delivery,
        address:       delivery === 'envio' ? $('#orderAddress').value.trim() : '',
        notes:         $('#orderNotes').value.trim(),
        items:         items.map(it => ({id: it.id, format: it.format, qty: it.qty, price: it.price})),
        total:         cart.total()
      };

      // La API recalcula precios y valida disponibilidad; el total de aquí es orientativo.
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
      const waUrl = `${CONFIG.whatsapp.link}?text=${encodeURIComponent(msg)}`;
      const popup = window.open(waUrl, '_blank');
      if (popup) popup.opener = null;

      if (confirmWa) {
        confirmWa.href = waUrl;
        confirmWa.hidden = Boolean(popup);
      }
      if (confirmHint) {
        confirmHint.textContent = popup
          ? 'Se abrió WhatsApp con el resumen. Coordinaremos el pago y la entrega por chat.'
          : 'Si no se abrió WhatsApp, abre el enlace de abajo para continuar.';
      }

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

  $('#confirmClose').onclick = () => { closeOrder(); dlg.close(); };
}
