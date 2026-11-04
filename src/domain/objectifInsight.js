import { baseH, isRoulant, heuresDispoAnnuelles } from './calculations.js';
import { euro } from './format.js';

// Interprétation de l'objectif — port fidèle de renderObjectifInsight().
// Fonction PURE : prend l'agence, renvoie de quoi afficher (rappel, phrase, bandeau).
// Aucune manipulation du DOM ici.
//
// Retour :
//   { recall, phrase, banner: { class, icon, title, detail } | null }
export function objectifInsight(a) {
  const caObj = +a.targetCA || 0;
  const txr = +a.targetTXR || 0;
  const ca2026 = +a.histCA || 0;
  const baseHebdo = baseH(a);
  const nbRoulants = (a.employees || []).filter((e) => isRoulant(e.qual)).length;

  // Rappel du réalisé (ligne discrète).
  const parts = [];
  if (a.histCA2025) parts.push('CA 2025 ' + euro(+a.histCA2025 || 0));
  if (ca2026) parts.push('CA 2026 ' + euro(ca2026));
  if (+a.histTXR) parts.push('TXR ' + (+a.histTXR) + ' €/h');
  const recall = parts.length ? parts.join('  ·  ') : 'Renseignez vos résultats passés ci-dessous';

  // Cas 1 : objectif non renseigné.
  if (!caObj || !txr) {
    return { recall, phrase: 'Renseignez votre objectif de chiffre d\u2019affaires et votre TXR cible. SOMA évaluera aussitôt si cet objectif est atteignable avec votre effectif actuel.', banner: null };
  }

  // Cas 2 : effectif pas encore saisi.
  if (!baseHebdo || nbRoulants === 0) {
    return { recall, phrase: 'Votre objectif est fixé à ' + euro(caObj) + '. Renseignez votre équipe (étape suivante) pour que SOMA vérifie que cet objectif est réalisable.', banner: null, phraseHtml: true };
  }

  // Cas 3 : interprétation complète.
  // Capacité hors HS : base moins la maladie ET les congés (audit nov. 2026)
  const dispoHebdoMoy = heuresDispoAnnuelles(a) / 52;
  const caMaxSansHS = Math.round(heuresDispoAnnuelles(a) * txr);
  const tauxCharge = caMaxSansHS ? Math.round((caObj / caMaxSansHS) * 100) : 0;

  let evolTxt = '';
  if (ca2026 > 0) {
    const evol = Math.round(((caObj - ca2026) / ca2026) * 100);
    if (evol > 2) evolTxt = 'Pour atteindre cet objectif, il faudra produire environ ' + evol + ' % de plus qu\u2019en 2026. ';
    else if (evol < -2) evolTxt = 'Cet objectif est en retrait d\u2019environ ' + Math.abs(evol) + ' % par rapport à 2026. ';
    else evolTxt = 'Cet objectif est stable par rapport à 2026. ';
  }

  const detail = 'Capacité sans heures supp. : ' + euro(caMaxSansHS) + ' · Objectif : ' + euro(caObj);
  let phrase, banner;
  if (tauxCharge > 115) {
    phrase = evolTxt + 'Cet objectif dépasse nettement la capacité de votre effectif actuel : il nécessiterait un recours massif aux heures supplémentaires, difficile à tenir. Un renfort d\u2019effectif est probablement nécessaire.';
    banner = { class: 'warn', icon: '⚠', title: 'Objectif supérieur à votre capacité (' + tauxCharge + ' %)', detail };
  } else if (tauxCharge > 100) {
    phrase = evolTxt + 'Cet objectif est atteignable, mais demandera un recours modéré aux heures supplémentaires (jusqu\u2019à 20 %). Surveillez les semaines de tension.';
    banner = { class: 'info', icon: '🔵', title: 'Objectif atteignable avec des heures supplémentaires (' + tauxCharge + ' %)', detail };
  } else if (tauxCharge > 85) {
    phrase = evolTxt + 'Votre effectif actuel permet d\u2019atteindre cet objectif. Quelques semaines pourront être tendues, mais l\u2019ensemble reste cohérent.';
    banner = { class: 'ok', icon: '✓', title: 'Objectif cohérent avec votre effectif (' + tauxCharge + ' %)', detail };
  } else {
    phrase = evolTxt + 'Votre effectif dispose d\u2019une capacité confortable pour cet objectif. Vous pourriez viser plus haut, ou dégager de la marge sur les congés.';
    banner = { class: 'ok', icon: '✓', title: 'Capacité disponible confortable (' + tauxCharge + ' %)', detail };
  }

  return { recall, phrase, banner, tauxCharge, caMaxSansHS };
}

// Détail du calcul de capacité — port fidèle de renderCoherence().
// Renvoie null tant que l'effectif ou le TXR cible manquent.
export function coherenceCapacite(a) {
  const baseHebdo = baseH(a);
  const txr = +a.targetTXR || 0;
  const caObj = +a.targetCA || 0;
  if (!baseHebdo || !txr) return null;
  // Capacité hors HS : base moins la maladie ET les congés (audit nov. 2026)
  const dispoHebdoMoy = heuresDispoAnnuelles(a) / 52;
  const caMaxSansHS = Math.round(heuresDispoAnnuelles(a) * txr);
  const tauxCharge = caObj && caMaxSansHS ? Math.round((caObj / caMaxSansHS) * 100) : 0;
  const nbRoulants = (a.employees || []).filter((e) => isRoulant(e.qual)).length;
  const niveau = tauxCharge > 115 ? 'critique' : tauxCharge > 100 ? 'tendu' : tauxCharge > 85 ? 'coherent' : 'confortable';
  return {
    baseHebdo, txr, dispoHebdoMoy, tauxCharge, niveau,
    caMaxSansHS,
    caMaxAvecHS10: Math.round(caMaxSansHS * 1.10),
    caMaxAvecHS20: Math.round(caMaxSansHS * 1.20),
    caJourCible: nbRoulants > 0 ? Math.round((dispoHebdoMoy / 5) * txr) : 0,
    icone: { critique: '🔴', tendu: '🟡', coherent: '🔵', confortable: '🟢' }[niveau],
    message: {
      critique: 'Objectif difficile à atteindre sans recours massif aux HS. Vérifiez vos références CA.',
      tendu: 'Objectif atteignable avec un recours modéré aux HS (≤ 20%).',
      coherent: 'Objectif cohérent. Quelques semaines tendues possibles.',
      confortable: 'Objectif confortable. Capacité disponible suffisante.'
    }[niveau]
  };
}
