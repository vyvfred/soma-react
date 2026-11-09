import { describe, it, expect } from 'vitest';
import { agency, baseH, partRoulant, genCal, hsTot, transfertRoulantNR, msNRMois } from './calculations.js';
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

describe('Retrait automatique de la part roulante sur la ligne non-roulants', () => {
  const ag = (pct) => { const a = agency('NANTES'); a.costHour = 30; a.msNRBrutMensuel = 5000; a.msNRTauxCharges = 40;
    a.employees = [{ name: 'A', qual: 'DEA', hours: 35, pctRoulant: 100 }, { name: 'R', qual: 'REGULATEUR', hours: 35, pctRoulant: pct }]; return a; };
  it('le CG saisit la ligne complète ; SOMA retire heures roulantes × coût horaire', () => {
    expect(transfertRoulantNR(ag(0), 0)).toBe(0);
    expect(transfertRoulantNR(ag(30), 0)).toBeCloseTo(10.5 * 52 / 12 * 30, 6);
    expect(msNRMois(ag(0), 0) - msNRMois(ag(30), 0)).toBeCloseTo(10.5 * 52 / 12 * 30, 6);
  });
  it('facturière : part roulante comptée en roulant, rien déduit de la ligne non-roulants', () => {
    const a = ag(0); a.employees.push({ name: 'F', qual: 'FACTURIERE', hours: 35, pctRoulant: 40 });
    expect(baseH(a)).toBe(35 + 14);
    expect(transfertRoulantNR(a, 0)).toBe(0);
    expect(msNRMois(a, 0)).toBe(msNRMois(ag(0), 0));
  });
  it('jamais négatif', () => {
    const a = ag(100); a.msNRBrutMensuel = 100;
    expect(msNRMois(a, 0)).toBe(0);
  });
});
