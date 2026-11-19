import { describe, it, expect } from 'vitest';
import { tableauCPStock, tableauHeures, tableauVariables, feuillesJustif } from './justifCalculs.js';
import { cpGeneres, cpPlanifies, hsTot, buildPeriodesPaie, genCal, CP_HEURES_JOUR } from './calculations.js';
import { detailMSMois } from './detailMS.js';
import { repartirCPAuto } from './repartitionCP.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

function agence() {
  const a = agenceReference(); a.targetCA = 900000; a.targetTXR = 40; genCal(a); a.sick = Array(12).fill(6);
  repartirCPAuto(a); a.periodesPaie = buildPeriodesPaie(); a.costHour = 30; a.tauxHoraireBrutJuin = null;
  return a;
}
describe('Détail des calculs — justification', () => {
  it('stock CP : acquis = CP générés, pris = CP posés, stock final = acquis − pris', () => {
    const a = agence(); const t = tableauCPStock(a);
    const acq = t.reduce((s, x) => s + x.acquisJ, 0), pris = t.reduce((s, x) => s + x.prisJ, 0);
    expect(acq).toBeCloseTo(cpGeneres(a), 0);
    expect(pris).toBeCloseTo(cpPlanifies(a), 0);
    expect(t[11].stockJ).toBeCloseTo(acq - pris, 6);
    expect(t[0].acquisE).toBeCloseTo(t[0].acquisJ * CP_HEURES_JOUR * 30, 6);
  });
  it('heures : HS des 12 mois = HS de l\'année ; besoin = besoin annuel', () => {
    const a = agence(); const h = tableauHeures(a), tot = hsTot(a);
    expect(h.reduce((s, x) => s + x.hs, 0)).toBeCloseTo(tot.hs, 3);
    expect(h.reduce((s, x) => s + x.besoin, 0)).toBeCloseTo(tot.need, 3);
  });
  it('variables : cohérentes avec le détail de la masse salariale ; export à 5 feuilles', () => {
    const a = agence(); const v = tableauVariables(a);
    for (let m = 0; m < 12; m++) { const d = detailMSMois(a, m); const base = ['base', 'nr', 'dr', 'cpvar'].reduce((s, k) => s + d.lignes.find((l) => l.cle === k).montant, 0); expect(v[m].total + base).toBeCloseTo(d.total, 4); }
    expect(feuillesJustif(a).map((f) => f.nom)).toEqual(['Masse salariale par mois', 'Formules', 'Variables de paie', 'Stock congés payés', 'Heures par mois']);
  });
});

describe('Stock de congés — ouverture facultative', () => {
  it('sans saisie : part de 0 ; avec saisie : stock décalé du stock d\'ouverture valorisé en janvier', () => {
    const a = agence(); const t0 = tableauCPStock(a);
    a.stockCP2026 = 120; const t1 = tableauCPStock(a);
    expect(t1[11].stockJ - t0[11].stockJ).toBeCloseTo(120, 6);
    expect(t1[0].stockE - t0[0].stockE).toBeCloseTo(120 * CP_HEURES_JOUR * 30, 6);
    expect(feuillesJustif(a)[3].lignes[1][0]).toBe('Stock au 31/12/2026');
  });
});

describe('Provision pour congés payés dans la masse salariale', () => {
  it('les mois de congés allègent la masse salariale ; sur l\'année, effet nul si posés = acquis', async () => {
    const { payrollMonth, variationStockCPMois, M, cpPlanifies, cpGeneres } = await import('./calculations.js');
    const a = agence();
    expect(cpPlanifies(a)).toBeCloseTo(cpGeneres(a), 0);
    const v = M.map((_, m) => variationStockCPMois(a, m));
    expect(Math.min(...v.slice(5, 9))).toBeLessThan(0); // juin-septembre : reprise de provision
    expect(Math.abs(v.reduce((s, x) => s + x, 0))).toBeLessThan(50);
    const juillet = payrollMonth(a, 6), fev = payrollMonth(a, 1);
    expect(juillet).toBeLessThan(fev + v[1] - v[6] + 1e6); // garde-fou : la variation est bien dans la masse salariale
    expect(payrollMonth(a, 6) - (payrollMonth(a, 6) - v[6])).toBeCloseTo(v[6], 6);
  });
});
