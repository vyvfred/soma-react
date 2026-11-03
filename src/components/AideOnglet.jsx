import { useEffect } from 'react';
import { AIDE_ONGLET_Q, faqKeyForRole, setAideCible } from '../domain/faq.js';

// Pastille « ? » ajoutée au titre de chaque onglet (sauf l'Aide) : ouvre l'Aide et
// déroule la question liée à l'onglet (port de injecterPastillesAide / ouvrirAideOnglet).
export default function AideOnglet({ panel, role, onNavigate }) {
  useEffect(() => {
    if (panel === 'aide') return undefined;
    const main = document.querySelector('main.soma-main');
    if (!main) return undefined;
    const map = AIDE_ONGLET_Q[faqKeyForRole(role)] || AIDE_ONGLET_Q[role] || {};
    const poser = () => {
      const h = main.querySelector('.card h2');
      if (!h || h.querySelector('.aideOngletPastille')) return;
      const span = document.createElement('span');
      span.className = 'pourquoiPicto aideOngletPastille';
      span.title = 'Aide sur cet onglet';
      span.textContent = '?';
      span.style.marginLeft = '8px';
      span.setAttribute('data-testid', 'aide-onglet');
      span.onclick = (e) => { e.stopPropagation(); setAideCible(map[panel] || null); onNavigate('aide'); };
      h.appendChild(span);
    };
    poser();
    const obs = new MutationObserver(poser);
    obs.observe(main, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [panel, role, onNavigate]);
  return null;
}
