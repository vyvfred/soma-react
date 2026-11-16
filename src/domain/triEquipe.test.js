import { describe, it, expect } from 'vitest';
import { ordreEquipe, majOrdreEquipe } from './triEquipe.js';

const emps = [{ name: 'Martin Paul', qual: 'DEA' }, { name: 'élise Durand', qual: 'AA' }, { name: '', qual: 'DEA' }, { name: 'Bernard Luc', qual: 'REGULATEUR' }, { name: 'Éric Abel', qual: 'DEA' }];
const noms = (o) => o.map((i) => emps[i].name);

describe("Tri de l'équipe", () => {
  it('A → Z en français (accents et casse ignorés), noms vides en bas', () => {
    expect(noms(ordreEquipe(emps, 'nomAZ'))).toEqual(['Bernard Luc', 'élise Durand', 'Éric Abel', 'Martin Paul', '']);
  });
  it('Z → A', () => {
    expect(noms(ordreEquipe(emps, 'nomZA'))).toEqual(['Martin Paul', 'Éric Abel', 'élise Durand', 'Bernard Luc', '']);
  });
  it('par qualification puis nom', () => {
    expect(noms(ordreEquipe(emps, 'qualif'))).toEqual(['Éric Abel', 'Martin Paul', '', 'élise Durand', 'Bernard Luc']);
  });
  it('ordre de saisie inchangé', () => {
    expect(ordreEquipe(emps, 'saisie')).toEqual([0, 1, 2, 3, 4]);
  });
  it('ordre figé pendant la saisie, ajout en bas, retri après suppression', () => {
    let e = majOrdreEquipe(null, emps, 'nomAZ', 'A');
    const renomme = emps.map((x, i) => (i === 3 ? { ...x, name: 'Zoé Luc' } : x));
    expect(majOrdreEquipe(e, renomme, 'nomAZ', 'A').ordre).toEqual(e.ordre);
    const plus = renomme.concat({ name: 'Aaron', qual: 'DEA' });
    e = majOrdreEquipe(e, plus, 'nomAZ', 'A');
    expect(e.ordre[e.ordre.length - 1]).toBe(5);
    const moins = plus.filter((_, i) => i !== 0);
    e = majOrdreEquipe(e, moins, 'nomAZ', 'A');
    expect(moins[e.ordre[0]].name).toBe('Aaron');
  });
});
