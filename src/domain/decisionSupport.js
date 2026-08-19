// Aide à la décision pour la validation — logique pure extraite de renderValidation().
// Prend les données affichées d'un budget (version active) et renvoie les indicateurs
// de synthèse + les alertes qui aident un validateur à décider.

const ROULANTS = ['DEA', 'AA', 'TAXI', 'TPMR'];

export function budgetDecisionSupport(d) {
  d = d || {};
  const caBudget = d.cal && d.cal.length ? d.cal.reduce((s, day) => s + (day.total || 0), 0) : 0;
  const nbSal = d.employees ? d.employees.filter((e) => e.qual !== 'FACTURIERE').length : 0;
  const nbRoulants = d.employees ? d.employees.filter((e) => ROULANTS.includes(e.qual)).length : 0;
  const coutHoraire = d.costHour || 0;
  const txr = d.targetTXR || d.histTXR2026 || 0;
  const ca2026 = +d.histCA || 0;
  const evoCA = (ca2026 > 0 && caBudget > 0) ? Math.round((caBudget - ca2026) / ca2026 * 1000) / 10 : null;
  const hasMovements = d.employees ? d.employees.some((e) => e.dateEntree || e.dateSortie) : false;

  const baseHebdo = d.employees
    ? d.employees.filter((e) => ROULANTS.includes(e.qual)).reduce((s, e) => s + (+e.hours || 0) * (+e.pctRoulant || 100) / 100, 0)
    : 0;
  const sickFilled = d.sick ? d.sick.filter((v) => v !== null) : [];
  const malMoy = sickFilled.length ? sickFilled.reduce((s, v) => s + (+v || 0), 0) / sickFilled.length : 8;
  const caMax = txr > 0 ? Math.round(baseHebdo * (1 - malMoy / 100) * txr * 52) : 0;
  const txCharge = caMax > 0 ? Math.round(caBudget / caMax * 100) : 0;

  const alertes = [];
  if (!coutHoraire) alertes.push('Coût horaire manquant');
  if (txCharge > 115) alertes.push('CA > capacité (+15%)');
  if (!txr) alertes.push('TXR non renseigné');
  if (evoCA !== null && evoCA > 10 && !hasMovements) alertes.push('CA +' + evoCA + '% sans embauche prévue');
  if (evoCA !== null && evoCA < -10) alertes.push('CA en baisse de ' + Math.abs(evoCA) + '%');

  return { caBudget, ca2026, evoCA, nbSal, nbRoulants, coutHoraire, txr, hasMovements, txCharge, alertes };
}
