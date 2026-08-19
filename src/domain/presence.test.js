import { describe, it, expect } from 'vitest';
import { reequilibrerSick } from './presence.js';

const moyRemplis = (arr) => {
  const f = arr.filter((v) => v !== null && v !== undefined);
  return f.reduce((s, v) => s + v, 0) / f.length;
};

describe('reequilibrerSick — rééquilibrage de l’absentéisme', () => {
  it('ramène la moyenne des mois renseignés sur la cible', () => {
    const sick = [8, 8, 8, 8, 8, 8, null, null, null, null, null, null]; // moy 8
    const out = reequilibrerSick(sick, 5);
    expect(moyRemplis(out)).toBeCloseTo(5, 1);
  });

  it('laisse les mois vides intacts', () => {
    const sick = [10, null, 6, null, 4, null, null, null, null, null, null, null];
    const out = reequilibrerSick(sick, 5);
    expect(out[1]).toBeNull();
    expect(out[3]).toBeNull();
  });

  it('ne produit aucune valeur négative', () => {
    const sick = [1, 1, 20, null, null, null, null, null, null, null, null, null]; // moy ~7.3
    const out = reequilibrerSick(sick, 3);
    out.filter((v) => v !== null).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  it('tableau entièrement vide : remplit tous les mois à la cible', () => {
    const out = reequilibrerSick(Array(12).fill(null), 5);
    expect(out.every((v) => v === 5)).toBe(true);
  });

  it('déjà à la cible : renvoie les valeurs inchangées', () => {
    const sick = [5, 5, 5, null, null, null, null, null, null, null, null, null];
    expect(reequilibrerSick(sick, 5)).toEqual(sick);
  });
});
