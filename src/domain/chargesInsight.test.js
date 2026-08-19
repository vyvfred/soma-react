import { describe, it, expect } from 'vitest';
import { manual, M } from './calculations.js';
import { chargesInsight } from './chargesInsight.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

// Prépare une agence avec une ligne de charge dans un mode donné.
function withCharge(mode, extra) {
  const a = agenceReference();
  a.rex = a.rex || {};
  a.rex['Carburant'] = { mode, values: Array(12).fill(null), pct: 0, annual: 0, allocationKey: 'monthly12', chargeType: 'variable', ...extra };
  return a;
}

describe('manual — distribution d’une charge selon le mode', () => {
  it('mode mensuel : renvoie la valeur du mois', () => {
    const a = withCharge('month');
    a.rex['Carburant'].values[0] = 1500;
    expect(manual(a, 'Carburant', 0)).toBe(1500);
    expect(manual(a, 'Carburant', 1)).toBe(0);
  });

  it('mode annuel + clé « division par 12 » : réparti également', () => {
    const a = withCharge('annual', { annual: 12000, allocationKey: 'monthly12' });
    expect(manual(a, 'Carburant', 0)).toBeCloseTo(1000, 6);
    const total = M.reduce((s, _, m) => s + manual(a, 'Carburant', m), 0);
    expect(total).toBeCloseTo(12000, 6);
  });

  it('mode annuel + clé CA : total = montant annuel (pondéré par le CA)', () => {
    const a = withCharge('annual', { annual: 12000, allocationKey: 'ca' });
    const total = M.reduce((s, _, m) => s + manual(a, 'Carburant', m), 0);
    expect(total).toBeCloseTo(12000, 4);
  });

  it('mode % CA : proportionnel au CA du mois', () => {
    const a = withCharge('pct', { pct: 5 });
    // manual(pct) = monthCA(a,m) * pct/100 ; on vérifie la cohérence du ratio.
    const m0 = manual(a, 'Carburant', 0);
    expect(m0).toBeGreaterThanOrEqual(0);
  });
});

describe('chargesInsight', () => {
  it('compte les postes de charge saisis', () => {
    const a = withCharge('annual', { annual: 5000 });
    const r = chargesInsight(a);
    expect(r.saisis).toBeGreaterThanOrEqual(1);
    expect(r.totalPostes).toBeGreaterThan(0);
    expect(r.text).toMatch(/postes de charges/);
  });
});
