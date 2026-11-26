import {$,$$,el,norm,cap,lenOf,mm,goCat} from './utils.js';
import {card} from './cards.js';
import {closeMenu} from './menu.js';
let _reset=()=>{};
export const resetFilters=()=>_reset();
export function initCatalog(D){
// Catálogo con filtros





// El tope del filtro se deriva del catálogo: un libro nuevo a $35 no debe quedar oculto.
const PMAX=Math.max(10,Math.ceil(Math.max(0,...D.flatMap(b=>[b.p||0,b.e||0]))/5)*5);
const S={q:'',f:[],g:[],h:[],a:'',max:PMAX,l:''};
const uniq=k=>[...new Set(D.flatMap(b=>b[k]))].sort((x,y)=>x.localeCompare(y,'es'));
const fBody=$('#fBody'),results=$('#results'),catSearch=$('#catSearch');
function group(title,name,opts,type='checkbox'){
  const fs=el('fieldset');fs.append(el('legend',null,title));
  opts.forEach(([v,l])=>{const lb=el('label','opt'),i=el('input');i.type=type;i.name=name;i.value=v;lb.append(i,document.createTextNode(l));fs.append(lb)});
  fBody.append(fs);
}
group('Formato','f',[['fisico','Físico'],['ebook','Ebook']]);
group('Género','g',uniq('g').map(v=>[v,cap(v)]));
group('Temática','h',uniq('h').map(v=>[v,cap(v)]));
const aFs=el('fieldset');aFs.append(el('legend',null,'Autor'));
const sel=el('select');sel.name='a';sel.setAttribute('aria-label','Autor');
[['','Todos los autores'],...[...new Set(D.map(b=>b.a))].sort((x,y)=>x.localeCompare(y,'es')).map(a=>[a,a])].forEach(([v,l])=>{const o=el('option',null,l);o.value=v;sel.append(o)});
aFs.append(sel);fBody.append(aFs);
const pFs=el('fieldset'),pOut=el('span',null,'Hasta $'+PMAX),rg=el('input');
pFs.append(el('legend',null,'Precio'));rg.type='range';rg.name='max';rg.min=5;rg.max=PMAX;rg.step=1;rg.value=PMAX;rg.setAttribute('aria-label','Precio máximo');pFs.append(rg,pOut);fBody.append(pFs);
group('Duración de lectura','l',[['','Cualquiera'],['corta','Corta (menos de 150 págs.)'],['media','Media (150 a 319)'],['larga','Larga (320 o más)']],'radio');
const checked=n=>$$('input[name="'+n+'"]:checked',fBody).map(i=>i.value);
function readState(){S.q=catSearch.value;S.f=checked('f');S.g=checked('g');S.h=checked('h');S.a=sel.value;S.max=+rg.value;S.l=($('input[name="l"]:checked',fBody)||{value:''}).value}
function setControls(){catSearch.value=S.q;$$('input[type=checkbox]',fBody).forEach(i=>i.checked=S[i.name].includes(i.value));sel.value=S.a;rg.value=S.max;pOut.textContent='Hasta $'+S.max;$$('input[type=radio]',fBody).forEach(i=>i.checked=i.value===S.l)}
const effPrice = (b, p) => b.d > 0 ? (p * (100 - b.d) / 100) : p;
const match = b => {
  const q = norm(S.q.trim());
  const validFormats = [b.p, b.e].filter(Boolean);
  const minPrice = validFormats.length ? Math.min(...validFormats.map(p => effPrice(b, p))) : 0;
  return (!q || norm([b.t, b.a, ...b.g, ...b.h].join(' ')).includes(q)) &&
    (!S.f.length || S.f.some(f => f === 'fisico' ? b.p : (b.e && b.ebookAuthorized))) &&
    (!S.g.length || S.g.some(x => b.g.includes(x))) &&
    (!S.h.length || S.h.some(x => b.h.includes(x))) &&
    (!S.a || b.a === S.a) &&
    minPrice <= S.max &&
    (!S.l || lenOf(b.n) === S.l);
};
function render(){
  const list=D.filter(match);results.replaceChildren(...list.map(card));
  $('#empty').hidden=list.length>0;
  $('#catCount').textContent=list.length+(list.length===1?' libro':' libros');
  const n=(S.q?1:0)+S.f.length+S.g.length+S.h.length+(S.a?1:0)+(S.max<PMAX?1:0)+(S.l?1:0);
  $('#fCount').textContent=n?' ('+n+')':'';$('#applyF').textContent='Ver '+list.length+(list.length===1?' resultado':' resultados');
  try{const P=new URLSearchParams();['q','a','l'].forEach(k=>S[k]&&P.set(k,S[k]));['f','g','h'].forEach(k=>S[k].length&&P.set(k,S[k].join('|')));S.max<PMAX&&P.set('max',S.max);history.replaceState(null,'',P.toString()?'?'+P:location.pathname)}catch(_){}
}
const reset=()=>{Object.assign(S,{q:'',f:[],g:[],h:[],a:'',max:PMAX,l:''});setControls();render()};_reset=reset;
fBody.addEventListener('input',()=>{readState();pOut.textContent='Hasta $'+S.max;render()});
let tm;catSearch.addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(()=>{readState();render()},150)});
$('#clearF').onclick=$('#clearE').onclick=reset;

document.addEventListener('click',e=>{const a=e.target.closest('[data-apply]');if(!a)return;e.preventDefault();const[k,v]=a.dataset.apply.split(':');reset();if(Array.isArray(S[k]))S[k]=[v];else S[k]=v;setControls();render();closeMenu();goCat()});
const hs=$('.header .search input');hs.addEventListener('keydown',e=>{if(e.key==='Enter'){reset();S.q=hs.value;setControls();render();goCat()}});
try{const P=new URLSearchParams(location.search);S.q=P.get('q')||'';S.a=P.get('a')||'';S.l=P.get('l')||'';S.max=Math.min(PMAX,Math.max(5,+P.get('max')||PMAX));['f','g','h'].forEach(k=>S[k]=P.get(k)?P.get(k).split('|'):[])}catch(_){}
setControls();render();
// Cajón de filtros (móvil)
const fp=$('#filters'),scrim=$('#scrim'),openF=$('#openF');
function sheet(o){fp.classList.toggle('is-open',o);scrim.hidden=!o;if(o){fp.setAttribute('role','dialog');fp.setAttribute('aria-modal','true');$('input,select',fp).focus()}else{fp.removeAttribute('role');fp.removeAttribute('aria-modal');openF.focus()}}
openF.onclick=()=>sheet(true);scrim.onclick=$('#applyF').onclick=()=>sheet(false);
document.addEventListener('keydown',e=>{if(!fp.classList.contains('is-open'))return;if(e.key==='Escape')sheet(false);if(e.key==='Tab'){const f=$$('input,select,button',fp).filter(x=>x.offsetParent);const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});
}
