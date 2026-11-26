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

// Enlaces de WhatsApp, logo y datos estructurados desde un único lugar (RNF07)
function initBrandAndWhatsApp() {
  const base = document.querySelector('meta[name="hf-base"]')?.content || '';
  document.querySelectorAll('[data-logo]').forEach(img => {
    img.src = `${base}${CONFIG.logoUrl}`;
  });

  document.querySelectorAll('[data-wa]').forEach(a => {
    const msg = CONFIG.whatsappMessages[a.dataset.wa];
    if (!msg) return;
    a.href = `${CONFIG.whatsapp.link}?text=${encodeURIComponent(msg)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });

  // Sincronizar JSON-LD con la configuración centralizada y el dominio del build
  const siteUrl = document.querySelector('meta[name="hf-site-url"]')?.content || CONFIG.pendingConfirmations.productionDomain;
  const ld = document.querySelector('script[type="application/ld+json"]');
  if (ld) {
    try {
      const data = JSON.parse(ld.textContent);
      const store = (data['@graph'] || []).find(x => x['@type'] === 'BookStore');
      if (store) {
        store.telephone = '+' + CONFIG.whatsapp.raw;
        store.url = siteUrl.replace(/\/$/, '') + '/';
        if (store.address) {
          store.address.streetAddress = CONFIG.location.address;
          store.address.addressLocality = CONFIG.location.city;
          store.address.addressCountry = CONFIG.location.country;
        }
        if (store.contactPoint) store.contactPoint.telephone = '+' + CONFIG.whatsapp.raw;
      }
      ld.textContent = JSON.stringify(data);
    } catch (_) {}
  }
}
initBrandAndWhatsApp();

// Botón WhatsApp de la sección Contacto
const contactWaBtn = document.getElementById('contactWaBtn');
if (contactWaBtn) {
  const msg = encodeURIComponent(CONFIG.whatsappMessages.general);
  contactWaBtn.href = `${CONFIG.whatsapp.link}?text=${msg}`;
}

initMenu();
initForm();

const isTest = /jsdom/i.test(navigator.userAgent);
const yieldMain = () => isTest ? Promise.resolve() : new Promise(r => setTimeout(r, 0));

(async () => {
  try {
    const {books, collections, writers} = await loadCatalog();
    initWishlist(books);
    renderShelves(books, collections);
    await yieldMain();
    initCatalog(books);
    await yieldMain();
    initOffers(books);
    initWriters(writers, books);
    await yieldMain();
    initQuiz(books);
    initCart(books);
    initOrder();
  } catch (err) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No pudimos cargar el catálogo. Recarga la página en unos minutos.';
    document.querySelector('#shelves')?.append(p);
  }
})();
