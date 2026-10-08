import {$} from './utils.js';
const set=o=>{const b=$('.nav-link');b.setAttribute('aria-expanded',String(o));$('#explore').classList.toggle('is-open',o)};
export const closeMenu=()=>set(false);
export function initMenu(){
  const btn=$('.nav-link');
  btn.addEventListener('click',()=>set(btn.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&btn.getAttribute('aria-expanded')==='true'){set(false);btn.focus()}});
  document.addEventListener('click',e=>{if(!e.target.closest('.dropdown'))set(false)});
  const hd=$('#header');let y=scrollY;
  addEventListener('scroll',()=>{const n=scrollY;hd.classList.toggle('is-hidden',n>y&&n>120);y=n},{passive:true});
}
