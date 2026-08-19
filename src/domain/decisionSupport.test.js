import { describe, it, expect } from 'vitest';
import { budgetDecisionSupport } from './decisionSupport.js';

describe('budgetDecisionSupport', () => {
  it('agrège le CA depuis le calendrier et compte l’effectif', () => {
    const s = budgetDecisionSupport({
      cal: [{ total: 1000 }, { total: 2000 }],
      employees: [{ qual: 'DEA', hours: 35, pctRoulant: 100 }, { qual: 'FACTURIERE', hours: 35 }],
      targetTXR: 250, costHour: 28
    });
    expect(s.caBudget).toBe(3000);
    expect(s.nbSal).toBe(1);       // FACTURIERE exclu
    expect(s.nbRoulants).toBe(1);
  });

  it('signale une hausse de CA sans embauche', () => {
    const s = budgetDecisionSupport({
      cal: [{ total: 120000 }],
      histCA: 100000,
      employees: [{ qual: 'DEA', hours: 35, pctRoulant: 100 }],
      targetTXR: 250, costHour: 28
    });
    expect(s.evoCA).toBe(20);
    expect(s.alertes.some((a) => a.includes('sans embauche'))).toBe(true);
  });

  it('alerte quand le coût horaire ou le TXR manque', () => {
    const s = budgetDecisionSupport({ cal: [{ total: 5000 }], employees: [] });
    expect(s.alertes).toContain('Coût horaire manquant');
    expect(s.alertes).toContain('TXR non renseigné');
  });
});
