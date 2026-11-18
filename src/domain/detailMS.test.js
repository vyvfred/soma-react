import { describe, it, expect } from 'vitest';
import { detailMSMois, feuillesDetailMS } from './detailMS.js';
import { buildPeriodesPaie, genCal } from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';
import { repartirCPAuto } from './repartitionCP.js';

function agence(opts = {}) {
  const a = agenceReference(); a.targetCA = 900000; a.targetTXR = 40; genCal(a); repartirCPAuto(a);
  a.periodesPaie = buildPeriodesPaie(); a.costHour = 30; a.sick = Array(12).fill(6); a.ratioMaintien = 50;
  a.employees = a.employees.concat([{ qual: 'AA', contract: 'CDD', hours: 35, pctRoulant: 100, dateEntree: '2027-03-16', dateSortie: '2027-09-30' }]);
  const w = Object.keys(a.presence)[12]; a.presence[w] = { ...a.presence[w], other: 2, otherPaid: 1 };
  a.hsImproductif = { [w]: 6 }; a.repasRoulant = { [w]: 150 }; a.idjfNonRoulant = { [w]: 40 };
  Object.assign(a, opts);
  return a;
}
describe('Détail du calcul de la masse salariale mensuelle', () => {
  it('la somme des lignes est égale à la masse salariale du mois, pour les 12 mois', () => {
    for (const opts of [{}, { msNRBrutMensuel: 6800, msNRTauxCharges: 42 }, { drCostAnnual: 90000, drPct: 20, variablesDec2026: 18000 }]) {
      const a = agence(opts);
      for (let m = 0; m < 12; m++) { const d = detailMSMois(a, m); expect(d.total).toBeCloseTo(d.calcule, 4); }
    }
  });
  it('chaque ligne a une formule ; HS positives, retenues négatives', () => {
    const d = detailMSMois(agence(), 4);
    d.lignes.forEach((l) => expect(l.formule.length).toBeGreaterThan(5));
    const g = (k) => d.lignes.find((l) => l.cle === k).montant;
    expect(g('hs')).toBeGreaterThan(0); expect(g('mal')).toBeLessThan(0); expect(g('base')).toBeGreaterThan(0);
  });
  it('export : total par mois = détail, deux feuilles', () => {
    const a = agence(); const f = feuillesDetailMS(a);
    expect(f).toHaveLength(2);
    const tot = f[0].lignes[f[0].lignes.length - 1];
    expect(tot[0]).toBe('Total masse salariale');
    expect(Math.abs(tot[2] - Math.round(detailMSMois(a, 1).calcule))).toBeLessThanOrEqual(1);
  });
});
