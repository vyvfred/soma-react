import { annuel, montant, resultatMemo } from './memoSIG.js';
// Centre d'attention — port fidèle de collectAnomalies : les points du budget ouvert
// qui demandent l'attention du REX ou du CG, chacun relié à l'écran où agir.
import { isRoulant, baseH, hsRows, cpGeneres, cpPlanifies, refAgenceSeuils, M, vueExploitation, heuresDispoAnnuelles, avecCacheMoteur, SEUIL_MS_CA } from './calculations.js';
import { euro, pct } from './format.js';
import { contexteRedige } from './contexte.js';

export function collecterAnomalies(a, role) {
  return avecCacheMoteur(() => collecterAnomaliesCalc(a, role));
}
function collecterAnomaliesCalc(a, role) {
  const out = [];
  if (!a) return out;
  const ca = annuel(a, "Chiffre d'affaires");
  const caObj = +a.targetCA || 0;
  const txr = +a.targetTXR || 0;
  const net = resultatMemo(a, role).val;
  const ms = annuel(a, 'Charges de personnel');
  const tauxMS = ca ? (ms / ca) * 100 : 0;
  const nbRoulants = (a.employees || []).filter((e) => isRoulant(e.qual)).length;

  if (!contexteRedige(a)) out.push({ panel: 'objectif', level: 'todo', text: 'Perspectives & contexte 2027 à rédiger (obligatoire, avant l\'objectif)' });
  if (!caObj || !txr) out.push({ panel: 'objectif', level: 'todo', text: 'Objectif de CA ou TXR non renseigné' });
  if (nbRoulants === 0) out.push({ panel: 'team', level: 'todo', text: 'Aucun salarié roulant dans l\'équipe' });
  if (caObj && txr && nbRoulants > 0) {
    const caMaxSansHS = Math.round(heuresDispoAnnuelles(a) * txr);
    const tauxCharge = caMaxSansHS ? Math.round((caObj / caMaxSansHS) * 100) : 0;
    if (tauxCharge > 115) out.push({ panel: 'objectif', level: 'warn', text: 'Objectif supérieur à la capacité de l\'effectif (' + tauxCharge + ' %)' });
  }
  if (nbRoulants > 0) {
    const critiques = hsRows(a).filter((r) => r.t === 'critique');
    if (critiques.length) {
      const mm = a.cal.find((d) => d.week === critiques[0].week);
      out.push({ panel: 'rh', level: 'warn', text: critiques.length + ' semaine' + (critiques.length > 1 ? 's' : '') + ' en tension' + (mm ? ' (dès ' + M[mm.month] + ')' : ''), month: mm ? mm.month : null });
    }
    const rest = cpGeneres(a) - cpPlanifies(a);
    if (Math.abs(rest) > (refAgenceSeuils(a).toleranceCP || 3)) out.push({ panel: 'rh', level: 'warn', text: Math.abs(rest).toFixed(0) + ' jours de congés ' + (rest > 0 ? 'encore à poser' : 'posés en trop (absentéisme modifié ?)') });
  }
  if (ca > 0) {
    if (net < 0) out.push({ panel: 'previsionnel', level: 'warn', text: (vueExploitation(a, role) ? 'Résultat d\'exploitation déficitaire (' : 'Budget déficitaire (') + euro(net) + ')' });
    if (tauxMS > SEUIL_MS_CA) out.push({ panel: 'previsionnel', level: 'warn', text: 'Masse salariale au-dessus du seuil de ' + SEUIL_MS_CA + ' % (' + pct(tauxMS) + ' du CA)' });
  }
  return out;
}
