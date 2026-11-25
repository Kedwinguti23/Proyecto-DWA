import { $ } from './utils.js';
import { subscribe, unsubscribe } from './api.js';
export function initForm() {
  // Newsletter
  const nf = $('#newsForm'), nm = $('#nMsg');
  const say = t => { nm.textContent = t };
  const unsubEmail = new URLSearchParams(location.search).get('unsub');
  if (unsubEmail) {
    unsubscribe(unsubEmail).then(() => say(`Se canceló la suscripción de ${unsubEmail}.`));
  }
  nf.addEventListener('submit', async e => {
    e.preventDefault(); const em = nf.elements.email.value.trim();
    if (nf.elements.website.value) return say('¡Listo! Te avisaremos con la próxima recomendación.'); // honeypot: bots no ven error
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em) || em.length > 254) { say('Escribe un correo válido, por ejemplo tu@correo.com.'); nf.elements.email.focus(); return }
    if (!$('#nOk').checked) { say('Marca la casilla para poder suscribirte.'); return }
    // MOCK: reemplazar por llamada HTTP al backend (POST /api/subscriptions)
    await subscribe(em, true);
    nm.textContent = '¡Te suscribiste! Pronto recibirás novedades. ';
    const a = document.createElement('a');
    a.href = '?unsub=' + encodeURIComponent(em);
    a.textContent = 'Darme de baja';
    nm.append(a);
    nf.reset();
  });
}
