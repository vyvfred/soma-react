import { baseH, isRoulant } from './calculations.js';
import { euro } from './format.js';

// KPI + interprétation de l'équipe — port fidèle de renderTeamKpis().
// Fonction PURE : renvoie les indicateurs et la phrase d'interprétation (HTML).
export function teamInsight(a) {
  const emps = a.employees || [];
  const nbSal = emps.filter((e) => e.qual !== 'FACTURIERE').length;
  const etpTotal = emps.filter((e) => isRoulant(e.qual)).reduce((s, e) => s + (+e.hours || 0) / 35, 0);
  const capaciteAn = Math.round(baseH(a) * 52);

  const caObj = +a.targetCA || 0;
  const txr = +a.targetTXR || 0;

  let phrase;
  if (nbSal === 0) {
    phrase = 'Ajoutez vos salariés ou importez votre équipe. SOMA calculera aussitôt votre capacité de production et la comparera à votre objectif.';
  } else if (caObj && txr) {
    const sickVals = (a.sick || []).filter((v) => v !== null);
    const tauxMalMoy = sickVals.reduce((s, v) => s + (+v || 0), 0) / (sickVals.length || 12);
    const dispoHebdoMoy = baseH(a) * (1 - tauxMalMoy / 100);
    const caMaxSansHS = Math.round(dispoHebdoMoy * txr * 52);
    const ecart = caMaxSansHS - caObj;
    if (caMaxSansHS >= caObj) {
      phrase = 'Votre équipe représente <b>' + etpTotal.toFixed(1) + ' ETP</b>, ce qui permet de couvrir votre objectif de <b>' + euro(caObj) + '</b> sans recourir aux heures supplémentaires.';
    } else {
      phrase = 'Votre équipe de <b>' + etpTotal.toFixed(1) + ' ETP</b> couvre l\u2019essentiel de votre objectif. Il manque environ <b>' + euro(Math.abs(ecart)) + '</b> de capacité, à combler par des heures supplémentaires ou un renfort.';
    }
  } else {
    phrase = 'Votre équipe représente <b>' + etpTotal.toFixed(1) + ' ETP</b>. Renseignez votre objectif (étape 1) pour que SOMA vérifie qu\u2019il est réalisable.';
  }

  return { nbSal, etpTotal, capaciteAn, phrase };
}
