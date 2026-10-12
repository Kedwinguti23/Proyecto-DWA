import {$,el,mm} from './utils.js';
import {card} from './cards.js';

export function renderShelves(D, collections){
  const SHELVES = [
    ['mas-vendidos', 'Más vendidos', 'Lo que más se está leyendo esta semana.', b => b.f.includes('b'), 1],
    ...collections.map(c => [
      c.id,
      c.name || c.title,
      c.slogan || c.description,
      b => (c.bookIds ? c.bookIds.includes(b.id) : b.c.includes(c.id))
    ])
  ];

  const CH = d => '<svg viewBox="0 0 24 24"><path d="' + (d < 0 ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7') + '"/></svg>';
  const host = $('#shelves');
  host.replaceChildren();

  SHELVES.forEach(([id, title, desc, fn, lg]) => {
    const sec = el('section', 'shelf');
    sec.id = id;
    sec.setAttribute('aria-labelledby', id + '-t');

    const head = el('div', 'shelf__head');
    const txt = el('div');
    const h = el('h2', null, title);
    h.id = id + '-t';
    txt.append(h, el('p', 'muted', desc));

    const arrows = el('div', 'row');
    arrows.style.margin = '0';

    const track = el('div', 'carousel' + (lg ? ' carousel--lg' : ''));
    track.tabIndex = 0;
    track.setAttribute('role', 'region');
    track.setAttribute('aria-label', title);

    [[-1, 'Anterior'], [1, 'Siguiente']].forEach(([d, l]) => {
      const b = el('button', 'icon-btn only-desk');
      b.setAttribute('aria-label', l + ': ' + title);
      b.innerHTML = CH(d);
      b.onclick = () => track.scrollBy({ left: d * track.clientWidth * 0.8, behavior: mm.matches ? 'auto' : 'smooth' });
      arrows.append(b);
    });

    head.append(txt, arrows);
    D.filter(fn).forEach(b => track.append(card(b)));
    sec.append(head, track);
    host.append(sec);
  });
}
