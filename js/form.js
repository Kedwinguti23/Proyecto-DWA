import {$} from './utils.js';
export function initForm(){
// Newsletter
const nf=$('#newsForm'),nm=$('#nMsg');
nf.addEventListener('submit',e=>{
  e.preventDefault();const em=nf.elements.email.value.trim();
  const say=t=>{nm.textContent=t};
  if(nf.elements.website.value)return say('¡Listo! Te avisaremos con la próxima recomendación.'); // honeypot: bots no ven error
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)||em.length>254){say('Escribe un correo válido, por ejemplo tu@correo.com.');nf.elements.email.focus();return}
  if(!$('#nOk').checked){say('Marca la casilla para poder suscribirte.');return}
  say('¡Listo! Te avisaremos con la próxima recomendación.');nf.reset();
});
}
