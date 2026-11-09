import { describe, it, expect } from 'vitest';
import { agency, baseH, partRoulant } from './calculations.js';
import { teamInsight } from './teamInsight.js';

// Signalement nov. 2026 : la clé roulant / non-roulant ne s'appliquait pas aux ETP, et un salarié saisi
// à 0 % comptait comme roulant à 100 % (« +e.pctRoulant||100 ») : passer de 0 à 30 % faisait BAISSER les heures.
const equipe = (pct) => { const a = agency('NANTES'); a.employees = [
  { name: 'A', qual: 'DEA', hours: 35, pctRoulant: 100 },
  { name: 'B', qual: 'AA', hours: 35, pctRoulant: pct }
]; return a; };

describe('Part roulante (% roul.)', () => {
  it('0 % = non roulant ; vide = 100 %', () => {
    expect(partRoulant({ pctRoulant: 0 })).toBe(0);
    expect(partRoulant({ pctRoulant: '0' })).toBe(0);
    expect(partRoulant({ pctRoulant: 30 })).toBe(0.3);
    expect(partRoulant({})).toBe(1);
    expect(partRoulant({ pctRoulant: '' })).toBe(1);
    expect(partRoulant({ pctRoulant: 150 })).toBe(1);
  });
  it('les heures roulantes augmentent avec le pourcentage', () => {
    const h = [0, 30, 70, 100].map((p) => baseH(equipe(p)));
    expect(h).toEqual([35, 45.5, 59.5, 70]);
  });
  it('les ETP suivent la clé roulant / non-roulant', () => {
    expect(teamInsight(equipe(0)).etpTotal).toBe(1);
    expect(teamInsight(equipe(50)).etpTotal).toBe(1.5);
    expect(teamInsight(equipe(100)).etpTotal).toBe(2);
  });
});
