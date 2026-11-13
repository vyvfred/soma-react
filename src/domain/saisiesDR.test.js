import { describe, it, expect } from 'vitest';
import { marquerSaisiesDR, estSaisieDR, champSaisiDR, aDesSaisiesDR, cheminsModifies } from './saisiesDR.js';

const base = () => ({ targetCA: 1000, refs: { san: [{ semaine: 500 }] }, employees: [{ name: 'A', hours: 35 }, { name: 'B', hours: 24 }], presence: { 3: { cp: 0 } }, cal: [1, 2] });

describe('Saisies du DR à la place du REX', () => {
  it('le DR modifie : valeurs marquées, équipe marquée sur le salarié', () => {
    const av = base(), ap = base(); ap.targetCA = 1200; ap.refs.san[0].semaine = 600; ap.employees[1].hours = 28; ap.presence[3].cp = 2;
    expect(marquerSaisiesDR(av, ap, true)).toBe(true);
    expect(estSaisieDR(ap, 'targetCA')).toBe(true);
    expect(estSaisieDR(ap, 'refs.san.0.semaine')).toBe(true);
    expect(estSaisieDR(ap, 'presence.3.cp')).toBe(true);
    expect(champSaisiDR(ap.employees[1], 'hours')).toBe(true);
    expect(champSaisiDR(ap.employees[0], 'hours')).toBe(false);
    expect(av.employees[1]._dr).toBeUndefined();
  });
  it('le REX modifie ensuite : la marque disparaît, les autres restent', () => {
    const av = base(), ap = base(); ap.targetCA = 1200; ap.employees[1].hours = 28; marquerSaisiesDR(av, ap, true);
    const ap2 = JSON.parse(JSON.stringify(ap)); ap2.targetCA = 1300;
    marquerSaisiesDR(ap, ap2, false);
    expect(estSaisieDR(ap2, 'targetCA')).toBe(false);
    expect(champSaisiDR(ap2.employees[1], 'hours')).toBe(true);
    expect(aDesSaisiesDR(ap2)).toBe(true);
  });
  it('vide et 0 équivalents, calendrier ignoré', () => {
    const av = base(), ap = base(); ap.presence[3].other = 0; ap.cal = [9, 9];
    expect(cheminsModifies(av, ap).filter((c) => !/^cal/.test(c))).toEqual([]);
    expect(marquerSaisiesDR(av, ap, true)).toBe(false);
  });
  it('ligne supprimée par le REX : les marques suivent le salarié', () => {
    const av = base(), ap = base(); ap.employees[1].hours = 28; marquerSaisiesDR(av, ap, true);
    const ap2 = JSON.parse(JSON.stringify(ap)); ap2.employees.splice(0, 1);
    marquerSaisiesDR(ap, ap2, false);
    expect(champSaisiDR(ap2.employees[0], 'hours')).toBe(true);
  });
  it('salarié ajouté par le DR : toute la ligne marquée', () => {
    const av = base(), ap = base(); ap.employees.push({ name: 'Nouveau', hours: 35 });
    marquerSaisiesDR(av, ap, true);
    expect(champSaisiDR(ap.employees[2], 'name')).toBe(true);
    expect(champSaisiDR(ap.employees[0], 'name')).toBe(false);
  });
});
