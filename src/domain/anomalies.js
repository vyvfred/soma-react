// Centre d'attention — port fidèle de collectAnomalies : les points du budget ouvert
// qui demandent l'attention du REX ou du CG, chacun relié à l'écran où agir.
import { ann, isRoulant, baseH, hsRows, cpGeneres, cpPlanifies, refAgenceSeuils, M } from './calculations.js';
import { euro, pct } from './format.js';

export function collecterAnomalies(a) {
  const out = [];
  if (!a) return out;
  const ca = ann(a, "Chiffre d'affaires");
  const caObj = +a.targetCA || 0;
  const txr = +a.targetTXR || 0;
  const net = ann(a, 'RESULTAT NET');
  const ms = ann(a, 'Charges de personnel');
  const tauxMS = ca ? (ms / ca) * 100 : 0;
  const nbRoulants = (a.employees || []).filter((e) => isRoulant(e.qual)).length;

  if (!caObj || !txr) out.push({ panel: 'objectif', level: 'todo', text: 'Objectif de CA ou TXR non renseigné' });
  if (nbRoulants === 0) out.push({ panel: 'team', level: 'todo', text: 'Aucun salarié roulant dans l\'équipe' });
  if (caObj && txr && nbRoulants > 0) {
    const remplis = (a.sick || []).filter((v) => v !== null && v !== undefined);
    const malMoy = remplis.reduce((s, v) => s + (+v || 0), 0) / (remplis.length || 12);
    const caMaxSansHS = Math.round(baseH(a) * (1 - malMoy / 100) * txr * 52);
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
    if (Math.abs(rest) > (refAgenceSeuils(a).toleranceCP || 3)) out.push({ panel: 'rh', level: 'warn', text: Math.abs(rest).toFixed(0) + ' jours de congés ' + (rest > 0 ? 'à placer' : 'en excès') });
  }
  if (ca > 0) {
    if (net < 0) out.push({ panel: 'previsionnel', level: 'warn', text: 'Budget déficitaire (' + euro(net) + ')' });
    if (tauxMS > 85) out.push({ panel: 'previsionnel', level: 'warn', text: 'Masse salariale élevée (' + pct(tauxMS) + ' du CA)' });
  }
  return out;
}
