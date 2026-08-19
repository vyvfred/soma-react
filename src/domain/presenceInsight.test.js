import { describe, it, expect } from 'vitest';
import { hsParPersonne, qualifierSemaine, coutDuChoixREX, needWeeks } from './calculations.js';
import { presenceInsight } from './presenceInsight.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

describe('fonctions d’analyse de présence', () => {
  const a = agenceReference();
  const w0 = needWeeks(a)[0].week;

  it('hsParPersonne renvoie hs / etp / ratio', () => {
    const r = hsParPersonne(a, w0);
    expect(r).toHaveProperty('hs');
    expect(r).toHaveProperty('etp');
    expect(r).toHaveProperty('ratio');
    expect(r.etp).toBeCloseTo((35 + 35 + 24) / 35, 3);
  });

  it('qualifierSemaine renvoie un libellé', () => {
    expect(typeof qualifierSemaine(a, w0)).toBe('string');
  });

  it('coutDuChoixREX : non mesurable tant qu’aucun optimum n’a été mémorisé', () => {
    expect(coutDuChoixREX(a).mesurable).toBe(false);
  });
});

describe('presenceInsight — états', () => {
  it('congés non répartis : invite à répartir', () => {
    const a = agenceReference(); // cpPlanifies = 0
    a.targetCA = 900000; a.targetTXR = 250; // objectif posé
    const txt = presenceInsight(a);
    expect(txt).toMatch(/répartir les congés/i);
  });

  it('sans objectif : renvoie null (guidage prend le relais)', () => {
    const a = agenceReference();
    a.targetCA = 0; a.targetTXR = 0;
    expect(presenceInsight(a)).toBeNull();
  });

  it('sans équipe roulante : renvoie null', () => {
    const a = agenceReference();
    a.employees = [];
    expect(presenceInsight(a)).toBeNull();
  });
});
