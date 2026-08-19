import { describe, it, expect } from 'vitest';
import { chargesSummary, auditAlerts } from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

describe('chargesSummary', () => {
  it('renvoie CA et charges par nature', () => {
    const a = agenceReference();
    a.targetCA = 900000; a.targetTXR = 250;
    const s = chargesSummary(a);
    expect(s).toHaveProperty('ca');
    expect(s).toHaveProperty('fixed');
    expect(s).toHaveProperty('variable');
    expect(s).toHaveProperty('payroll');
    expect(s.ca).toBeGreaterThan(0);
  });
});

describe('auditAlerts', () => {
  it('renvoie une liste d’alertes [severité, titre, détail]', () => {
    const a = agenceReference();
    a.targetCA = 900000; a.targetTXR = 250;
    const alerts = auditAlerts(a);
    expect(Array.isArray(alerts)).toBe(true);
    alerts.forEach((al) => {
      expect(al).toHaveLength(3);
      expect(typeof al[1]).toBe('string');
    });
  });
});
