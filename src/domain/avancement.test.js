import { describe, it, expect } from 'vitest';
import { avancementBudget } from './avancement.js';
import { agency } from './calculations.js';

describe('Avancement d\'un budget en préparation', () => {
  it('budget vide : 0 %', () => {
    const av = avancementBudget(agency('X'));
    expect(av.pct).toBe(0);
    expect(av.objectif).toBe(false);
  });
  it('six jalons à parts égales', () => {
    const a = agency('X');
    a.targetCA = 1000000; a.targetTXR = 90; a.perspectives = 'Renouvellement du contrat EHPAD en janvier, recrutement d un saisonnier en juillet.'; // objectif : 1
    a.refs.san.forEach((mo) => { mo.semaine = 1; mo.vacances = 1; }); // références : 24/60 = 40 %
    a.employees = [{ qual: 'DEA' }];                                // équipe : 1
    a.sick = Array(12).fill(null).map((v, i) => (i < 6 ? 8 : null)); // absentéisme : 6/12
    a.moisVerrouilles = [0, 1, 2];                                  // mois validés : 3/12
    a.rex.Carburant = { ...a.rex.Carburant, mode: 'pctMois', pcts: Array(12).fill(5), saisieREX: true };
    a.rex['Sous traitance'] = { ...a.rex['Sous traitance'], mode: 'month', values: Array(12).fill(800), saisieREX: true }; // charges REX : 2/6
    a.rex['Matériels ambulances'] = { ...a.rex['Matériels ambulances'], mode: 'pctMois', pcts: Array(12).fill(2) };       // valeur CG, pas travaillée par le REX
    const av = avancementBudget(a);
    expect(av.refsPct).toBe(40);
    expect(av.chargesREX).toBe(2);
    expect(av.pct).toBe(Math.round((1 + 0.4 + 1 + 0.5 + 0.25 + 2 / 6) / 6 * 100)); // 58 %
  });
  it('jours sans modification', () => {
    const av = avancementBudget(agency('X'), '2026-11-01T10:00:00Z', new Date('2026-11-09T12:00:00Z').getTime());
    expect(av.joursSansModif).toBe(8);
  });
});

describe('Perspectives & contexte 2027 obligatoires', () => {
  it('sans contexte rédigé, le jalon objectif n\'est pas atteint', async () => {
    const { contexteRedige } = await import('./contexte.js');
    const a = agency('X'); a.targetCA = 1000000; a.targetTXR = 90;
    expect(avancementBudget(a).objectif).toBe(false);
    a.perspectives = 'Trop court';
    expect(contexteRedige(a)).toBe(false);
    a.perspectives = 'Renouvellement du contrat EHPAD en janvier, recrutement d un saisonnier en juillet, tarifs stables.';
    expect(contexteRedige(a)).toBe(true);
    expect(avancementBudget(a).objectif).toBe(true);
  });
});
