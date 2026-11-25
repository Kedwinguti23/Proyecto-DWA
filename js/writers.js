import {$, el} from './utils.js';
import {openBookDetail} from './cards.js';

export function initWriters(writers, books) {
  const container = $('#writersList');
  if (!container) return;

  container.replaceChildren();

  const booksMap = new Map(books.map(b => [b.id, b]));

  writers.forEach(w => {
    const cardEl = el('article', 'writer-card');
    cardEl.style.cssText = 'display:grid;gap:var(--s3);padding:var(--s5);border:2px solid var(--line);border-radius:var(--r-md);background:var(--surface);box-shadow:0 6px 0 var(--line)';

    const head = el('div', 'writer-card__head');
    head.style.cssText = 'display:flex;align-items:center;gap:var(--s3)';

    const avatar = el('div', 'avatar', w.name.split(' ').map(n => n[0]).join('').slice(0, 2));
    avatar.style.background = 'var(--violet)';

    const titleBox = el('div');
    const h3 = el('h3', null, w.name);
    h3.style.margin = '0';
    const tag = el('span', 'tag', w.emerging ? 'Autor emergente' : 'Autor del catálogo');
    titleBox.append(h3, tag);
    head.append(avatar, titleBox);

    const bio = el('p', 'muted', w.bio);
    bio.style.margin = '0';
    bio.style.lineHeight = '1.5';

    const booksBox = el('div');
    booksBox.style.cssText = 'display:grid;gap:var(--s2);margin-top:var(--s2)';
    const worksLabel = el('strong', null, 'Obras en Historias Fantásticas:');
    worksLabel.style.fontSize = 'var(--fs-sm)';
    booksBox.append(worksLabel);

    const list = el('div');
    list.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';

    (w.bookIds || []).forEach(bId => {
      const book = booksMap.get(bId);
      if (book) {
        const bookBtn = el('button', 'btn btn--ghost btn--sm', book.t);
        bookBtn.onclick = () => openBookDetail(book);
        list.append(bookBtn);
      }
    });

    if (!w.bookIds || w.bookIds.length === 0) {
      list.append(el('span', 'muted', 'Próximamente nuevas publicaciones.'));
    }

    booksBox.append(list);
    cardEl.append(head, bio, booksBox);
    container.append(cardEl);
  });
}
