// Préparation des données des graphiques réseau — pur, extrait de renderGraphiques().
const ROULANTS = ['DEA', 'AA', 'TAXI', 'TPMR'];

export function computeGraphiquesRows(map, ops) {
  return ops.map((ag) => {
    const d = map[ag.nom] || {};
    const ca2025 = +d.histCA2025 || 0;
    const ca2026 = +d.histCA || 0;
    const caB2027 = d.cal && d.cal.length ? d.cal.reduce((s, day) => s + (day.total || 0), 0) : 0;
    const txr = +d.histTXR2026 || +d.targetTXR || 0;
    const baseHebdo = d.employees
      ? d.employees.filter((e) => ROULANTS.includes(e.qual)).reduce((s, e) => s + (+e.hours || 0) * (+e.pctRoulant || 100) / 100, 0)
      : 0;
    const mal = +d.targetAbsRate || 8;
    const caMax = txr > 0 ? baseHebdo * (1 - mal / 100) * txr * 52 : 0;
    const txCharge = caMax > 0 ? Math.round(caB2027 / caMax * 100) : 0;
    return { nom: ag.nom, ca2025, ca2026, caB2027, txr, txCharge, hasData: !!(ca2025 || ca2026 || caB2027) };
  }).filter((r) => r.hasData);
}
