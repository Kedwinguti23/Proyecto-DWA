import {$,el,bump,money,goCat} from './utils.js';
export function initCart(D){
const byId=Object.create(null);D.forEach(b=>byId[b.id]=b);
// Carrito (RF07: sin barra de envío gratis, pago por WhatsApp)
const KEY='ds-cart';let items=[];
try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))items=v.filter(x=>typeof x.i==='string'&&byId[x.i]&&(x.fmt==='fisico'?byId[x.i].p:x.fmt==='ebook'&&byId[x.i].e)&&x.qty>=1&&x.qty<=9).map(x=>({i:x.i,fmt:x.fmt,qty:x.fmt==='ebook'?1:x.qty}))}catch(_){}
const price=(b,f)=>Math.round((f==='fisico'?b.p:b.e)*(100-b.d))/100;
const cartDlg=$('#cartDlg'),cBody=$('#cBody'),cFoot=$('#cFoot');
const toastEl=el('div','toast'),toastMsg=el('span'),toastBtn=el('button','btn btn--sm','Ver carrito');
toastEl.setAttribute('role','status');toastEl.append(toastMsg,toastBtn);document.body.append(toastEl);
let tt;const toast=m=>{toastMsg.textContent=m;toastEl.classList.add('is-on');clearTimeout(tt);tt=setTimeout(()=>toastEl.classList.remove('is-on'),3200)};
const openCart=()=>{toastEl.classList.remove('is-on');renderCart();cartDlg.showModal()};

function update(){
  try{localStorage.setItem(KEY,JSON.stringify(items))}catch(_){}
  const c=$('#cartCount');c.textContent=items.reduce((n,l)=>n+l.qty,0);bump(c);
  if(cartDlg.open)renderCart();
}
function addItem(i){
  const b=byId[i],fmt=b.e&&(!b.p||price(b,'ebook')<=price(b,'fisico'))?'ebook':'fisico',ex=items.find(x=>x.i===i&&x.fmt===fmt);
  if(ex&&fmt==='ebook'){toast('Ese ebook ya está en tu carrito');return}
  if(ex)ex.qty=Math.min(9,ex.qty+1);else items.push({i,fmt,qty:1});
  update();toast('Añadido al carrito');
}
function setFmt(l,f){
  l.fmt=f;if(f==='ebook')l.qty=1;
  const d=items.find(x=>x!==l&&x.i===l.i&&x.fmt===f);
  if(d){d.qty=f==='ebook'?1:Math.min(9,d.qty+l.qty);items.splice(items.indexOf(l),1)}
  update();
}
function renderCart(){
  const ak=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.k;
  cBody.replaceChildren();cFoot.replaceChildren();
  if(!items.length){
    const e=el('div','empty'),g=el('button','btn','Explorar catálogo');g.onclick=()=>{cartDlg.close();goCat()};
    e.append(el('h3',null,'Tu carrito está vacío'),el('p','muted','Explora el catálogo o haz el quiz para encontrar tu próxima lectura.'),g);cBody.append(e);return;
  }
  items.forEach(l=>{
    const b=byId[l.i],row=el('article','line'),cv=el('div','line__cover');cv.style.background=b.bg;cv.setAttribute('aria-hidden','true');
    const info=el('div'),seg=el('div','seg');info.append(el('h3',null,b.t),el('p','book__author',b.a));
    seg.setAttribute('role','group');seg.setAttribute('aria-label','Formato de '+b.t);
    [['fisico','Físico',b.p],['ebook','Ebook',b.e]].filter(x=>x[2]).forEach(([f,lb])=>{const s=el('button',null,lb);s.dataset.k=l.i+f;s.setAttribute('aria-pressed',l.fmt===f);s.onclick=()=>setFmt(l,f);seg.append(s)});
    info.append(seg);
    const end=el('div','line__end'),rm=el('button','rm','Quitar');rm.dataset.k=l.i+'rm';rm.setAttribute('aria-label','Quitar '+b.t);rm.onclick=()=>{items.splice(items.indexOf(l),1);update()};
    end.append(rm);
    if(l.fmt==='fisico'){
      const q=el('div','qty'),m=el('button',null,'−'),p=el('button',null,'+'),n=el('span',null,String(l.qty));
      m.dataset.k=l.i+'m';p.dataset.k=l.i+'p';m.setAttribute('aria-label','Quitar un ejemplar de '+b.t);p.setAttribute('aria-label','Añadir un ejemplar de '+b.t);
      m.onclick=()=>{l.qty>1?l.qty--:items.splice(items.indexOf(l),1);update()};p.onclick=()=>{l.qty=Math.min(9,l.qty+1);update()};
      q.append(m,n,p);end.append(q);
    }
    end.append(el('strong',null,money(price(b,l.fmt)*l.qty)));row.append(cv,info,end);cBody.append(row);
  });
  const sum=()=>items.reduce((n,l)=>n+price(byId[l.i],l.fmt)*l.qty,0);
  if(items.some(l=>l.fmt==='ebook'))cFoot.append(el('p','muted','📱 Los ebooks se coordinan por WhatsApp tras el pedido.'));
  const tot=el('div','total');tot.append(el('span',null,'Total'),el('span',null,money(sum())));
  const order=el('button','btn','🛍️ Hacer pedido'),more=el('button','btn btn--ghost','Seguir explorando');
  order.style.justifyContent=more.style.justifyContent='center';
  order.onclick=()=>{cartDlg.close();if(window.__openOrder)window.__openOrder();else $('#orderDlg').showModal()};
  more.onclick=()=>cartDlg.close();
  cFoot.append(tot,order,more);
  if(ak){const t=cBody.querySelector('[data-k="'+ak+'"]');(t||$('#cTitle')).focus()}
}
$('#cartBtn').onclick=toastBtn.onclick=openCart;
$('#cClose').onclick=()=>cartDlg.close();
cartDlg.addEventListener('click',e=>{if(e.target===cartDlg)cartDlg.close()});
document.addEventListener('click',e=>{if(e.target.closest('[data-open-cart]')){e.preventDefault();openCart()}});
$('#cartCount').textContent=items.reduce((n,l)=>n+l.qty,0);
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-add]');if(!a||!byId[a.dataset.add])return;
  addItem(a.dataset.add);a.dataset.t=a.dataset.t||a.textContent;a.textContent='¡Añadido!';setTimeout(()=>a.textContent=a.dataset.t,1200);
});
// Exponer funciones para order.js
window.__cart={getItems:()=>items.map(l=>{const b=byId[l.i];return{id:l.i,title:b.t,author:b.a,format:l.fmt,qty:l.qty,price:price(b,l.fmt)}}),clear:()=>{items=[];update()},total:()=>items.reduce((n,l)=>n+price(byId[l.i],l.fmt)*l.qty,0)};
}
