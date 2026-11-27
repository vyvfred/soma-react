import { annuel, montant } from './memoSIG.js';
// Anomalies d'un budget soumis, signalées au CG à son ouverture — port fidèle de afficherAlertesCG.
import { msNRMensuel, isRoulant, costHourJuin, baseH, cpGeneres, cpPlanifies, heuresDispoAnnuelles, caFunAnnuel, txrEffectif } from './calculations.js';
import { euro } from './format.js';

export function alertesBudgetSoumis(a) {
  const l = [];
  if (!a) return l;
  if (!a.costHour) l.push({ t: 'warn', m: 'Coût horaire non renseigné : la masse salariale est incomplète.' });
  if (msNRMensuel(a) === null) {
    const ancien = (a.employees || []).some((e) => !isRoulant(e.qual) && (+e.coutJour || 0) > 0) || (+a.drCostAnnual || 0) > 0;
    l.push({ t: 'warn', m: ancien ? 'Ligne non roulante non saisie : calcul provisoire sur les anciens coûts journaliers et la quote-part DR.' : 'Ligne non roulante non saisie : les improductifs manquent dans la masse salariale.' });
  }
  if (a.ratioMaintien === null || a.ratioMaintien === undefined || a.ratioMaintien === '') l.push({ t: 'info', m: 'Ratio de maintien vide : les absences sont retirées à 100 %.' });
  if (a.costHour && !costHourJuin(a)) l.push({ t: 'info', m: 'Pas de taux au 1er juin : celui de janvier s\'applique toute l\'année.' });
  const base = baseH(a), txr = txrEffectif(a);
  if (base > 0 && txr > 0) {
    const caMax = Math.round(heuresDispoAnnuelles(a) * txr), caB = annuel(a, "Chiffre d'affaires") - caFunAnnuel(a); // funéraire : sans besoin d'équipage
    if (caB > caMax * 1.15) l.push({ t: 'crit', m: 'CA budgété (' + euro(caB) + ') dépasse de plus de 15 % la capacité max (' + euro(caMax) + '). Vérifier les références CA.' });
    else if (caB > caMax) l.push({ t: 'warn', m: 'Le CA budgété dépasse ce que l\'équipe peut faire sans HS. Il faudra beaucoup d\'heures supplémentaires.' });
  }
  const g = cpGeneres(a), p = cpPlanifies(a), tol = Math.max(0.5, g * 0.05);
  if (Math.abs(g - p) > tol) l.push({ t: 'warn', m: 'CP non équilibrés : ' + g.toFixed(1) + ' J générés, ' + p.toFixed(1) + ' J planifiés (écart : ' + (g - p).toFixed(1) + ' J).' });
  if (!a.targetTXR) l.push({ t: 'info', m: 'TXR cible non renseigné : le besoin d\'heures ne peut pas être calculé.' });
  return l;
}
