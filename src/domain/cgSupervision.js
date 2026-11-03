// Tableau de bord CG — vue « Supervision » (port fidèle de renderCgDashSuperv).
import { euro } from './format.js';

export const STATUT_LABELS = {
  brouillon: 'Brouillon', '—': 'Non commencé', soumis_dr: 'Soumis DR', soumis_df: 'Soumis DF',
  soumis_dg: 'Soumis DG', soumis_pdg: 'Soumis PDG', valide_pdg: 'Validé',
  refuse_dr: 'Refusé DR', refuse_df: 'Refusé DF', refuse_dg: 'Refusé DG', complement_dr: 'Complément DR', complement_df: 'Complément DF'
};

export function supervisionReseau(ops, map) {
  const total = ops.length;
  let soumis = 0, valides = 0, caTotal = 0;
  const rows = ops.map((ag) => {
    const e = map[ag.nom];
    if (!e) return { nom: ag.nom, statut: '—', ca: 0 };
    const d = e.data || {};
    const st = e.statut || 'brouillon';
    if (st !== 'brouillon') soumis++;
    if (st === 'valide_pdg') valides++;
    const ca = d.cal && d.cal.length ? d.cal.reduce((s, day) => s + (day.total || 0), 0) : 0;
    caTotal += ca;
    return { nom: ag.nom, statut: st, ca };
  });
  const cas = rows.map((r) => r.ca).filter((v) => v > 0).sort((x, y) => x - y);
  const medCA = cas.length ? cas[Math.floor(cas.length / 2)] : 0;
  const anomalies = [];
  rows.forEach((r) => {
    if (r.ca <= 0 || medCA <= 0) return;
    const ecart = ((r.ca - medCA) / medCA) * 100;
    if (Math.abs(ecart) > 40) anomalies.push({ nom: r.nom, text: 'CA ' + (ecart > 0 ? 'très supérieur' : 'très inférieur') + ' à la médiane réseau (' + (ecart > 0 ? '+' : '') + Math.round(ecart) + ' %)' });
  });
  const nonSoumis = rows.filter((r) => r.statut === 'brouillon' || r.statut === '—');
  const actives = rows.filter((r) => r.ca > 0).length;

  let insight = '<b>' + soumis + ' agence' + (soumis > 1 ? 's' : '') + ' sur ' + total + '</b> ont soumis leur budget. ';
  if (anomalies.length) insight += '<b>' + anomalies.length + '</b> présente' + (anomalies.length > 1 ? 'nt' : '') + ' un CA atypique par rapport à la médiane réseau. ';
  if (nonSoumis.length) insight += '<b>' + nonSoumis.length + '</b> agence' + (nonSoumis.length > 1 ? 's' : '') + ' n\'ont pas encore soumis. ';
  insight += 'CA réseau consolidé : <b>' + euro(caTotal) + '</b>.';

  return {
    kpis: [
      { label: 'Soumis', value: soumis + '/' + total, note: soumis < total ? 'en cours' : '✓ tous soumis' },
      { label: 'Validés', value: valides + '/' + total, note: '' },
      { label: 'CA réseau', value: euro(caTotal), note: 'budgété' },
      { label: 'Agences actives', value: actives + '/' + total, note: 'avec budget' }
    ],
    insight, anomalies, nonSoumis: nonSoumis.slice(0, 5), rows, medCA, caTotal
  };
}
