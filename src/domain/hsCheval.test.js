import { describe, it, expect } from 'vitest';
import { hsRows, hsTot, moisDeSemaine, setAbsPartMois, coutHSTotal, payrollMonth, ann } from './calculations.js';
import { etatMois } from './presenceMois.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

function agence(ca = 2000000) { const a = agenceReference(); const base = a.employees.slice(); a.employees = []; for (let k = 0; k < 8; k++) base.forEach((e, i) => a.employees.push({ ...e, id: (e.id || i) + '-' + k })); a.targetTXR = 50; a.targetCA = ca; const c = a.cal.reduce((x, d) => x + d.total, 0); a.cal.forEach((d) => { d.total = d.total * ca / c; }); return a; }
const cheval = (a, m1, m2) => hsRows(a).find((r) => { const ms = moisDeSemaine(a, r.week); return ms.includes(m1) && ms.includes(m2); });

describe('HS des semaines à cheval sur deux mois', () => {
  it('la somme des parts fait les HS de la semaine, et les mois font le total de l\'année', () => {
    const a = agence(2600000);
    hsRows(a).forEach((r) => expect(Object.values(r.hsMois).reduce((s, v) => s + v, 0)).toBeCloseTo(r.hs, 6));
    const parMois = Array.from({ length: 12 }, (_, m) => etatMois(a, m).hsM).reduce((s, v) => s + v, 0);
    expect(parMois).toBeCloseTo(hsTot(a).hs, 4);
  });
  it('des congés posés sur la part de juin pèsent sur juin, pas sur juillet', () => {
    const a = agence(); const r0 = cheval(a, 5, 6);
    const juillet0 = r0.hsMois[6];
    setAbsPartMois(a, r0.week, 'cp', 5, 12);
    const r1 = cheval(a, 5, 6);
    expect(r1.hs).toBeGreaterThan(r0.hs);
    expect(r1.hsMois[5]).toBeGreaterThan(r0.hsMois[5]);
    expect(r1.hsMois[6]).toBeLessThanOrEqual(juillet0 + 1e-6);
  });
  it('le coût des HS et la masse salariale suivent la même répartition (total annuel inchangé)', () => {
    const a = agence(2600000);
    const parts = Array.from({ length: 12 }, (_, m) => hsRows(a).reduce((s, r) => s + (r.hsMois[m] || 0), 0));
    expect(parts.reduce((s, v) => s + v, 0)).toBeCloseTo(hsTot(a).hs, 4);
    expect(coutHSTotal(a)).toBeGreaterThan(0);
    const ms = Array.from({ length: 12 }, (_, m) => payrollMonth(a, m)).reduce((s, v) => s + v, 0);
    expect(ms).toBeCloseTo(ann(a, 'Charges de personnel'), 0);
  });
});
