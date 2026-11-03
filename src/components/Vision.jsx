// Page « La vision de SOMA » (port de visionOverlay / showVision / closeVision) et
// pictogrammes « pourquoi » (port de POURQUOI / ouvrirPourquoi). Textes repris verbatim.
import { useEffect, useState } from 'react';

const VISION_HTML = "<div class=\"visionBrand\">SOMA</div>\n    <div class=\"visionKicker\">La méthode</div>\n\n    <h1 class=\"visionH1\">Une méthode construite à partir du terrain</h1>\n    <p class=\"visionP\">SOMA n'est pas né d'un logiciel. Il est né de mon expérience.</p>\n    <p class=\"visionP\">Pendant plusieurs années, j'ai construit et fait évoluer un système sur Excel pour bâtir les budgets de nos agences de transport sanitaire. À force de le corriger, de l'affiner, de le confronter au réel, cet outil est devenu bien plus qu'un tableur : une méthode.</p>\n    <p class=\"visionP\">SOMA est l'aboutissement de ce travail. Il rassemble cette méthode, la structure, et la met au service de tous ceux qui construisent un budget d'agence.</p>\n\n    <h2 class=\"visionH2\">La vision SOMA</h2>\n    <p class=\"visionP\">Un bon budget n'est pas le budget le moins cher. C'est le budget le plus réaliste au regard des contraintes opérationnelles.</p>\n    <p class=\"visionP\">Le meilleur planning n'est pas celui qui supprime toutes les heures supplémentaires. Un budget sans aucune marge est un budget rigide, incapable d'absorber la réalité. Les heures supplémentaires ne sont pas une faute : ce sont une réserve de souplesse, à condition de rester maîtrisées.</p>\n    <p class=\"visionP\">La meilleure décision n'est pas toujours la plus rentable. Un responsable peut choisir d'accorder des congés au bon moment pour son équipe, même si ce n'est pas l'optimum mathématique. SOMA ne juge pas ce choix : il le rend visible, il le chiffre, et il permet de l'assumer.</p>\n    <p class=\"visionP\">SOMA ne cherche pas à décider à la place des responsables qui font tourner les agences. Il cherche à éclairer leurs décisions. Il calcule ce qui peut l'être, il montre ce qui compte, et il laisse à chacun la responsabilité de l'arbitrage entre la performance, la souplesse et les contraintes du terrain.</p>\n    <p class=\"visionP\">C'est cela, SOMA : une méthode née du terrain, devenue un outil, pour aider les responsables à mieux décider.</p>\n\n    <div class=\"visionSign\">Frédéric Cavé</div>";

export const POURQUOI = {
  "conges": {
    "titre": "Pourquoi SOMA répartit les congés ?",
    "texte": "Il n'y a pas assez de semaines de vacances scolaires pour écouler tous les congés sans mettre en difficulté l'activité. SOMA répartit les congés sur l'année pour éviter que trop de personnes s'absentent en même temps, tout en respectant les périodes légales de prise de congés."
  },
  "lissage": {
    "titre": "Pourquoi lisser les heures supplémentaires ?",
    "texte": "Une charge régulière est plus tenable qu'une alternance de semaines vides et de semaines sous tension. En répartissant les congés là où l'activité le permet, SOMA cherche à garder un recours aux heures supplémentaires stable — pour que la charge des équipes présentes reste équitable toute l'année."
  },
  "hs50": {
    "titre": "Pourquoi distinguer les heures à 25% et à 50% ?",
    "texte": "Au-delà de huit heures supplémentaires par semaine, une heure coûte 50% de plus au lieu de 25%. Deux agences avec le même volume d'heures supplémentaires peuvent donc avoir des coûts très différents. Rendre cette bascule visible permet de connaître le vrai coût de production, et d'agir dessus."
  },
  "reserve": {
    "titre": "Pourquoi viser une réserve d'heures supplémentaires plutôt que zéro ?",
    "texte": "L'activité réelle ne sera jamais exactement celle du budget. Une réserve d'environ 10% d'heures supplémentaires permet d'absorber une hausse d'activité sans basculer immédiatement dans les heures les plus chères, et une baisse sans dégrader la productivité. Zéro heure supplémentaire n'est pas un objectif : c'est une rigidité."
  },
  "calculs": {
    "titre": "Pourquoi SOMA calcule-t-il à votre place ?",
    "texte": "Les arbitrages de présence, de congés et de coûts sont trop nombreux pour être tenus de tête. SOMA fait les calculs pour vous laisser du temps pour ce qui compte vraiment : décider. Vous gardez toujours la main sur les choix ; SOMA se charge de vous en montrer les conséquences."
  },
  "coutchoix": {
    "titre": "Pourquoi SOMA affiche-t-il un « coût du choix » ?",
    "texte": "Vous pouvez choisir de répartir les congés autrement que ce que le calcul suggère — pour le climat social, pour votre équipe. Ce choix a parfois un coût. SOMA le chiffre non pour vous en dissuader, mais pour que vous puissiez l'assumer et le justifier en toute transparence."
  }
};

const cle = (id) => 'soma_vision_vue_' + (id || 'anon');
export function visionDejaVue(id) { try { return localStorage.getItem(cle(id)) === '1'; } catch (e) { return true; } }

export function VisionOverlay({ premiereFois, userId, onClose }) {
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, []);
  const fermer = () => { try { localStorage.setItem(cle(userId), '1'); } catch (e) { /* stockage indisponible */ } onClose(); };
  return (
    <div className="visionOverlay" style={{ display: 'flex' }} data-testid="vision">
      <div className="visionInner">
        <div dangerouslySetInnerHTML={{ __html: VISION_HTML }} />
        <button className="visionBtn" onClick={fermer}>{premiereFois ? 'Commencer à utiliser SOMA' : 'Fermer'}</button>
      </div>
    </div>
  );
}

// Pictogramme « ? » qui ouvre une bulle expliquant POURQUOI la règle existe
export function Pourquoi({ k }) {
  const [pos, setPos] = useState(null);
  const data = POURQUOI[k];
  useEffect(() => {
    if (!pos) return undefined;
    const f = () => setPos(null);
    const t = setTimeout(() => document.addEventListener('click', f, { once: true }), 10);
    return () => { clearTimeout(t); document.removeEventListener('click', f); };
  }, [pos]);
  if (!data) return null;
  const ouvrir = (ev) => {
    ev.stopPropagation(); ev.preventDefault();
    const r = ev.currentTarget.getBoundingClientRect();
    const bw = 320;
    let top = r.bottom + 8;
    if (top + 200 > window.innerHeight) top = Math.max(8, r.top - 8 - 200);
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - bw - 16)), top, width: bw });
  };
  return (
    <>
      <span className="pourquoiPicto" data-testid={'pourquoi-' + k} onClick={ouvrir} title="Pourquoi cette règle ?">?</span>
      {pos ? (
        <div className="pourquoiBulle" data-testid="pourquoi-bulle" style={{ position: 'fixed', ...pos, zIndex: 10000 }} onClick={(e) => e.stopPropagation()}>
          <div className="pourquoiTitre">{data.titre}</div>
          <div className="pourquoiTexte">{data.texte}</div>
          <div className="pourquoiFooter">SOMA · la méthode</div>
        </div>
      ) : null}
    </>
  );
}
