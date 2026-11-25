import {$,el,lenOf,goCat} from './utils.js';
import {card} from './cards.js';
import {resetFilters} from './catalog.js';
export function initQuiz(D){
// Quiz


const Q=[
["¿Qué te apetece sentir con tu próxima lectura?","m",[["aventura","Aventura y descubrimiento"],["misterio","Intriga y suspenso"],["emotivo","Emoción y nostalgia"],["humor","Humor y ligereza"],["reflexivo","Ideas para pensar"]]],
["¿A qué ritmo te gusta leer?","p",[["rapido","Rápido, que no pueda soltarlo"],["pausado","Pausado, para saborearlo"]]],
["¿Qué extensión prefieres?","l",[["corta","Corta, menos de 150 páginas"],["media","Media, de 150 a 319 páginas"],["larga","Larga, para sumergirme"],["","Me da igual"]]],
["¿En qué formato lo quieres?","f",[["fisico","Físico"],["ebook","Ebook"],["","Me da igual"]]],
["¿Qué te llama más la atención?","t",[["explorar","Explorar lugares desconocidos"],["enigma","Resolver un enigma"],["sentir","Historias de personas y memoria"],["reir","Reírme de la vida"],["aprender","Aprender algo nuevo"]]]];
const T={explorar:["mapas","viajes","imaginación","piratas","aventura","sociedad"],enigma:["investigación","secretos","identidad","sobrenatural","tiempo","misterio","justicia"],sentir:["memoria","esperanza","familia","amor","obsesión","culpa","drama"],reir:["humor","vida cotidiana","realidad","escritura","sátira"],aprender:["ciencia","curiosidad","ensayo","divulgación","historia","libros","filosofía","poder"]};
function score(b,a){
  let s=0;if(b.mq[0]===a.m)s+=3;if(b.mq[1]===a.p)s+=2;if(a.l&&lenOf(b.n)===a.l)s+=2;
  if(a.f){if(a.f==='fisico'?b.p:b.e)s+=1;else s-=10}
  T[a.t].forEach(w=>{if(b.h.includes(w)||b.g.includes(w))s+=1.5});
  return s+(b.f.includes('b')?.3:0);
}
const dlg=$('#quizDlg'),qb=$('#qBody'),qt=$('#qTitle'),qBar=$('#qBar'),qBack=$('#qBack');
let qi=0,ans={};
const prog=n=>{qBar.firstElementChild.style.width=(n/Q.length*100)+'%';qBar.setAttribute('aria-valuenow',n)};
function ask(i){
  qi=i;const[t,k,opts]=Q[i];qt.textContent=t;$('#qSub').textContent='Pregunta '+(i+1)+' de '+Q.length;prog(i);
  const box=el('div','choices');box.setAttribute('role','group');box.setAttribute('aria-labelledby','qTitle');
  opts.forEach(([v,l])=>{const b=el('button','choice',l);b.setAttribute('aria-pressed',ans[k]===v?'true':'false');b.onclick=()=>{ans[k]=v;i+1<Q.length?ask(i+1):done()};box.append(b)});
  qb.replaceChildren(box);qt.focus();
}
function done(){
  qi=Q.length;prog(Q.length);qt.textContent='Tus 3 lecturas ideales';$('#qSub').textContent='Elegidas según tus 5 respuestas.';
  const top=D.filter(b=>b.available!==false).map(b=>[b,score(b,ans)]).filter(x=>x[1]>-5).sort((x,y)=>y[1]-x[1]).slice(0,3);
  const grid=el('div','grid');
  top.forEach(([b,s])=>{const c=card(b);c.insertBefore(el('span','tag tag--offer','Coincidencia '+Math.min(99,Math.round(Math.max(s,0)/10*100))+'%'),c.children[2]);grid.append(c)});
  const row=el('div','row'),again=el('button','btn btn--ghost','Repetir el quiz'),more=el('a','btn','Ver todo el catálogo');
  again.onclick=()=>{ans={};ask(0)};more.href='#catalogo';more.onclick=e=>{e.preventDefault();dlg.close();resetFilters();goCat()};
  row.append(again,more);qb.replaceChildren(grid,row);qt.focus();
}
qBack.onclick=()=>ask(Math.max(0,qi-1));
$('#qClose').onclick=()=>dlg.close();
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
document.addEventListener('click',e=>{if(e.target.closest('a[href="#quiz"]')){e.preventDefault();ans={};ask(0);dlg.showModal()}});
}
