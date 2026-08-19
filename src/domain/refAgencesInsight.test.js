import { describe, it, expect } from 'vitest';
import { refAgencesInsight } from './refAgencesInsight.js';

const ops = [{ nom: 'A' }, { nom: 'B' }, { nom: 'C' }];

describe('refAgencesInsight', () => {
  it('compte les agences avec données de référence', () => {
    const map = { A: { histTXR2026: 40 }, B: { costHour: 28 }, C: {} };
    const r = refAgencesInsight(map, ops);
    expect(r.avecRef).toBe(2);
    expect(r.sansRef).toEqual(['C']);
    expect(r.kpis[1].value).toBe('2/3');
  });

  it('message complet quand tout est renseigné', () => {
    const map = { A: { histTXR2026: 40 }, B: { histTXR2026: 41 }, C: { tauxHoraireBrut: 20 } };
    const r = refAgencesInsight(map, ops);
    expect(r.sansRef).toHaveLength(0);
    expect(r.text).toMatch(/Toutes les agences/);
  });
});
