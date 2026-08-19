import { describe, it, expect } from 'vitest';
import {
  isRoulant, coefHSMois, tauxHS50Mois, between, baseH, baseHWeek,
  annualCA, monthCA, cpGeneres, payrollMonth, coutHSTotal, sig, weeks, ann, hsTot
} from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

// ─────────────────────────────────────────────────────────────
// 1) Vérifications INDÉPENDANTES : valeurs calculées à la main.
//    Elles prouvent la justesse de la logique, pas seulement sa stabilité.
// ─────────────────────────────────────────────────────────────
describe('fonctions feuilles — valeurs calculées à la main', () => {
  it('isRoulant : DEA, AA, TAXI, TPMR sont roulants (insensible à la casse)', () => {
    ['DEA', 'AA', 'TAXI', 'TPMR', 'dea', 'aa'].forEach((q) => expect(isRoulant(q)).toBe(true));
    ['REGULATEUR', 'FACTURIERE', 'REX', '', undefined].forEach((q) => expect(isRoulant(q)).toBe(false));
  });

  it('between : bornes incluses', () => {
    expect(between(5, 1, 10)).toBe(true);
    expect(between(1, 1, 10)).toBe(true);
    expect(between(10, 1, 10)).toBe(true);
    expect(between(0, 1, 10)).toBe(false);
    expect(between(11, 1, 10)).toBe(false);
  });

  it('tauxHS50Mois : null → 0, valeurs bornées à [0,100] puis /100', () => {
    const a = { hs50: [null, 0, 50, 100, 130, -5, undefined, 25, 0, 0, 0, 0] };
    expect(tauxHS50Mois(a, 0)).toBe(0);
    expect(tauxHS50Mois(a, 2)).toBe(0.5);
    expect(tauxHS50Mois(a, 3)).toBe(1);
    expect(tauxHS50Mois(a, 4)).toBe(1); // borné à 100
    expect(tauxHS50Mois(a, 5)).toBe(0); // borné à 0
    expect(tauxHS50Mois(a, 6)).toBe(0); // undefined
  });

  it('coefHSMois : (1 - p50)·1,25 + p50·1,50', () => {
    const a = { hs50: [null, 100, 50, 25, 0, 0, 0, 0, 0, 0, 0, 0] };
    expect(coefHSMois(a, 0)).toBeCloseTo(1.25, 10); // 0 % à 50
    expect(coefHSMois(a, 1)).toBeCloseTo(1.5, 10); // 100 % à 50
    expect(coefHSMois(a, 2)).toBeCloseTo(1.375, 10); // 50 % à 50
    expect(coefHSMois(a, 3)).toBeCloseTo(1.3125, 10); // 25 % à 50 : 0,75·1,25 + 0,25·1,50
  });

  it('baseHWeek / baseH : somme des heures roulantes pondérées par pctRoulant', () => {
    // Sans mouvements ni calendrier : baseH = somme des roulants (35+35+24), régulateur exclu.
    const a = {
      employees: [
        { qual: 'DEA', hours: 35, pctRoulant: 100 },
        { qual: 'AA', hours: 35, pctRoulant: 100 },
        { qual: 'DEA', hours: 24, pctRoulant: 100 },
        { qual: 'REGULATEUR', hours: 35, pctRoulant: 30 } // non roulant → exclu
      ],
      cal: []
    };
    expect(baseHWeek(a)).toBeCloseTo(94, 10);
    expect(baseH(a)).toBeCloseTo(94, 10);
  });

  it('baseHWeek : pctRoulant partiel pris en compte', () => {
    const a = { employees: [{ qual: 'DEA', hours: 35, pctRoulant: 50 }], cal: [] };
    expect(baseHWeek(a)).toBeCloseTo(17.5, 10);
  });
});

// ─────────────────────────────────────────────────────────────
// 2) NON-RÉGRESSION (golden master) : sorties de référence du noyau
//    actuel sur l'agence de test. Ces valeurs ont été relevées sur la
//    logique de l'application en production. Elles NE DOIVENT PAS changer
//    lors de la réécriture : toute divergence signale une régression.
// ─────────────────────────────────────────────────────────────
describe('noyau composite — non-régression sur l’agence de référence', () => {
  const a = agenceReference();

  it('CA annuel et CA de janvier', () => {
    expect(Math.round(annualCA(a))).toBe(949600);
    expect(Math.round(monthCA(a, 0))).toBe(81400);
  });

  it('capacité roulante (baseH)', () => {
    expect(+baseH(a).toFixed(1)).toBe(94);
  });

  it('coût des heures supplémentaires (aucune HS à 50 % → coef 1,25)', () => {
    expect(Math.round(coutHSTotal(a))).toBe(0);
  });

  it('congés payés générés sur l’année', () => {
    expect(+cpGeneres(a).toFixed(1)).toBe(120);
  });

  it('masse salariale de janvier', () => {
    expect(Math.round(payrollMonth(a, 0))).toBe(17805);
  });

  it('découpage en semaines ISO 2027', () => {
    expect(weeks(a).length).toBe(53);
  });

  it('compte de résultat de janvier — résultat net', () => {
    expect(Math.round(sig(a, 0)['RESULTAT NET'])).toBe(63595);
  });

  it('agrégats annuels du compte de résultat (KPI Synthèse)', () => {
    expect(Math.round(ann(a, "Chiffre d'affaires"))).toBe(949600);
    expect(Math.round(ann(a, 'Charges de personnel'))).toBe(196797);
    expect(Math.round(ann(a, "RESULTAT D'EXPLOITATION"))).toBe(752803);
    expect(Math.round(ann(a, 'RESULTAT NET'))).toBe(752803);
    expect(Math.round(hsTot(a).hs)).toBe(0);
  });
});
