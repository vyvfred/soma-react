import { describe, it, expect } from 'vitest';
import { computeConsolidation } from './consolidation.js';

const ops = [
  { nom: 'A', zone: 'A' },
  { nom: 'B', zone: 'A' },
  { nom: 'C', zone: 'B' }
];

const map = {
  A: { statut: 'valide_pdg', updatedAt: '2026-03-01', data: { cal: [{ total: 1000 }, { total: 2000 }], employees: [{ qual: 'DEA', hours: 35, pctRoulant: 100 }], targetTXR: 250, sick: [5, 5, 5, null, null, null, null, null, null, null, null, null], costHour: 28, presence: {} } },
  B: { statut: 'soumis_dr', updatedAt: '2026-03-02', data: { targetTXR: 250 } }
  // C : pas de budget → non commencé
};

describe('computeConsolidation', () => {
  it('compte les statuts réseau', () => {
    const c = computeConsolidation(map, ops);
    expect(c.total).toBe(3);
    expect(c.budgetsCount).toBe(2);
    expect(c.valides).toBe(1);       // A
    expect(c.enCours).toBe(1);       // B (soumis_dr)
    expect(c.nonDeposes).toBe(1);    // C
    expect(c.deposes).toBe(2);       // A + B (non brouillon)
  });

  it('agrège le CA réseau à partir des calendriers', () => {
    const c = computeConsolidation(map, ops);
    expect(c.caReseauTotal).toBe(3000); // 1000 + 2000 de A
  });

  it('marque les agences sans budget comme non présentes', () => {
    const c = computeConsolidation(map, ops);
    expect(c.rows.find((r) => r.nom === 'C').present).toBe(false);
  });

  it('lève une alerte quand une donnée clé manque', () => {
    const c = computeConsolidation(map, ops);
    const b = c.rows.find((r) => r.nom === 'B');
    // B n'a ni coût horaire ni calendrier → alertes présentes
    expect(b.alertes.some((a) => a.m.includes('Coût horaire'))).toBe(true);
  });
});
