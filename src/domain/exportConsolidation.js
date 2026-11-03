// Export Excel de la consolidation réseau — port fidèle d'exportConsolidation.
// Fonction PURE : renvoie les feuilles (tableaux de lignes) ; l'écriture du fichier est dans lib/.
import { statutLabel } from '../config/statut.js';

const ROULANTS = ['DEA', 'AA', 'TAXI', 'TPMR'];
const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

function indicateurs(d) {
  let baseHebdo = 0, etp = 0, nbRoulants = 0;
  (d.employees || []).filter((e) => ROULANTS.includes(e.qual)).forEach((e) => {
    const h = ((+e.hours || 0) * (+e.pctRoulant || 100)) / 100;
    baseHebdo += h; etp += h / 35; nbRoulants++;
  });
  etp = Math.round(etp * 100) / 100;
  const caB = d.cal && d.cal.length ? d.cal.reduce((s, day) => s + (day.total || 0), 0) : 0;
  const txr = +d.histTXR2026 || +d.targetTXR || 0;
  const mal = +d.targetAbsRate || 8;
  const caMax = txr > 0 ? Math.round(baseHebdo * (1 - mal / 100) * txr * 52) : 0;
  const txCharge = caMax > 0 ? Math.round((caB / caMax) * 100) : 0;
  const hs = txr > 0 ? Math.round(Math.max(0, caB / txr - baseHebdo * (1 - mal / 100) * 52)) : 0;
  const nbSal = d.employees ? d.employees.filter((e) => e.qual !== 'FACTURIERE').length : 0;
  const cpGen = Math.round(nbSal * 2.5 * 12 * 10) / 10;
  const cpPlan = d.presence ? Math.round(Object.values(d.presence).reduce((s, p) => s + (+(p && p.cp) || 0), 0) * 10) / 10 : 0;
  const tauxHS = caMax > 0 ? Math.round(Math.max(0, ((caB - caMax) / caMax) * 100)) : null;
  return { baseHebdo, etp, nbRoulants, caB, caMax, txCharge, hs, cpGen, cpPlan, tauxHS };
}

// map : { agence: { statut, data, updatedAt } } (cf. loadNetworkBudgets)
export function feuillesConsolidation(map, ops) {
  const conso = [[
    'Agence', 'Zone', 'Statut', 'Mis à jour', 'CA 2025', 'CA 2026', 'TXR 2026 (€/h)',
    'Absentéisme cible %', 'Taux brut (€/h)', 'Charges pat. %', 'Coût horaire (€/h)',
    'CA budgété', 'Capacité max', 'Taux charge %', 'HS estimées (h)', 'ETP roulant',
    'CP générés (J)', 'CP planifiés (J)', 'Nbre salariés roulants'
  ]];
  const statuts = [['Agence', 'Zone', 'Statut', 'Date dépôt']];
  const comp = [['Agence', 'Zone', 'TXR 2026 (€/h)', 'Absentéisme %', 'Coût horaire (€/h)', 'ETP roulant', 'Taux HS/CA %']];
  ops.forEach((ag) => {
    const b = map[ag.nom];
    const d = (b && b.data) || {};
    const st = b ? statutLabel(b.statut) : 'Non commencé';
    const date = b ? dateFr(b.updatedAt) : '—';
    const i = indicateurs(d);
    conso.push([ag.nom, ag.zone, st, date, d.histCA2025 || '', d.histCA || '', d.histTXR2026 || '',
      d.targetAbsRate || '', d.tauxHoraireBrut || '', d.tauxChargePatronal || '', d.costHour || '',
      i.caB || '', i.caMax || '', i.txCharge || '', i.hs || '', i.etp || '', i.cpGen || '', i.cpPlan || '', i.nbRoulants || '']);
    statuts.push([ag.nom, ag.zone, st, date]);
    comp.push([ag.nom, ag.zone, d.histTXR2026 || '', d.targetAbsRate || '', d.costHour || '', i.etp || '', i.tauxHS !== null ? i.tauxHS : '']);
  });
  return [
    { nom: 'Consolidation', lignes: conso, largeurs: [26, 6, 18, 12, 14, 14, 12, 14, 12, 12, 14, 14, 14, 12, 14, 10, 12, 12, 14] },
    { nom: 'Statuts', lignes: statuts, largeurs: [26, 6, 22, 12] },
    { nom: 'Indicateurs', lignes: comp, largeurs: [26, 6, 14, 14, 16, 12, 12] }
  ];
}

export function nomFichierConsolidation(date = new Date()) {
  return 'SOMA_Consolidation_' + date.toLocaleDateString('fr-FR').replace(/\//g, '-') + '.xlsx';
}
