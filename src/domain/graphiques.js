// Préparation des données des graphiques réseau — pur, extrait de renderGraphiques().
import { heuresDispoAnnuelles, partRoulant, estRoulantPart } from './calculations.js';
import { entiteDepuisBudget } from './consolideSIG.js';

const ROULANTS = ['DEA', 'AA', 'TAXI', 'TPMR'];
// Capacité hors HS par le moteur (maladie et congés déduits) — même calcul que l'écran de l'agence
export function capaciteHorsHS(nom, d, txr) {
  if (!(txr > 0)) return 0;
  try { const e = entiteDepuisBudget(nom, d); return e ? Math.round(heuresDispoAnnuelles(e) * txr) : 0; } catch (err) { return 0; }
}

export function computeGraphiquesRows(map, ops) {
  return ops.map((ag) => {
    const d = map[ag.nom] || {};
    const ca2025 = +d.histCA2025 || 0;
    const ca2026 = +d.histCA || 0;
    const caB2027 = d.cal && d.cal.length ? d.cal.reduce((s, day) => s + (day.total || 0), 0) : 0;
    const txr = +d.histTXR2026 || +d.targetTXR || 0;
    const baseHebdo = d.employees
      ? d.employees.filter(estRoulantPart).reduce((s, e) => s + (+e.hours || 0) *partRoulant(e), 0)
      : 0;
    const caMax = baseHebdo > 0 ? capaciteHorsHS(ag.nom, d, txr) : 0;
    const txCharge = caMax > 0 ? Math.round(caB2027 / caMax * 100) : 0;
    return { nom: ag.nom, ca2025, ca2026, caB2027, txr, txCharge, hasData: !!(ca2025 || ca2026 || caB2027) };
  }).filter((r) => r.hasData);
}
