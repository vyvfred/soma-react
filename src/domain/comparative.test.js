import { describe, it, expect } from 'vitest';
import { computeComparative } from './comparative.js';

const ops = [
  { nom: 'A', zone: 'A' },
  { nom: 'B', zone: 'A' },
  { nom: 'C', zone: 'B' },
  { nom: 'D', zone: 'A' }
];

// Trois agences avec données, une sans.
const map = {
  A: { statut: 'brouillon', data: { histTXR2026: 40, targetAbsRate: 6, costHour: 28 } },
  B: { statut: 'soumis_dr', data: { histTXR2026: 42, targetAbsRate: 6, costHour: 29 } },
  C: { statut: 'brouillon', data: { histTXR2026: 30, targetAbsRate: 9, costHour: 35 } }, // atypique
  D: { statut: 'brouillon', data: {} } // pas de données
};

describe('computeComparative', () => {
  it('ne retient que les agences avec données pour les médianes', () => {
    const { rows, withData } = computeComparative(map, ops);
    expect(rows).toHaveLength(4);
    expect(withData.map((r) => r.nom).sort()).toEqual(['A', 'B', 'C']);
  });

  it('calcule les médianes réseau', () => {
    const { medians } = computeComparative(map, ops);
    expect(medians.txr).toBe(40); // médiane de [30,40,42]
    expect(medians.ch).toBe(29);  // médiane de [28,29,35]
  });

  it('repère l’agence atypique (TXR faible, absentéisme et coût élevés)', () => {
    const { atypiques } = computeComparative(map, ops);
    const names = atypiques.map((a) => a.nom);
    expect(names).toContain('C');
    const c = atypiques.find((a) => a.nom === 'C');
    expect(c.signaux.length).toBeGreaterThan(0);
  });

  it('conserve le statut de chaque agence', () => {
    const { rows } = computeComparative(map, ops);
    expect(rows.find((r) => r.nom === 'B').statut).toBe('soumis_dr');
  });
});
