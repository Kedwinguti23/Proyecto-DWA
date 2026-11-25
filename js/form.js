import {$} from './utils.js';
import {subscribe, unsubscribe} from './api.js';
import {CONFIG} from './config.js';

export function initForm(){
  // Texto de privacidad centralizado (RNF07)
  document.querySelectorAll('.privacy-text').forEach(n => {
    n.textContent = CONFIG.pendingConfirmations.privacyPolicyText;
  });

  const nf=$('#newsForm'), nm=$('#nMsg');

  // Baja de la recomendación semanal (RF13): ?unsub=correo
  const unsub = new URLSearchParams(location.search).get('unsub');
  if (unsub) {
    unsubscribe(unsub).then(() => {
      nm.textContent = 'Te has dado de baja de la recomendación semanal.';
    }).catch(() => {
      nm.textContent = 'No pudimos completar la baja. Intenta de nuevo.';
    });
  }

  nf.addEventListener('submit', async e=>{
    e.preventDefault();
    const em=nf.elements.email.value.trim();
    const say=t=>{nm.textContent=t};
    if(nf.elements.website.value)return say('¡Listo! Te avisaremos con la próxima recomendación.'); // honeypot: bots no ven error
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)||em.length>254){say('Escribe un correo válido, por ejemplo tu@correo.com.');nf.elements.email.focus();return}
    if(!$('#nOk').checked){say('Marca la casilla para poder suscribirte.');return}
    try {
      await subscribe(em, true);
      say('¡Listo! Te avisaremos con la próxima recomendación.');
      nf.reset();
    } catch (err) {
      say('No pudimos guardar tu suscripción. Intenta de nuevo.');
    }
  });
}
