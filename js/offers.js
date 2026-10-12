import {$, el} from './utils.js';
import {card} from './cards.js';

export function initOffers(books) {
  const container = $('#offersResults');
  if (!container) return;

  const onSale = books.filter(b => b.d > 0);
  container.replaceChildren();

  if (onSale.length === 0) {
    const empty = el('div', 'empty');
    empty.append(
      el('h3', null, 'No hay ofertas activas en este momento'),
      el('p', 'muted', 'Nuestras promociones especiales se actualizan periódicamente. ¡Explora el catálogo para descubrir nuevas lecturas!')
    );
    container.append(empty);
    return;
  }

  onSale.forEach(b => {
    container.append(card(b));
  });
}
