import { describe, it, expect } from 'vitest';
import { computeGraphiquesRows } from './graphiques.js';

const ops = [{ nom: 'A' }, { nom: 'B' }, { nom: 'C' }];

describe('computeGraphiquesRows', () => {
  it('ne garde que les agences avec au moins une donnée de CA', () => {
    const map = {
      A: { histCA2025: 800000, histCA: 850000, cal: [{ total: 900000 }] },
      B: { histCA: 500000 },
      C: {} // aucune donnée
    };
    const rows = computeGraphiquesRows(map, ops);
    expect(rows.map((r) => r.nom).sort()).toEqual(['A', 'B']);
  });

  it('agrège le CA 2027 depuis le calendrier', () => {
    const map = { A: { cal: [{ total: 100000 }, { total: 200000 }], histCA: 250000 } };
    const rows = computeGraphiquesRows(map, [{ nom: 'A' }]);
    expect(rows[0].caB2027).toBe(300000);
  });
});
