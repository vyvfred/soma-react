import { describe, it, expect } from 'vitest';
import { repartirCPAuto } from './repartitionCP.js';
import { cpGeneres, cpPlanifies } from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

function ready() {
  const a = agenceReference();
  a.targetCA = 900000;
  a.targetTXR = 250;
  return a;
}

describe('repartirCPAuto — répartition automatique des congés', () => {
  it('place la quasi-totalité des congés générés (reliquat proche de 0)', () => {
    const a = ready();
    const gen = cpGeneres(a);
    repartirCPAuto(a);
    expect(cpPlanifies(a)).toBeCloseTo(gen, 0);
    expect(a.cpReliquat).toBeLessThan(1);
  });

  it('respecte la règle légale des enveloppes 60 / 20 / 20', () => {
    const a = ready();
    const gen = cpGeneres(a);
    repartirCPAuto(a);
    const env = a.cpEnveloppes;
    expect(env).toHaveLength(3);
    expect(env[0].budget).toBeCloseTo(gen * 0.6, 0); // juin–octobre
    expect(env[1].budget).toBeCloseTo(gen * 0.2, 0); // nov–janvier
    expect(env[2].budget).toBeCloseTo(gen * 0.2, 0); // février–mai
  });

  it('mémorise la répartition optimale comme référence', () => {
    const a = ready();
    repartirCPAuto(a);
    expect(a.cpOptimal).toBeTruthy();
    expect(typeof a.cpOptimalHSCost).toBe('number');
  });

  it('est idempotent : relancer ne change pas le total planifié', () => {
    const a = ready();
    repartirCPAuto(a);
    const p1 = cpPlanifies(a);
    repartirCPAuto(a);
    expect(cpPlanifies(a)).toBeCloseTo(p1, 1);
  });
});
