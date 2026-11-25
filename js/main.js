import {initMenu} from './menu.js';
import {initForm} from './form.js';
import {loadCatalog} from './data.js';
import {initWishlist} from './wishlist.js';
import {renderShelves} from './carousel.js';
import {initCatalog} from './catalog.js';
import {initQuiz} from './quiz.js';
import {initCart} from './cart.js';
import {initOffers} from './offers.js';
import {initWriters} from './writers.js';
import {initOrder} from './order.js';
import {CONFIG} from './config.js';

// Botón flotante WhatsApp: apunta al mensaje de ventas/pedidos
const waFab = document.getElementById('waFab');
if (waFab) {
  const msg = encodeURIComponent(CONFIG.whatsappMessages.sales);
  waFab.href = `${CONFIG.whatsapp.link}?text=${msg}`;
}

// Botón WhatsApp de la sección Contacto
const contactWaBtn = document.getElementById('contactWaBtn');
if (contactWaBtn) {
  const msg = encodeURIComponent(CONFIG.whatsappMessages.general);
  contactWaBtn.href = `${CONFIG.whatsapp.link}?text=${msg}`;
}

initMenu();
initForm();

(async () => {
  try {
    const {books, collections, writers} = await loadCatalog();
    initWishlist(books);
    renderShelves(books, collections);
    initCatalog(books);
    initQuiz(books);
    initCart(books);
    initOffers(books);
    initWriters(writers, books);
    initOrder();
  } catch (err) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No pudimos cargar el catálogo. Recarga la página en unos minutos.';
    document.querySelector('#shelves')?.append(p);
  }
})();
