import {build} from 'esbuild';import {JSDOM} from 'jsdom';import {readFileSync, existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['build.mjs'],{stdio:'ignore'});
const js=(await build({entryPoints:['js/main.js'],bundle:true,write:false,format:'iife'})).outputFiles[0].text;
const adminJs=(await build({entryPoints:['admin/admin.js'],bundle:true,write:false,format:'iife'})).outputFiles[0].text;
const apiJs=(await build({entryPoints:['js/api.js'],bundle:true,write:false,format:'iife',globalName:'HFAPI'})).outputFiles[0].text;
const apiDom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'http://localhost/'});
apiDom.window.fetch=async()=>({ok:true,json:async()=>({books:[],collections:[],writers:[]})});
apiDom.window.eval(apiJs);
const html=readFileSync('index.html','utf8').replace(/<script type="module"[^>]*><\/script>/,'');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'});const w=dom.window,d=w.document;
w.matchMedia=()=>({matches:false});w.Element.prototype.scrollIntoView=()=>{};w.open=()=>({opener:null});
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
let mainFetches=0;
w.fetch=async()=>{mainFetches++;return {ok:true,json:async()=>JSON.parse(readFileSync('data/books.json','utf8'))}};
const errs=[];w.addEventListener('error',e=>errs.push(e.message));
w.eval(js);await new Promise(r=>setTimeout(r,100));
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
let failed=0;
const ck=(n,v)=>{if(!v)failed++;console.log((v?'OK   ':'FALLA')+' '+n)};
ck('books.json se descarga una sola vez',mainFetches===1);
ck('5 carruseles',$$('#shelves .shelf').length===5);
ck('catálogo con 20 libros reales',$$('#results .book').length===20);
ck('portadas webp reales en tarjetas',$$('#results .book__cover-img').length===20&&$$('#results .book__cover-img').every(i=>i.src.includes('Portadas%20de%20libros/')&&i.src.endsWith('.webp')));
ck('portada real en el hero',Boolean($('.poster__cover'))&&$('.poster__cover').src.includes('1984.webp'));
ck('hero precargado con prioridad alta',Boolean($('link[rel="preload"][as="image"][fetchpriority="high"]'))&&Boolean($('.poster__cover[fetchpriority="high"]')));
ck('tarjetas usan miniaturas',$$('#results .book__cover-img').every(i=>i.src.includes('/thumbs/')));
ck('tarjetas con dimensiones reales y lazy',$$('#results .book__cover-img').every(i=>i.loading==='lazy'&&Number(i.width)>0&&Number(i.height)>0));
ck('miniaturas más ligeras que originales',readFileSync('assets/Portadas de libros/thumbs/visitante.webp').length<readFileSync('assets/Portadas de libros/visitante.webp').length);
const eb=$('input[name="f"][value="ebook"]');eb.checked=true;$('#fBody').dispatchEvent(new w.Event('input',{bubbles:true}));
ck('filtro ebook autorizados (5)',$$('#results .book').length===5);
$('#clearF').click();ck('limpiar filtros (20)',$$('#results .book').length===20);
$('a[data-apply="l:corta"]').click();ck('lecturas cortas (4)',$$('#results .book').length===4);
$('.book .wish').click();ck('wishlist cuenta 1',$('#wishCount').textContent==='1');
$('#wishBtn').click();ck('drawer wishlist con 1 línea',$$('#wBody .line').length===1);
$('.book [data-add]').click();ck('carrito cuenta 1',$('#cartCount').textContent==='1');
$('#cartBtn').click();ck('drawer con 1 línea',$$('#cBody .line').length===1);
$('a[href="#quiz"]').click();
for(let i=0;i<5;i++)$('#qBody .choice').click();
ck('quiz da 3 libros',$$('#qBody .book').length===3);
$('#nEmail').value='malo';$('#newsForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
ck('newsletter valida correo',$('#nMsg').textContent.includes('válido'));
ck('sección ofertas vigentes',$$('#offersResults .book').length===1);
ck('sección escritores (3)',$$('#writersList .writer-card').length===3);
ck('oferta vencida con sola fecha fin se desactiva',apiDom.window.HFAPI.isOfferActive({percent:20,end:'2020-01-02'})===false);
ck('oferta sin fechas sigue vigente',apiDom.window.HFAPI.isOfferActive({percent:20})===true);
ck('porcentaje de oferta fuera de rango se rechaza',apiDom.window.HFAPI.isOfferActive({percent:120})===false);
apiDom.window.fetch=async()=>({ok:true,json:async()=>({books:[{id:'prueba',title:'Prueba',author:'Autor',formats:{physical:{price:10},ebook:{price:5}},available:true,ebookAuthorized:true}],collections:[],writers:[]})});
const origSetItem=apiDom.window.Storage.prototype.setItem;
apiDom.window.Storage.prototype.setItem=()=>{throw new Error('QuotaExceededError')};
let storageErr='';
try{await apiDom.window.HFAPI.createOrder({customerName:'Ana',customerPhone:'70000000',deliveryType:'retiro',items:[{id:'prueba',format:'fisico',qty:1}]})}catch(e){storageErr=e.message}
apiDom.window.Storage.prototype.setItem=origSetItem;
ck('fallo de almacenamiento no confirma pedido',storageErr.includes('guardar'));

// RF12/RF13: la suscripción se persiste con consentimiento
$('#nEmail').value='ana@example.com';$('#nOk').checked=true;
$('#newsForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
await new Promise(r=>setTimeout(r,30));
const subs=JSON.parse(w.localStorage.getItem('hf_subscriptions')||'[]');
ck('newsletter guarda suscripción',subs.length===1&&subs[0].consent===true&&subs[0].active===true&&Boolean(subs[0].consentAt));

// RF09/RF07: flujo real carrito -> formulario de pedido -> WhatsApp
$('#cartBtn').click();
const payBtn=$$('#cFoot .btn').find(b=>b.textContent.includes('pedido'));
payBtn.click();
ck('botón del carrito abre el formulario de pedido',$('#orderDlg').hasAttribute('open')&&!$('#orderDlg').hidden);
ck('resumen del pedido muestra el libro',$$('#orderSummary .order-summary__item').length===1);
$('#orderForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
ck('pedido rechaza campos vacíos',$('#orderErr').textContent.includes('nombre'));
$('#orderName').value='Ana Prueba';$('#orderPhone').value='70000000';$('#orderPrivacy').checked=true;
$('#orderForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
await new Promise(r=>setTimeout(r,50));
const orders=JSON.parse(w.localStorage.getItem('hf_orders')||'[]');
ck('pedido guardado con total recalculado',orders.length===1&&orders[0].total>0&&orders[0].customerName==='Ana Prueba');
ck('confirmación muestra número de pedido',/^HF-\d{8}-/.test($('#confirmCode').textContent));
ck('confirmación ofrece enlace de WhatsApp',/^https:\/\/wa\.me\//.test($('#confirmWa').href));
ck('pedido vacía el carrito',$('#cartCount').textContent==='0');

// RF10/RF16/RNF07: WhatsApp y logo centralizados, detalle accesible
ck('CTA WhatsApp centralizados',$$('[data-wa]').length===5&&$$('[data-wa]').every(a=>a.href.startsWith('https://wa.me/')));
ck('logo real en header y footer',$$('img[data-logo]').length===2&&$$('img[data-logo]').every(i=>i.getAttribute('src')==='assets/logo.svg'));
ck('portadas con alt descriptivo',$$('#results .book__cover-img').every(i=>i.alt.startsWith('Portada de ')));
ck('detalle accesible por teclado',$('#results .book__cover').tagName==='BUTTON'&&Boolean($('#results .book h3 button')));
$('#results .book__cover').click();
ck('detalle muestra la colección',$('#bookDetailDlg').textContent.includes('Colección:'));
ck('detalle usa la portada completa',!$('#bookDetailDlg .book__cover-img').src.includes('/thumbs/'));
$('#bookDetailDlg .icon-btn').click();
ck('etiqueta Agotado con estilo',readFileSync('css/components.css','utf8').includes('.tag--out{'));
const ld=JSON.parse($('script[type="application/ld+json"]').textContent);
ck('JSON-LD sincronizado con config',ld['@graph'].some(x=>x['@type']==='BookStore'&&x.telephone==='+50377578592'));

ck('sin errores JS',errs.length===0);if(errs.length)console.log(errs);

// ---- RF14/RF15: panel de administración --------------------------------
const adminHtml=readFileSync('admin/index.html','utf8').replace(/<script type="module"[^>]*><\/script>/,'');
const ad=new JSDOM(adminHtml,{runScripts:'outside-only',url:'http://localhost/admin/'});
const aw=ad.window, adoc=aw.document;
aw.matchMedia=()=>({matches:false});aw.Element.prototype.scrollIntoView=()=>{};
aw.fetch=async()=>({ok:true,json:async()=>JSON.parse(readFileSync('data/books.json','utf8'))});
const aerrs=[];aw.addEventListener('error',e=>aerrs.push(e.message));
aw.eval(adminJs);await new Promise(r=>setTimeout(r,80));
const aQ=s=>adoc.querySelector(s), aQa=s=>[...adoc.querySelectorAll(s)];
ck('panel cerrado sin sesión',aQ('#adminView').hidden===true);
aQ('#loginPass').value='mala';
aQ('#loginForm').dispatchEvent(new aw.Event('submit',{cancelable:true,bubbles:true}));
ck('login rechaza contraseña incorrecta',aQ('#loginErr').textContent.includes('incorrectos'));
aQ('#loginPass').value='historias2026';
aQ('#loginForm').dispatchEvent(new aw.Event('submit',{cancelable:true,bubbles:true}));
await new Promise(r=>setTimeout(r,80));
ck('login abre el panel',aQ('#adminView').hidden===false);

aw.localStorage.setItem('hf_orders',JSON.stringify([{
  id:'HF-20261125-TEST',createdAt:new Date().toISOString(),status:'Nuevo',
  customerName:'Cliente Prueba',customerPhone:'70000000',deliveryType:'retiro',
  address:'',notes:'',items:[{title:'Libro',format:'fisico',qty:1,price:10}],total:10
}]));
aQ('#orderRefreshBtn').click();await new Promise(r=>setTimeout(r,30));
ck('panel lista pedidos',aQa('#ordersList .admin-row').length===1);
aQ('#ordersList .admin-row button').click();await new Promise(r=>setTimeout(r,30));
ck('detalle del pedido con WhatsApp',/^https:\/\/wa\.me\/50370000000/.test(aQ('#orderDetail a').href));
aQ('#orderDetail select').value='Pagado';
aQa('#orderDetail button').find(b=>b.textContent.includes('Cambiar estado')).click();
await new Promise(r=>setTimeout(r,40));
ck('panel cambia estado del pedido',JSON.parse(aw.localStorage.getItem('hf_orders'))[0].status==='Pagado');

aQ('#booksAdminList .admin-row button').click();
ck('formulario de libro se abre',aQ('#bookForm').hidden===false);
ck('panel carga la portada real',aQ('#bCover').value.includes('Portadas%20de%20libros/'));
aQ('#bPhysical').value='99';
aQ('#bookForm').dispatchEvent(new aw.Event('submit',{cancelable:true,bubbles:true}));
await new Promise(r=>setTimeout(r,50));
const over=JSON.parse(aw.localStorage.getItem('hf_books_override')||'[]');
ck('panel guarda libro editado',over.length===1&&over[0].formats.physical.price===99&&over[0].cover.image.includes('1984.webp'));
aQa('#booksAdminList .admin-row button').find(b=>b.textContent==='Ocultar').click();
await new Promise(r=>setTimeout(r,40));
ck('panel oculta libro del catálogo',JSON.parse(aw.localStorage.getItem('hf_books_override')||'[]').some(b=>b.hidden===true));
const del=aQa('#booksAdminList .admin-row button').find(b=>b.textContent==='Eliminar');
del.click();del.click();await new Promise(r=>setTimeout(r,50));
ck('borrado de libro con confirmación',JSON.parse(aw.localStorage.getItem('hf_books_deleted')||'[]').length===1);

aQ('[data-tab="colecciones"]').click();await new Promise(r=>setTimeout(r,30));
aQ('#newCollectionBtn').click();
aQ('#cId').value='prueba';aQ('#cName').value='Colección prueba';aQ('#cSlogan').value='Eslogan';
aQ('#collectionForm').dispatchEvent(new aw.Event('submit',{cancelable:true,bubbles:true}));
await new Promise(r=>setTimeout(r,40));
ck('panel crea colección',JSON.parse(aw.localStorage.getItem('hf_collections_override')||'[]').some(c=>c.id==='prueba'));

aQ('[data-tab="recomendacion"]').click();await new Promise(r=>setTimeout(r,30));
aQ('#pickBook').value='el-infinito-en-un-junco';
aQ('#pickForm').dispatchEvent(new aw.Event('submit',{cancelable:true,bubbles:true}));
await new Promise(r=>setTimeout(r,40));
ck('panel elige recomendación semanal',JSON.parse(aw.localStorage.getItem('hf_weekly_pick')||'{}').bookId==='el-infinito-en-un-junco');

aw.localStorage.setItem('hf_subscriptions',JSON.stringify([{email:'ana@x.com',active:true,consent:true,consentAt:new Date().toISOString()}]));
aQ('[data-tab="suscriptores"]').click();await new Promise(r=>setTimeout(r,30));
ck('panel lista suscriptores',aQa('#subsList .admin-row').length===1);
aQ('#subsList .admin-row button').click();await new Promise(r=>setTimeout(r,30));
ck('panel da de baja suscriptor',JSON.parse(aw.localStorage.getItem('hf_subscriptions'))[0].active===false);

aQ('#logoutBtn').click();
for(let i=0;i<5;i++){
  aQ('#loginPass').value='mala';
  aQ('#loginForm').dispatchEvent(new aw.Event('submit',{cancelable:true,bubbles:true}));
}
ck('panel limita intentos fallidos',aQ('#loginErr').textContent.includes('bloqueado'));
ck('panel sin errores JS',aerrs.length===0);if(aerrs.length)console.log(aerrs);

// ---- RNF05: build, SEO y CSP -------------------------------------------
const cat=readFileSync('dist/catalogo/index.html','utf8');
const writers=readFileSync('dist/escritores/index.html','utf8');
const png=readFileSync('assets/og-cover.png');
ck('og:image real 1200x630',png.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&png.readUInt32BE(16)===1200&&png.readUInt32BE(20)===630);
ck('rutas correctas en subpágina',cat.includes('src="../js/main.js"')&&cat.includes('href="../css/main.css"')&&!cat.includes('js/section.js'));
ck('sin script inline (CSP)',!cat.includes('<script>'));
ck('metadatos de sección',cat.includes('name="hf-base" content="../"')&&cat.includes('name="hf-section" content="catalogo"'));
ck('H1 propio por página',cat.includes('<h1>Explora nuestro catálogo de libros</h1>')&&!cat.includes('Tu próxima gran aventura'));
const catLd=JSON.parse(cat.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
ck('WebPage único en JSON-LD',catLd['@graph'].some(x=>x['@type']==='WebPage'&&x.url==='https://historiasfantasticas.example/catalogo/'));
ck('páginas con títulos distintos',!cat.includes('<title>Escritores Emergentes')&&writers.includes('<title>Escritores Emergentes'));
ck('sitemap incluye las 5 páginas',(readFileSync('dist/sitemap.xml','utf8').match(/<url>/g)||[]).length===6);
ck('build del panel completo',existsSync('dist/admin/index.html')&&existsSync('dist/admin/admin.js')&&existsSync('dist/css/admin.css'));

// La subpágina generada debe cargar catálogo, logo y la sección correctamente
const subHtml=cat.replace(/<script type="module"[^>]*><\/script>/g,'');
const sd=new JSDOM(subHtml,{runScripts:'outside-only',url:'http://localhost/catalogo/'});
const sw=sd.window,sdoc=sw.document;
sw.matchMedia=()=>({matches:false});sw.Element.prototype.scrollIntoView=function(){this.dataset.scrolled='1'};
sw.open=()=>({opener:null});
const fetched=[];
sw.fetch=async url=>{fetched.push(String(url));return {ok:true,json:async()=>JSON.parse(readFileSync('dist/data/books.json','utf8'))}};
const serrs=[];sw.addEventListener('error',e=>serrs.push(e.message));
sw.eval(js);await new Promise(r=>setTimeout(r,100));
ck('subpágina carga catálogo',sdoc.querySelectorAll('#results .book').length===20);
ck('fetch usa prefijo ../',fetched.some(u=>u.includes('../data/books.json')));
ck('logo usa prefijo ../',sdoc.querySelector('img[data-logo]').getAttribute('src')==='../assets/logo.svg');
ck('sección principal ordenada sin scroll JS',cat.includes('<html lang="es" data-hf-page data-hf-section="catalogo">')&&readFileSync('css/base.css','utf8').includes('[data-hf-section="catalogo"] #catalogo'));
ck('subpágina sin errores JS',serrs.length===0);if(serrs.length)console.log(serrs);

// El dominio se cambia en un solo sitio (SITE_URL) y se propaga a todo el build
execFileSync(process.execPath,['build.mjs'],{stdio:'ignore',env:{...process.env,SITE_URL:'https://tienda.prueba'}});
const customIndex=readFileSync('dist/index.html','utf8');
ck('dominio centralizado en el build',customIndex.includes('https://tienda.prueba/')&&!customIndex.includes('historiasfantasticas.example')&&readFileSync('dist/robots.txt','utf8').includes('https://tienda.prueba/sitemap.xml'));
execFileSync(process.execPath,['build.mjs'],{stdio:'ignore'});

// Un fallo debe romper el pipeline: antes se imprimía "FALLA" pero el exit era 0.
if (failed) {
  console.error(`\n${failed} verificación(es) fallaron.`);
  process.exitCode = 1;
} else {
  console.log('\nTodas las verificaciones pasaron.');
}
