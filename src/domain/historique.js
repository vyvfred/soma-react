// Annuler / rétablir — texte identique dans le mono (index.html).
// Historique des modifications (annuler / rétablir, comme dans Excel). Les états sont des copies
// complètes du budget, jamais modifiées après coup. Les modifications rapprochées (moins d'une seconde,
// ex. frappe dans une même case) forment une seule action. 50 actions au plus.
const HISTO_MAX=50,HISTO_DELAI=1000;
function creerHistorique(){return {passe:[],futur:[],dernier:0};}
function viderHistorique(h){h.passe=[];h.futur=[];h.dernier=0;return h;}
// À appeler AVANT d'appliquer une modification, avec une copie de l'état d'avant
function noterAvant(h,etatAvant,maintenant){
  if(!h.passe.length||maintenant-h.dernier>HISTO_DELAI){h.passe.push(etatAvant);if(h.passe.length>HISTO_MAX)h.passe.shift();}
  h.futur=[];h.dernier=maintenant;return h;
}
function annulerHisto(h,etatCourant){if(!h.passe.length)return null;let x=h.passe.pop();h.futur.push(etatCourant);h.dernier=0;return x;}
function retablirHisto(h,etatCourant){if(!h.futur.length)return null;let x=h.futur.pop();h.passe.push(etatCourant);h.dernier=0;return x;}

export { HISTO_MAX, HISTO_DELAI, creerHistorique, viderHistorique, noterAvant, annulerHisto, retablirHisto };
