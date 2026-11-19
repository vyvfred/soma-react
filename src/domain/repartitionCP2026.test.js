import { describe, it, expect } from 'vitest';
import { repartirCPAuto, cpParMois, cpProposeMois, reprendrePropositionMois } from './repartitionCP.js';
import { verrouillerMois, moisModifiesHorsPropo, relancerRepartitionCP } from './presenceMois.js';
import { cpGeneres, cpPlanifies, coutHSTotal, setAbsPartMois, needWeeks, moisDeSemaine, M } from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

// Agence de 32 roulants ; ca règle la charge (1,8 M€ : de la marge partout ; 2 M€ : tendu)
function agence(ca) {
  const a = agenceReference(); const base = a.employees.slice(); a.employees = [];
  for (let k = 0; k < 8; k++) base.forEach((e, i) => a.employees.push({ ...e, id: (e.id || i) + '-' + k }));
  a.targetTXR = 50; a.targetCA = ca;
  const c = a.cal.reduce((x, d) => x + d.total, 0); a.cal.forEach((d) => { d.total = d.total * ca / c; });
  return a;
}
const semainesDuMois = (a, m) => needWeeks(a).filter((w) => moisDeSemaine(a, w.week).indexOf(m) >= 0);

describe('Répartition des CP des roulants (refonte nov. 2026)', () => {
  it('ne crée aucune heure supplémentaire quand l\'équipe a assez de marge', () => {
    const a = agence(1800000); repartirCPAuto(a);
    expect(cpPlanifies(a)).toBeCloseTo(cpGeneres(a), 0);
    expect(coutHSTotal(a)).toBe(0);
  });
  it('un mois validé ne bouge jamais, même par une semaine à cheval', () => {
    const a = agence(2000000); repartirCPAuto(a);
    verrouillerMois(a, 5);
    const juin = cpParMois(a)[5];
    semainesDuMois(a, 6).forEach((w) => setAbsPartMois(a, w.week, 'cp', 6, 0)); // juillet vidé depuis l'écran de juillet
    verrouillerMois(a, 6);
    expect(cpParMois(a)[5]).toBeCloseTo(juin, 1);
    expect(cpPlanifies(a)).toBeCloseTo(cpGeneres(a), 0);
  });
  it('reporte sur les autres périodes ce qui reste quand tous les mois d\'une période sont validés', () => {
    const a = agence(2000000); repartirCPAuto(a);
    [5, 6, 7, 8, 9].forEach((m) => { semainesDuMois(a, m).forEach((w) => setAbsPartMois(a, w.week, 'cp', m, 0)); verrouillerMois(a, m); });
    expect(a.cpReliquat).toBe(0);
    expect(cpPlanifies(a)).toBeCloseTo(cpGeneres(a), 0);
    expect(a.cpEnveloppes[0].reporte).toBeGreaterThan(0);
    expect(a.cpDernierRecalcul.report.length).toBe(1);
  });
  it('explique la validation : proposition, jours posés, mois qui bougent, coût des HS', () => {
    const a = agence(2000000); repartirCPAuto(a);
    const propose = cpProposeMois(a, 6);
    semainesDuMois(a, 6).forEach((w) => setAbsPartMois(a, w.week, 'cp', 6, 0));
    verrouillerMois(a, 6);
    const b = a.cpDernierRecalcul;
    expect(b.type).toBe('validation'); expect(b.mois).toBe(6);
    expect(b.propose).toBeCloseTo(propose, 1); expect(b.pose).toBe(0);
    expect(b.deplacements.reduce((s, d) => s + d.delta, 0)).toBeCloseTo(propose, 0);
    expect(typeof b.coutAvant).toBe('number'); expect(typeof b.coutApres).toBe('number');
  });
  it('signale les autres mois non validés modifiés, et sait reprendre la proposition', () => {
    const a = agence(2000000); relancerRepartitionCP(a);
    expect(a.cpDernierRecalcul.type).toBe('relance');
    const propose = cpProposeMois(a, 7);
    semainesDuMois(a, 7).forEach((w) => setAbsPartMois(a, w.week, 'cp', 7, 0));
    expect(moisModifiesHorsPropo(a, 6)).toEqual([7]);
    reprendrePropositionMois(a, 7);
    expect(cpParMois(a)[7]).toBeCloseTo(propose, 0);
    expect(moisModifiesHorsPropo(a, 6)).toEqual([]);
  });
  it('fait au moins aussi bien qu\'avant sur le coût des HS', () => {
    const a = agence(2000000); repartirCPAuto(a);
    expect(coutHSTotal(a)).toBeLessThanOrEqual(32442);
  });
});

describe('Proposition du mois et semaines à cheval sur un mois validé', () => {
  it('ne signale pas à tort un mois voisin comme modifié', () => {
    const a = agence(2000000); repartirCPAuto(a);
    semainesDuMois(a, 6).forEach((w) => setAbsPartMois(a, w.week, 'cp', 6, 0));
    verrouillerMois(a, 6);
    expect(moisModifiesHorsPropo(a, 7)).toEqual([]);
    M.forEach((_, m) => { if (m !== 6) expect(Math.abs(cpParMois(a)[m] - cpProposeMois(a, m))).toBeLessThan(0.5); });
  });
});
