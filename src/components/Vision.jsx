// Page « La vision de SOMA » (port de visionOverlay / showVision / closeVision) et
// pictogrammes « pourquoi » (port de POURQUOI / ouvrirPourquoi). Textes réécrits en nov. 2026.
import { useEffect, useState } from 'react';

const VISION_HTML = "<div class=\"visionBrand\">SOMA</div>\n    <div class=\"visionKicker\">La méthode</div>\n\n    <h1 class=\"visionH1\">D'abord un fichier Excel</h1>\n    <p class=\"visionP\">SOMA vient d'un tableur. Pendant plusieurs années, j'ai construit les budgets de nos agences sur Excel. Je l'ai corrigé, complété, confronté chaque année aux chiffres réels. Petit à petit, ce fichier est devenu une façon de travailler.</p>\n    <p class=\"visionP\">SOMA reprend cette façon de travailler et la met à disposition de tous ceux qui construisent un budget d'agence.</p>\n\n    <h2 class=\"visionH2\">Ce que je crois</h2>\n    <p class=\"visionP\">Le bon budget, c'est le plus réaliste, pas le moins cher. Il doit tenir compte de ce que vit vraiment l'agence.</p>\n    <p class=\"visionP\">Viser zéro heure supplémentaire n'a pas de sens. Sans aucune marge, le moindre imprévu met l'équipe en difficulté. Des heures supplémentaires maîtrisées, c'est de la souplesse.</p>\n    <p class=\"visionP\">Le choix le plus rentable n'est pas toujours le bon. Un responsable peut décider d'accorder des congés à un moment qui arrange son équipe, même si le calcul dit autre chose. SOMA ne le lui reproche pas. Il chiffre ce choix pour que le responsable puisse l'expliquer.</p>\n    <p class=\"visionP\">SOMA ne décide pas à la place des responsables d'agence. Il fait les calculs, il montre ce qui pèse dans le budget, et chacun arbitre entre la performance, la souplesse et les contraintes du terrain.</p>\n    <p class=\"visionP\">Un outil né du terrain, pour aider ceux qui font tourner les agences à décider en connaissance de cause.</p>\n\n    <div class=\"visionSign\">Frédéric Cavé</div>";

export const POURQUOI = {
  "conges": {
    "titre": "Pourquoi SOMA répartit les congés ?",
    "texte": "Les vacances scolaires ne suffisent pas pour poser tous les congés sans gêner l'activité. SOMA étale donc les congés sur l'année, pour éviter que trop de monde soit absent en même temps, en respectant les périodes légales."
  },
  "lissage": {
    "titre": "Pourquoi lisser les heures supplémentaires ?",
    "texte": "Une charge régulière se tient mieux qu'une alternance de semaines creuses et de semaines chargées. SOMA place les congés là où l'activité le permet, pour garder un niveau d'heures supplémentaires stable et une charge équitable pour ceux qui sont présents."
  },
  "hs50": {
    "titre": "Pourquoi distinguer les heures à 25 % et à 50 % ?",
    "texte": "Au-delà de 8 heures supplémentaires dans la semaine, l'heure est majorée de 50 % au lieu de 25 %. Deux agences avec le même volume d'heures supplémentaires peuvent donc avoir des coûts très différents. Voir cette bascule aide à agir sur le vrai coût."
  },
  "reserve": {
    "titre": "Pourquoi garder une réserve d'heures supplémentaires ?",
    "texte": "L'activité réelle ne sera jamais celle du budget. Une réserve d'environ 10 % d'heures supplémentaires absorbe une hausse sans passer tout de suite aux heures les plus chères, et une baisse sans perdre en productivité. Viser zéro rendrait le budget trop rigide."
  },
  "calculs": {
    "titre": "Pourquoi SOMA fait-il les calculs ?",
    "texte": "Présence, congés, coûts : il y a trop de paramètres pour tout calculer de tête. SOMA s'occupe des calculs et vous laisse le temps de décider. Vous gardez la main sur chaque choix, SOMA vous en montre les conséquences."
  },
  "coutchoix": {
    "titre": "Pourquoi SOMA affiche un coût du choix ?",
    "texte": "Vous pouvez répartir les congés autrement que ce que propose SOMA, pour votre équipe ou le climat social. Ce choix a parfois un coût. SOMA le chiffre pour que vous puissiez le justifier, pas pour vous en dissuader."
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
