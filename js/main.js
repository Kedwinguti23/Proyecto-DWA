import {initMenu} from './menu.js';
import {initForm} from './form.js';
import {loadCatalog} from './data.js';
import {initWishlist} from './wishlist.js';
import {renderShelves} from './carousel.js';
import {initCatalog} from './catalog.js';
import {initQuiz} from './quiz.js';
import {initCart} from './cart.js';
initMenu();initForm();
(async()=>{
  try{
    const{books,collections}=await loadCatalog();
    initWishlist(books);renderShelves(books,collections);initCatalog(books);initQuiz(books);initCart(books);
  }catch(err){
    const p=document.createElement('p');p.className='muted';p.textContent='No pudimos cargar el catálogo. Recarga la página en unos minutos.';
    document.querySelector('#shelves').append(p);
  }
})();
