import {
  cpPlanifies, needWeeks, mainMonth, hsParPersonne, coutDuChoixREX, qualifierSemaine, isRoulant
} from './calculations.js';
import { euro } from './format.js';

const M = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// Interprétation de la présence — port fidèle de renderRhInsight().
// Fonction PURE : renvoie la phrase d'interprétation (HTML) ou null si l'écran
// de guidage doit prendre le relais (pas d'équipe / pas d'objectif).
export function presenceInsight(a) {
  const nbRoulants = a.employees ? a.employees.filter((e) => isRoulant(e.qual)).length : 0;
  if (nbRoulants === 0 || !(+a.targetCA > 0 && +a.targetTXR > 0)) return null;

  const plan = cpPlanifies(a);
  const cpRepartis = plan > 0;

  const ratios = needWeeks(a).map((w) => ({ week: w.week, mois: mainMonth(a, w.week), ...hsParPersonne(a, w.week) }));
  const moy = ratios.length ? ratios.reduce((s, r) => s + r.ratio, 0) / ratios.length : 0;
  const surcharge = ratios.filter((r) => r.hs >= 0.5 && r.ratio > moy * 1.4).sort((x, y) => y.ratio - x.ratio);
  const choix = coutDuChoixREX(a);

  // État 1 : congés pas encore répartis.
  if (!cpRepartis) {
    const nbSal = a.employees.filter((e) => isRoulant(e.qual)).length;
    return 'Votre équipe et votre objectif sont en place. Il reste à répartir les congés de vos <b>' + nbSal + ' salariés</b> sur l\u2019année. SOMA peut le faire en lissant la charge — utilisez <b>« Répartir les congés automatiquement »</b>.';
  }

  // État 4 : choix REX coûteux.
  if (choix.mesurable && choix.surcout > 0) {
    let phrase = 'Vos congés sont répartis. Vous avez choisi d\u2019accorder des congés différemment de l\u2019optimum sur <b>' + choix.semaines.length + ' semaine' + (choix.semaines.length > 1 ? 's' : '') + '</b>, soit un surcoût de <b>' + euro(choix.surcout) + '</b> — un arbitrage social que vous pourrez justifier à la validation.';
    if (surcharge.length) {
      const pire = surcharge[0];
      const q1 = qualifierSemaine(a, pire.week);
      phrase += ' Par ailleurs, la semaine ' + pire.week + (q1 ? ' (' + q1 + ')' : '') + ' reste tendue.';
    }
    return phrase;
  }

  // État 3 : semaines en surcharge.
  if (surcharge.length) {
    const pire = surcharge[0];
    const qual = qualifierSemaine(a, pire.week);
    const ton = surcharge.length === 1 ? 'Une semaine reste un peu tendue' : '<b>' + surcharge.length + ' semaines</b> restent en surcharge';
    return 'Vos congés sont répartis en lissant la charge. ' + ton + ' : la semaine <b>' + pire.week + '</b>' + (qual ? ' (<b>' + qual + '</b>)' : '') + ' à ' + pire.ratio.toFixed(1) + ' h/pers. Voulez-vous examiner <b>' + M[pire.mois] + '</b> en premier ?';
  }

  // État 2 : tout va bien.
  const minR = Math.min(...ratios.filter((r) => r.hs >= 0.5).map((r) => r.ratio).concat([0]));
  const maxR = Math.max(...ratios.map((r) => r.ratio).concat([0]));
  return 'Vos congés sont répartis, la charge est lissée. Vos équipes présentes font entre <b>' + minR.toFixed(1) + '</b> et <b>' + maxR.toFixed(1) + ' h supplémentaires par personne</b>, sans pic. Votre socle de semaines standard est équilibré — votre année de présence est saine.';
}
