import { M, T, sig, manual, avecCacheMoteur, vueExploitation } from './calculations.js';

// Résultats mensuels du SIG mémorisés par budget (nov. 2026, lenteurs sur les grandes agences).
// Dans React, chaque modification produit un NOUVEL objet budget : la mémoire, indexée sur l'objet
// lui-même, ne peut donc jamais servir une valeur périmée. Un rafraîchissement d'écran sans
// modification (état de sauvegarde, ouverture d'un menu) ne recalcule plus rien.
// Ne pas utiliser sur un objet modifié sur place puis recalculé (moteur, fonctions qui mutent).
const memoire = new WeakMap();
export function sigsDe(a) {
  let s = memoire.get(a);
  if (!s) { s = avecCacheMoteur(() => M.map((_, m) => sig(a, m))); memoire.set(a, s); }
  return s;
}
const SOUS_TOTAUX = new Set(T.filter((r) => r.type === 'subtotal').map((r) => r.label).concat(["Chiffre d'affaires", 'Charges de personnel']));
export function montant(a, l, m) {
  if (SOUS_TOTAUX.has(l)) return sigsDe(a)[m][l] || 0;
  return manual(a, l, m);
}
export function annuel(a, l) {
  return M.reduce((s, _, m) => s + montant(a, l, m), 0);
}

// Même résultat que resultatAffiche(a, role) du moteur, en réutilisant les 12 SIG mémorisés
export function resultatMemo(a, role) {
  return vueExploitation(a, role)
    ? { lib: "Résultat d'exploitation", libMin: "résultat d'exploitation", val: annuel(a, "RESULTAT D'EXPLOITATION") }
    : { lib: 'Résultat net', libMin: 'résultat', val: annuel(a, 'RESULTAT NET') };
}
