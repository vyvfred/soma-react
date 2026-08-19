// Consolidation réseau — logique pure extraite de renderConsolidation().
// Prend la map réseau { agence: { statut, data, updatedAt } } et les agences
// opérationnelles ; renvoie les KPI globaux, les lignes détaillées et les alertes.
// Lit les données brutes (comme l'original), sans passer par le noyau de calcul.

const ROULANTS = ['DEA', 'AA', 'TAXI', 'TPMR'];

export function computeConsolidation(map, ops) {
  const entries = Object.values(map);
  const total = ops.length;
  const budgetsCount = Object.keys(map).length;
  const deposes = entries.filter((e) => e.statut !== 'brouillon').length;
  const valides = entries.filter((e) => e.statut === 'valide_pdg').length;
  const brouillons = entries.filter((e) => e.statut === 'brouillon').length;
  const nonDeposes = total - budgetsCount;
  const enCours = entries.filter((e) => e.statut && e.statut.includes('soumis')).length;

  let caReseauTotal = 0;
  const agencesAtypiques = [];

  const rows = ops.map((ag) => {
    const b = map[ag.nom];
    if (!b) return { nom: ag.nom, zone: ag.zone, present: false };

    const d = b.data || {};
    const statut = b.statut || 'brouillon';

    const caB = d.cal && d.cal.length ? d.cal.reduce((s, day) => s + (day.total || 0), 0) : 0;

    let baseH = 0;
    if (d.employees && d.employees.length) {
      baseH = d.employees.filter((e) => ROULANTS.includes(e.qual))
        .reduce((s, e) => s + (+e.hours || 0) * (+e.pctRoulant || 100) / 100, 0);
    }
    const txr = +d.targetTXR || 0;
    const sickFilled = d.sick ? d.sick.filter((v) => v !== null) : [];
    const malMoy = sickFilled.length ? sickFilled.reduce((s, v) => s + (+v || 0), 0) / sickFilled.length : 8;
    const caMax = Math.round(baseH * (1 - malMoy / 100) * txr * 52);
    const txCharge = caMax > 0 ? Math.round(caB / caMax * 100) : 0;

    // HS annuelles (approximation, reprise verbatim de l'original).
    const hsAnn = txr > 0 ? Math.round(Math.max(0, caB - caMax * txr / txr)) : 0;

    const nbSal = d.employees ? d.employees.filter((e) => e.qual !== 'FACTURIERE').length : 0;
    const cpGen = Math.round(nbSal * 2.5 * 12 * 10) / 10;
    const cpPlan = d.presence ? Object.values(d.presence).reduce((s, p) => s + (+p.cp || 0), 0) : 0;
    const cpEcart = Math.round((cpGen - cpPlan) * 10) / 10;

    const alertes = [];
    if (!d.costHour) alertes.push({ t: 'warn', m: 'Coût horaire manquant' });
    if (txCharge > 115) alertes.push({ t: 'crit', m: 'CA > capacité max (+15%)' });
    else if (txCharge > 100) alertes.push({ t: 'warn', m: 'CA > capacité (HS requises)' });
    if (Math.abs(cpEcart) > cpGen * 0.1 && cpGen > 0) alertes.push({ t: 'warn', m: 'CP non équilibrés' });
    if (!d.targetTXR) alertes.push({ t: 'info', m: 'TXR non renseigné' });
    if (statut.includes('soumis') && alertes.length > 0) alertes.unshift({ t: 'crit', m: 'Anomalies détectées' });

    if (caB > 0) caReseauTotal += caB;
    if (txCharge > 115) agencesAtypiques.push(ag.nom);

    const dateStr = b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—';

    return { nom: ag.nom, zone: ag.zone, present: true, statut, caB, caMax, txCharge, hsAnn, cpGen, cpEcart, alertes, dateStr };
  });

  return { total, budgetsCount, deposes, valides, brouillons, nonDeposes, enCours, caReseauTotal, agencesAtypiques, rows };
}
