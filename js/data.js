// Carga y normaliza el catálogo (data/books.json es la fuente única)
const price=(b,t)=>{const f=b.formats.find(x=>x.type===t);return f?Number(f.price):0};
export async function loadCatalog(){
  const res=await fetch('data/books.json');
  if(!res.ok)throw new Error('No se pudo cargar el catálogo');
  const j=await res.json();
  const books=j.books.map(b=>({id:String(b.id),t:String(b.title),a:String(b.author),p:price(b,'fisico'),e:price(b,'ebook'),
    bg:b.cover.bg,fg:b.cover.fg,f:(b.isNew?'n':'')+(b.bestseller?'b':''),c:b.collections,d:Number(b.discountPct)||0,
    g:b.genres,h:b.themes,n:Number(b.pages),mq:[b.quiz.mood,b.quiz.pace]}));
  return{books,collections:j.collections};
}
