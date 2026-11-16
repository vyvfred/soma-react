import { describe, it, expect } from 'vitest';
import { agency, genCal, payrollMonth, cpNRAcquis, cpNRSaisis, repartirCPNRAuto, coutRemplacementCPNRMois, coutRemplacementCPNR, coutHoraireImproductif, coefHSMois } from './calculations.js';

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

describe('Congés des non-roulants', () => {
  it('acquis : 25 j par non-roulant à temps plein, au prorata de la part non roulante', () => {
    const a = base();
    const r = a.employees[2]; const part = r.pctRoulant !== undefined ? 1 - r.pctRoulant / 100 : 1;
    expect(cpNRAcquis(a)).toBeCloseTo(25 + 25 * part, 0);
  });
  it('agence neuve : aucun coût tant que rien n\'est saisi', () => {
    const a = base();
    expect(cpNRSaisis(a)).toBe(0);
    expect(coutRemplacementCPNR(a)).toBe(0);
  });
  it('remplacement en HS : 7 h × coût horaire improductif × majoration du mois', () => {
    const a = base();
    const avant = payrollMonth(a, 7);
    a.cpNR.jours[7] = 10;
    const attendu = 10 * 7 * coutHoraireImproductif(a) * coefHSMois(a, 7);
    expect(coutRemplacementCPNRMois(a, 7)).toBeCloseTo(attendu, 2);
    expect(payrollMonth(a, 7) - avant).toBeCloseTo(attendu, 2);
  });
  it('intérim et part remplacée', () => {
    const a = base();
    a.cpNR.jours[7] = 10; a.cpNR.mode = 'interim'; a.cpNR.coutJourInterim = 300; a.cpNR.pctRemplace = 50;
    expect(coutRemplacementCPNRMois(a, 7)).toBeCloseTo(1500, 2);
    a.cpNR.mode = 'aucun';
    expect(coutRemplacementCPNRMois(a, 7)).toBe(0);
  });
  it('répartition automatique : 60 / 20 / 20 et total proche des acquis', () => {
    const a = base();
    repartirCPNRAuto(a);
    const j = a.cpNR.jours, tot = cpNRAcquis(a);
    const ete = [5, 6, 7, 8, 9].reduce((s, m) => s + j[m], 0);
    expect(ete / tot).toBeCloseTo(0.6, 1);
    expect(Math.abs(cpNRSaisis(a) - tot)).toBeLessThanOrEqual(0.25);
  });
  it('budget ancien sans cpNR : pas d\'erreur', () => {
    const a = base(); delete a.cpNR;
    expect(coutRemplacementCPNRMois(a, 3)).toBe(0);
    expect(Number.isFinite(payrollMonth(a, 3))).toBe(true);
  });
});
