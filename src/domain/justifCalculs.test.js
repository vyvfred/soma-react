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
    for (let m = 0; m < 12; m++) { const d = detailMSMois(a, m); const base = d.lignes.find((l) => l.cle === 'base').montant + d.lignes.find((l) => l.cle === 'nr').montant + d.lignes.find((l) => l.cle === 'dr').montant; expect(v[m].total + base).toBeCloseTo(d.total, 4); }
    expect(feuillesJustif(a).map((f) => f.nom)).toEqual(['Masse salariale par mois', 'Formules', 'Variables de paie', 'Stock congés payés', 'Heures par mois']);
  });
});
