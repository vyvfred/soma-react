import { describe, it, expect } from 'vitest';
import { hsRows, coutHSTotal, coefHSMois, coefHSMoyen, part50Semaine, partHS50Annuelle, tauxHS50Mois, payrollMonth, ann, avecCacheMoteur } from './calculations.js';
import { moyenneHS50 } from './presenceMois.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

function agence(ca = 2000000) { const a = agenceReference(); const base = a.employees.slice(); a.employees = []; for (let k = 0; k < 8; k++) base.forEach((e, i) => a.employees.push({ ...e, id: (e.id || i) + '-' + k })); a.targetTXR = 50; a.targetCA = ca; const c = a.cal.reduce((x, d) => x + d.total, 0); a.cal.forEach((d) => { d.total = d.total * ca / c; }); return a; }

describe('Part des HS à +50 % calculée (règle des 8 h par salarié et par semaine)', () => {
  it('semaine : 8 h par ETP présent à +25 %, le reste à +50 %', () => {
    expect(part50Semaine({ hs: 0, av: 350 })).toBe(0);
    expect(part50Semaine({ hs: 80, av: 350 })).toBe(0);          // 10 ETP × 8 h = 80 h à +25 %
    expect(part50Semaine({ hs: 100, av: 350 })).toBeCloseTo(0.2, 9); // 20 h au-delà
    expect(part50Semaine({ hs: 100, av: 350 }, 160)).toBeCloseTo(0.5, 9);
  });
  it('mode auto par défaut ; le mode manuel reprend la saisie de l\'agence', () => {
    const a = agence(3200000);
    a.hs50 = Array(12).fill(0);
    const auto = coutHSTotal(a);
    const hs50Sem = hsRows(a).filter((r) => part50Semaine(r) > 0);
    expect(hs50Sem.length).toBeGreaterThan(0);
    expect(partHS50Annuelle(a)).toBeGreaterThan(0);
    a.hs50Mode = 'manuel';
    expect(coutHSTotal(a)).toBeLessThan(auto); // saisie à 0 % : tout à +25 %
    expect(moyenneHS50(a)).toBe(0);
  });
  it('coût total = Σ semaines × coefficient de la semaine ; coefficients bornés', () => {
    const a = agence(3200000);
    avecCacheMoteur(() => {
      for (let m = 0; m < 12; m++) { const c = coefHSMois(a, m); expect(c).toBeGreaterThanOrEqual(1.25); expect(c).toBeLessThanOrEqual(1.5); expect(c).toBeCloseTo(1.25 + 0.25 * tauxHS50Mois(a, m), 9); }
      const k = coefHSMoyen(a); expect(k).toBeGreaterThanOrEqual(1.25); expect(k).toBeLessThanOrEqual(1.5);
      expect(k).toBeCloseTo(1.25 + 0.25 * partHS50Annuelle(a), 9);
    });
  });
  it('la masse salariale mensuelle reste cohérente avec l\'annuel', () => {
    const a = agence(3200000);
    const ms = Array.from({ length: 12 }, (_, m) => payrollMonth(a, m)).reduce((s, v) => s + v, 0);
    expect(ms).toBeCloseTo(ann(a, 'Charges de personnel'), 0);
  });
});
