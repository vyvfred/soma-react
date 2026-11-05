import { describe, it, expect } from 'vitest';
import { avancementBudget } from './avancement.js';
import { agency } from './calculations.js';

describe('Avancement d\'un budget en préparation', () => {
  it('budget vide : 0 %', () => {
    const av = avancementBudget(agency('X'));
    expect(av.pct).toBe(0);
    expect(av.objectif).toBe(false);
  });
  it('cinq jalons à parts égales', () => {
    const a = agency('X');
    a.targetCA = 1000000; a.targetTXR = 90;                       // objectif : 1
    a.refs.san.forEach((mo) => { mo.semaine = 1; mo.vacances = 1; }); // références : 24/60 = 40 %
    a.employees = [{ qual: 'DEA' }];                                // équipe : 1
    a.sick = Array(12).fill(null).map((v, i) => (i < 6 ? 8 : null)); // absentéisme : 6/12
    a.moisVerrouilles = [0, 1, 2];                                  // mois validés : 3/12
    const av = avancementBudget(a);
    expect(av.refsPct).toBe(40);
    expect(av.pct).toBe(Math.round((1 + 0.4 + 1 + 0.5 + 0.25) / 5 * 100)); // 63 %
  });
  it('jours sans modification', () => {
    const av = avancementBudget(agency('X'), '2026-11-01T10:00:00Z', new Date('2026-11-09T12:00:00Z').getTime());
    expect(av.joursSansModif).toBe(8);
  });
});
