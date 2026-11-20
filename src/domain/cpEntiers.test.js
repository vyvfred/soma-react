import { describe, it, expect } from 'vitest';
import { repartirCPAuto, cpParMois, ajusterCPMinimal } from './repartitionCP.js';
import { verrouillerMois } from './presenceMois.js';
import { arrondirCPEntiers, etatConges, rafraichirConges } from './rafraichirConges.js';
import { cpGeneres, cpPlanifies, setAbsPartMois, needWeeks, repartirCPNRAuto, cpNRAcquis, partsEntieres } from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';
const entier = (v) => Math.abs(v - Math.round(v)) < 1e-9;
function agence() { const a = agenceReference(); const base = a.employees.slice(); a.employees = []; for (let k = 0; k < 8; k++) base.forEach((e, i) => a.employees.push({ ...e, id: (e.id || i) + '-' + k })); a.targetTXR = 50; a.targetCA = 2000000; const c = a.cal.reduce((x, d) => x + d.total, 0); a.cal.forEach((d) => { d.total = d.total * 2000000 / c; }); return a; }

describe('Congés en jours entiers (nov. 2026)', () => {
  it('acquis entiers, répartition en jours entiers par semaine et par mois', () => {
    const a = agence(); repartirCPAuto(a);
    expect(entier(cpGeneres(a))).toBe(true);
    expect(cpPlanifies(a)).toBe(cpGeneres(a));
    Object.values(a.presence).forEach((p) => expect(entier(+p.cp || 0)).toBe(true));
    cpParMois(a).forEach((v) => expect(entier(v)).toBe(true));
  });
  it('validation, ajout d\'un CDD : toujours des jours entiers', () => {
    const a = agence(); repartirCPAuto(a);
    needWeeks(a).filter((w) => a.cal.some((d) => d.week === w.week && d.month === 6)).forEach((w) => setAbsPartMois(a, w.week, 'cp', 6, 0));
    verrouillerMois(a, 6);
    const av = etatConges(a);
    a.employees = a.employees.concat({ name: 'CDD', qual: 'DEA', contract: 'CDD', hours: 35, pctRoulant: 100, joursSem: 5, dateEntree: '2027-08-01', dateSortie: '2027-09-30' });
    rafraichirConges(a, av, ajusterCPMinimal);
    Object.values(a.presence).forEach((p) => expect(entier(+p.cp || 0)).toBe(true));
    cpParMois(a).forEach((v) => expect(entier(v)).toBe(true));
    expect(cpPlanifies(a)).toBe(cpGeneres(a));
  });
  it('saisie arrondie au jour, non-roulants en jours entiers', () => {
    const a = agence(); const w = needWeeks(a)[10].week;
    setAbsPartMois(a, w, 'cp', a.cal.find((d) => d.week === w).month, '2,6');
    expect(a.presence[w].cp).toBe(3);
    repartirCPNRAuto(a);
    a.cpNR.jours.forEach((v) => expect(entier(v)).toBe(true));
    expect(a.cpNR.jours.reduce((s, v) => s + v, 0)).toBe(cpNRAcquis(a));
  });
  it('un ancien budget en demi-journées est arrondi une fois, total conservé', () => {
    const a = agence(); a.presence = { 10: { cp: 2.5, other: 0 }, 11: { cp: 1.5, other: 0 }, 12: { cp: 3.4, other: 0 } };
    expect(arrondirCPEntiers(a)).toBe(true);
    Object.values(a.presence).forEach((p) => expect(entier(p.cp)).toBe(true));
    expect(cpPlanifies(a)).toBe(7);
    expect(arrondirCPEntiers(a)).toBe(false);
    expect(partsEntieres(10, [1, 1, 1])).toEqual([4, 3, 3]);
  });
});
