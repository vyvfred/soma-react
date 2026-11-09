import { describe, it, expect } from 'vitest';
import { amount, ann, monthCA } from './calculations.js';
import { construireClasseurCharges, lireClasseurCharges, appliquerChargesBudget } from './classeurCharges.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

// Demande de Florent (nov. 2026) : péages en % du CA, différent par agence ET par mois
const PCTS = [2, 2, 2.5, 2.5, 3, 3, 4, 4, 3, 2.5, 2, 2];
const avecPeages = () => { const a = agenceReference(); a.rex['Péages'] = { mode: 'pctMois', pcts: PCTS.slice(), values: Array(12).fill(null), chargeType: 'variable' }; return a; };

describe('% du CA différent chaque mois', () => {
  it('montant du mois = CA du mois × % du mois', () => {
    const a = avecPeages();
    for (let m = 0; m < 12; m++) expect(amount(a, 'Péages', m)).toBeCloseTo(monthCA(a, m) * PCTS[m] / 100, 6);
  });
  it('mois vide = 0', () => {
    const a = avecPeages(); a.rex['Péages'].pcts[5] = null;
    expect(amount(a, 'Péages', 5)).toBe(0);
  });
  it('classeur : export vers la feuille Mensuel, réimport identique', () => {
    const a = avecPeages();
    const c = construireClasseurCharges([{ nom: 'NANTES', data: a }]);
    expect(c.reseau.find((r) => r[0] === 'Péages')[2]).toBe('mensuel');
    const lm = c.mensuel.find((r) => r[1] === 'Péages');
    expect(lm.slice(2, 4)).toEqual(['2 %', '2 %']);
    expect(lm[8]).toBe('4 %');
    const r = lireClasseurCharges(c.reseau, c.mensuel, ['NANTES']);
    expect(r.erreurs).toEqual([]);
    expect(r.lignes.NANTES['Péages']).toEqual({ mode: 'pctMois', pcts: PCTS });
    expect(appliquerChargesBudget({ rex: a.rex }, r.lignes.NANTES).nbPostes).toBe(0);
  });
  it('classeur : Florent saisit des % par mois pour deux agences', () => {
    const mensuel = [['Agence', 'Poste'], ['NANTES', 'Péages', '2,1 %', '2,1 %', '3 %'], ['ANGERS', 'Péages', '1 %', '1,5 %', '1,5 %']];
    const r = lireClasseurCharges([['Poste', 'Répartition', 'NANTES', 'ANGERS']], mensuel, ['NANTES', 'ANGERS']);
    expect(r.lignes.NANTES['Péages'].pcts.slice(0, 3)).toEqual([2.1, 2.1, 3]);
    expect(r.lignes.ANGERS['Péages'].pcts.slice(0, 4)).toEqual([1, 1.5, 1.5, null]);
    const d = appliquerChargesBudget({ versions: { v1: { rex: {} } }, meta: {} }, r.lignes.NANTES).data;
    expect(d.versions.v1.rex['Péages'].mode).toBe('pctMois');
  });
  it('classeur : mélange montants et % refusé', () => {
    const r = lireClasseurCharges([['Poste', 'Répartition', 'NANTES']], [['Agence', 'Poste'], ['NANTES', 'Péages', '2 %', 500]], ['NANTES']);
    expect(r.erreurs.join(' ')).toMatch(/mélange/);
    expect(r.lignes.NANTES).toBeUndefined();
  });
  it('compte dans le résultat', () => {
    const base = agenceReference(), a = avecPeages();
    const attendu = PCTS.reduce((s, p, m) => s + monthCA(a, m) * p / 100, 0);
    expect(Math.round(ann(base, "RESULTAT D'EXPLOITATION") - ann(a, "RESULTAT D'EXPLOITATION"))).toBe(Math.round(attendu));
  });
});
