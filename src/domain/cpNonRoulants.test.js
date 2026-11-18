import { describe, it, expect } from 'vitest';
import { agency, genCal, payrollMonth, cpNRAcquis, cpNRSaisis, repartirCPNRAuto } from './calculations.js';

function base() {
  const a = agency('TEST');
  a.costHour = 28; a.targetAbsRate = 0; a.sick = Array(12).fill(0);
  a.employees = [
    { qual: 'DEA', hours: 35, contract: 'CDI' },
    { qual: 'REGULATEUR', hours: 35, contract: 'CDI', coutJour: 210 },
    { qual: 'REGULATEUR', hours: 35, contract: 'CDI', coutJour: 210, pctRoulant: 20 }
  ];
  genCal(a);
  return a;
}

describe('Congés des non-roulants (sans remplacement)', () => {
  it('acquis : 30 j ouvrables par non-roulant à temps plein, au prorata de la part non roulante', () => {
    expect(cpNRAcquis(base())).toBeCloseTo(30 + 30 * 0.8, 0);
  });
  it('l\'absentéisme réduit un peu les jours acquis (loi 2024 : 80 % du rythme pendant les arrêts)', () => {
    const a = base(); a.sick = Array(12).fill(10);
    expect(cpNRAcquis(a)).toBeCloseTo(54 * (1 - 0.1 * 0.2), 0);
  });
  it('aucun coût : les charges de personnel ne bougent pas', () => {
    const a = base();
    const avant = payrollMonth(a, 7);
    a.cpNR.jours[7] = 20;
    expect(cpNRSaisis(a)).toBe(20);
    expect(payrollMonth(a, 7)).toBe(avant);
  });
  it('répartition automatique : 60 / 20 / 20, exactement les jours acquis (à la demi-journée)', () => {
    const a = base();
    repartirCPNRAuto(a);
    const j = a.cpNR.jours, tot = cpNRAcquis(a);
    expect([5, 6, 7, 8, 9].reduce((s, m) => s + j[m], 0) / tot).toBeCloseTo(0.6, 1);
    expect(Math.abs(cpNRSaisis(a) - tot)).toBeLessThanOrEqual(0.25);
  });
  it('budget ancien sans cpNR : pas d\'erreur', () => {
    const a = base(); delete a.cpNR;
    expect(cpNRSaisis(a)).toBe(0);
    expect(repartirCPNRAuto(a).cpNR.jours).toHaveLength(12);
  });
});
