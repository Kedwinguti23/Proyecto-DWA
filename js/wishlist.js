import {$,$$,bump} from './utils.js';
const KEY='ds-wish';let set=new Set();
try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))set=new Set(v.filter(x=>typeof x==='string'))}catch(_){}
export const isWished=id=>set.has(id);
export function initWishlist(books){
  const known=new Set(books.map(b=>b.id));set=new Set([...set].filter(id=>known.has(id)));
  $('#wishCount').textContent=set.size;
  document.addEventListener('click',e=>{
    const w=e.target.closest('.wish');if(!w)return;
    const id=w.dataset.id,on=!set.has(id);on?set.add(id):set.delete(id);
    try{localStorage.setItem(KEY,JSON.stringify([...set]))}catch(_){}
    $$('.wish').filter(x=>x.dataset.id===id).forEach(x=>x.setAttribute('aria-pressed',String(on)));
    const c=$('#wishCount');c.textContent=set.size;bump(c);
  });
}
