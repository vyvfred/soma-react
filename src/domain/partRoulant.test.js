import { describe, it, expect } from 'vitest';
import { agency, baseH, partRoulant, genCal, hsTot, msNRMois, msRoulantBaseMois, cpNRAcquisMois, cpNRAcquis, coutJourCPNR, variationStockCPNRMois } from './calculations.js';
import { teamInsight } from './teamInsight.js';

// Signalement nov. 2026 : la clé roulant / non-roulant ne s'appliquait pas aux ETP, et un salarié saisi
// à 0 % comptait comme roulant à 100 % (« +e.pctRoulant||100 ») : passer de 0 à 30 % faisait BAISSER les heures.
const equipe = (pct) => { const a = agency('NANTES'); a.employees = [
  { name: 'A', qual: 'DEA', hours: 35, pctRoulant: 100 },
  { name: 'B', qual: 'AA', hours: 35, pctRoulant: pct }
]; return a; };

describe('Part roulante (% roul.)', () => {
  it('0 % = non roulant ; vide = 100 %', () => {
    expect(partRoulant({ pctRoulant: 0 })).toBe(0);
    expect(partRoulant({ pctRoulant: '0' })).toBe(0);
    expect(partRoulant({ pctRoulant: 30 })).toBe(0.3);
    expect(partRoulant({ qual: 'DEA' })).toBe(1);
    expect(partRoulant({ qual: 'AA', pctRoulant: '' })).toBe(1);
    expect(partRoulant({ qual: 'DEA', pctRoulant: 150 })).toBe(1);
  });
  it('les heures roulantes augmentent avec le pourcentage', () => {
    const h = [0, 30, 70, 100].map((p) => baseH(equipe(p)));
    expect(h).toEqual([35, 45.5, 59.5, 70]);
  });
  it('les ETP suivent la clé roulant / non-roulant', () => {
    expect(teamInsight(equipe(0)).etpTotal).toBe(1);
    expect(teamInsight(equipe(50)).etpTotal).toBe(1.5);
    expect(teamInsight(equipe(100)).etpTotal).toBe(2);
  });
});

describe('Part roulante des autres qualifications (régulateur, REX…)', () => {
  const avec = (e) => { const a = agency('NANTES'); a.employees = [{ name: 'A', qual: 'DEA', hours: 35, pctRoulant: 100 }, e]; return a; };
  it('un régulateur à 30 % ajoute 30 % de ses heures à la capacité roulante', () => {
    expect(baseH(avec({ name: 'R', qual: 'REGULATEUR', hours: 35, pctRoulant: 30 }))).toBe(45.5);
    expect(teamInsight(avec({ name: 'R', qual: 'REGULATEUR', hours: 35, pctRoulant: 30 })).etpTotal).toBe(1.3);
  });
  it('champ vide : 0 % pour un non-roulant ; la part roulante d\'une facturière compte', () => {
    expect(partRoulant({ qual: 'REGULATEUR' })).toBe(0);
    expect(partRoulant({ qual: 'REX', pctRoulant: 0 })).toBe(0);
    expect(partRoulant({ qual: 'FACTURIERE', pctRoulant: 50 })).toBe(0.5);
    expect(partRoulant({ qual: 'FACTURIERE' })).toBe(0);
    expect(partRoulant({ qual: 'dea' })).toBe(1);
  });
  it('la part roulante entre dans la capacité : moins d\'heures supplémentaires', () => {
    const base = avec({ name: 'R', qual: 'REGULATEUR', hours: 35, pctRoulant: 0 });
    const r30 = avec({ name: 'R', qual: 'REGULATEUR', hours: 35, pctRoulant: 30 });
    [base, r30].forEach((a) => { a.costHour = 30; a.targetTXR = 95; a.refs.san.forEach((m) => { m.semaine = 3000; m.vacances = 3000; m.samedi = 1000; m.dimanche = 1000; m.ferie = 1000; }); genCal(a); });
    expect(hsTot(r30).hs).toBeLessThan(hsTot(base).hs);
  });
});

describe('Ligne non-roulants indépendante de l\'équipe (nov. 2026)', () => {
  const ag = (pct) => { const a = agency('NANTES'); a.costHour = 30; a.msNRBrutMensuel = 5000; a.msNRTauxCharges = 40;
    a.employees = [{ name: 'A', qual: 'DEA', hours: 35, pctRoulant: 100 }, { name: 'R', qual: 'REGULATEUR', hours: 35, pctRoulant: pct }]; return a; };
  it('la MS non roulante ne dépend pas du % roulant', () => {
    expect(msNRMois(ag(0), 0)).toBeCloseTo(7000, 6);
    expect(msNRMois(ag(30), 0)).toBeCloseTo(7000, 6);
  });
  it('la part roulante d\'un non-roulant compte en capacité mais n\'est pas coûtée une 2e fois en roulant', () => {
    expect(baseH(ag(30))).toBe(35 + 10.5);
    expect(msRoulantBaseMois(ag(30), 0)).toBeCloseTo(msRoulantBaseMois(ag(0), 0), 6);
    const sansLigne = ag(30); sansLigne.msNRBrutMensuel = null;
    expect(msRoulantBaseMois(sansLigne, 0)).toBeGreaterThan(msRoulantBaseMois(ag(0), 0));
  });
  it('facturière : part roulante comptée en roulant', () => {
    const a = ag(0); a.employees.push({ name: 'F', qual: 'FACTURIERE', hours: 35, pctRoulant: 40 });
    expect(baseH(a)).toBe(35 + 14);
    expect(msRoulantBaseMois(a, 0)).toBeGreaterThan(msRoulantBaseMois(ag(0), 0));
  });
});

describe('CP des non-roulants à partir des ETP saisis par le CG', () => {
  const ag = () => { const a = agency('NANTES'); a.costHour = 30; a.msNRBrutMensuel = 11430; a.msNRTauxCharges = 36.69; a.etpNR = 4;
    a.employees = [{ name: 'A', qual: 'DEA', hours: 35 }]; a.cpNR = { jours: Array(12).fill(0) }; return a; };
  it('acquisition = ETP × 2,5 j par mois, 30 j par ETP sur l\'année', () => {
    const a = ag();
    expect(cpNRAcquisMois(a, 0)).toBeCloseTo(10, 6);
    expect(cpNRAcquis(a)).toBeCloseTo(120, 6);
  });
  it('variation = (acquis − posés) × MS mensuelle / ETP / 26', () => {
    const a = ag(); a.cpNR.jours[7] = 40;
    const j = 11430 * 1.3669 / 4 / 26;
    expect(coutJourCPNR(a)).toBeCloseTo(j, 6);
    expect(variationStockCPNRMois(a, 0)).toBeCloseTo(10 * j, 6);
    expect(variationStockCPNRMois(a, 7)).toBeCloseTo(-30 * j, 6);
  });
  it('sans ETP saisis : pas de provision non roulante', () => {
    const a = ag(); a.etpNR = null;
    expect(variationStockCPNRMois(a, 0)).toBe(0);
  });
});
