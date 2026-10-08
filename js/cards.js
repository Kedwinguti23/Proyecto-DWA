import {el,money} from './utils.js';
import {isWished} from './wishlist.js';
const HEART='<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';
export function card(b){
  const c=el('article','book');
  const cv=el('div','book__cover',b.t.split(':')[0].split(' y ')[0]);cv.style.background=b.bg;cv.style.color=b.fg;cv.setAttribute('aria-hidden','true');
  const w=el('button','wish');w.dataset.id=b.id;w.setAttribute('aria-pressed',String(isWished(b.id)));w.setAttribute('aria-label','Añadir '+b.t+' a la wishlist');w.innerHTML=HEART;
  const info=el('div');info.append(el('h3',null,b.t),el('p','book__author',b.a));
  const meta=el('div','book__meta'),tags=el('span');tags.style.cssText='display:flex;gap:4px;flex-wrap:wrap';
  if(b.p)tags.append(el('span','tag','Físico'));if(b.e)tags.append(el('span','tag tag--ebook','Ebook'));
  if(b.d)tags.append(el('span','tag tag--offer','-'+b.d+'%'));
  const min=Math.min(...[b.p,b.e].filter(Boolean))*(100-b.d)/100;
  meta.append(tags,el('span','book__price',money(min)));
  const add=el('button','btn btn--sm','Añadir al carrito');add.dataset.add=b.id;add.setAttribute('aria-label','Añadir '+b.t+' al carrito');
  c.append(cv,w,info,meta,add);return c;
}
