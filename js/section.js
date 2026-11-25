// Navegación a la sección principal de las páginas estáticas generadas.
// Script externo para cumplir la CSP (script-src 'self') de _headers.
const section = document.querySelector('meta[name="hf-section"]')?.content;
if (section) {
  const go = () => document.getElementById(section)?.scrollIntoView({behavior: 'auto'});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
}
