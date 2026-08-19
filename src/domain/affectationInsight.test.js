import { describe, it, expect } from 'vitest';
import { affectationInsight } from './affectationInsight.js';

const ops = [{ nom: 'A' }, { nom: 'B' }, { nom: 'C' }];
const drs = [{ id: 'd1', nom: 'DR Un', region_id: 'r1' }, { id: 'd2', nom: 'DR Deux', region_id: 'r2' }];

describe('affectationInsight', () => {
  it('compte les agences affectées via leur région', () => {
    const agMap = { A: 'r1', B: 'r2', C: null };
    const r = affectationInsight(ops, agMap, drs);
    expect(r.affectees.map((a) => a.nom).sort()).toEqual(['A', 'B']);
    expect(r.sansDR.map((a) => a.nom)).toEqual(['C']);
    expect(r.kpis[1].value).toBe('2/3');
  });

  it('message complet quand tout est affecté', () => {
    const agMap = { A: 'r1', B: 'r2', C: 'r1' };
    const r = affectationInsight(ops, agMap, drs);
    expect(r.sansDR).toHaveLength(0);
    expect(r.text).toMatch(/Toutes les agences/);
  });

  it('signale l’absence de DR', () => {
    const r = affectationInsight(ops, {}, []);
    expect(r.text).toMatch(/Aucun directeur régional/);
  });
});
