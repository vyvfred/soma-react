import { describe, it, expect } from 'vitest';
import {
  payrollMonthCivil, payrollPayMonth, costHourJuin, chMois, ratioMaintien, partCDDSemaine, hsRows,
  mainMonth, msNRMensuel, msNRMois, tauxAbsMois, coutHoraireImproductif, varDecCalc, varDec2026Total,
  chargesCGSaisies, cpGeneres, isRoulant, buildPeriodesPaie, coutRoulantSemaine
} from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

// Paramétrage salarial 2027 (réunion de paramétrage des taux et coûts salariaux).
// Chaque règle est vérifiée par l'écart qu'elle produit, calculé à la main.
const civil = (a) => [...Array(12).keys()].map((m) => payrollMonthCivil(a, m));
// Coût roulant d'un mois civil (pro-rata des jours de chaque semaine), avec un coût de semaine donné
const roulantMois = (a, m, cout) => hsRows(a).reduce((s, r) => {
  const dW = a.cal.filter((d) => d.week === r.week).length || 7;
  const dM = a.cal.filter((d) => d.week === r.week && d.month === m).length;
  return dM ? s + cout(r) * dM / dW : s;
}, 0);
const base = () => { const a = agenceReference(); a.tauxHoraireBrut = 20.07; a.tauxChargePatronal = 42; a.sick = Array(12).fill(8); return a; };

describe('taux horaire au 1er janvier et au 1er juin', () => {
  it('coût chargé de juin = brut juin × (1 + charges) ; janvier à mai au taux de janvier', () => {
    const a = base(); a.tauxHoraireBrutJuin = 20.35;
    expect(costHourJuin(a)).toBe(28.9);
    expect(chMois(a, 4)).toBe(28.5);
    expect(chMois(a, 5)).toBe(28.9);
  });
  it('sans taux de juin, le taux de janvier vaut toute l\'année et rien ne change', () => {
    const a = base(); const avant = civil(a);
    a.tauxHoraireBrutJuin = null;
    expect(civil(a)).toEqual(avant);
  });
  it('janvier à mai inchangés ; juillet passe exactement au taux de juin', () => {
    const a = base(), sans = civil(a);
    a.tauxHoraireBrutJuin = 20.35;
    const avec = civil(a);
    for (let m = 0; m < 5; m++) expect(avec[m]).toBeCloseTo(sans[m], 6);
    const roulJuin = roulantMois(a, 6, (r) => coutRoulantSemaine(a, r, 6));
    expect(avec[6] - sans[6]).toBeCloseTo(roulJuin - roulJuin * 28.5 / 28.9, 4);
  });
});

describe('prime de précarité CDD (10 %)', () => {
  it('surcoût = 10 % × part des heures roulantes en CDD', () => {
    const a = base(), sans = civil(a);
    a.employees[0].contract = 'CDD';
    const part = partCDDSemaine(a, hsRows(a)[10].week);
    expect(part).toBeCloseTo(35 / 94, 9); // 35 h CDD sur 35 + 35 + 24 h roulantes
    const avec = civil(a);
    const roul = roulantMois(a, 6, (r) => coutRoulantSemaine(a, r, 6));
    expect(avec[6] - sans[6]).toBeCloseTo(roul - roul / (1 + 0.1 * part), 4);
  });
  it('« Contrat à durée déterminée » et « C.D.D » ne sont pas confondus avec un CDI', () => {
    const a = base();
    a.employees[0].contract = 'CDI';
    expect(partCDDSemaine(a, hsRows(a)[10].week)).toBe(0);
  });
});

describe('ratio de maintien de salaire', () => {
  it('une heure d\'arrêt coûte heures × taux × ratio', () => {
    const a = base(), sans = civil(a);
    a.ratioMaintien = 50;
    expect(ratioMaintien(a)).toBe(0.5);
    const malJan = roulantMois(a, 0, (r) => r.mal);
    expect(civil(a)[0] - sans[0]).toBeCloseTo(malJan * 28.5 * 0.5, 4);
  });
  it('vide = absences déduites à 100 % (comportement historique)', () => {
    const a = base(); a.ratioMaintien = null;
    expect(ratioMaintien(a)).toBe(0);
  });
});

describe('ligne unique de masse salariale non-roulante', () => {
  it('coût mensuel = brut × (1 + charges) × (1 − absentéisme × part non maintenue)', () => {
    const a = base(); a.msNRBrutMensuel = 6800; a.msNRTauxCharges = 42; a.ratioMaintien = 50;
    expect(msNRMensuel(a)).toBeCloseTo(9656, 6);
    expect(msNRMois(a, 0)).toBeCloseTo(9656 * (1 - 0.08 * 0.5), 6);
  });
  it('remplace le coût par jour des non-roulants et la quote-part DR', () => {
    const a = base(); a.drCostAnnual = 90000; a.drPct = 20; a.hsImproductif = {};
    const ancien = payrollMonthCivil(a, 0);
    a.msNRBrutMensuel = 6800; a.msNRTauxCharges = 42;
    const jours = a.cal.filter((d) => d.month === 0 && [1, 2, 3, 4, 5].includes(new Date(2027, d.month, d.day).getDay())).length;
    const ancienNR = 210 * Math.round(jours * 5 / 5) + 90000 * 0.2 / 12;
    expect(payrollMonthCivil(a, 0) - ancien).toBeCloseTo(msNRMois(a, 0) - ancienNR, 4);
  });
  it('coût horaire improductif = coût mensuel ÷ heures mensuelles des non-roulants', () => {
    const a = base(); a.msNRBrutMensuel = 6800; a.msNRTauxCharges = 42;
    expect(coutHoraireImproductif(a)).toBeCloseTo(9656 / (35 * 52 / 12), 6);
  });
  it('en paie par période : un salaire mensuel par mois de paie, sans quote-part DR', () => {
    const a = base(); a.periodesPaie = buildPeriodesPaie(); a.msNRBrutMensuel = 6800; a.msNRTauxCharges = 42; a.drCostAnnual = 90000; a.drPct = 20;
    const avec = payrollPayMonth(a, 1);
    a.msNRBrutMensuel = null;
    const coutJour = a.employees.filter((e) => !['DEA', 'AA', 'TAXI', 'TPMR', 'FACTURIERE'].includes(e.qual))
      .reduce((s, e) => s + (+e.coutJour || 0) * (28 * (+e.joursSem || 5) / 7), 0);
    const sans = payrollPayMonth(a, 1);
    expect(avec - sans).toBeCloseTo(msNRMois({ ...a, msNRBrutMensuel: 6800 }, 1) - coutJour - 90000 * 0.2 * 28 / 365, 4);
  });
});

describe('absentéisme unique roulants / improductifs', () => {
  it('les CP générés (roulants seulement, prorata heures et part roulante) suivent le taux mensuel d\'absentéisme', () => {
    const a = base(); a.tauxAbsImproductif = 2;
    const etp = a.employees.filter((e) => ['DEA', 'AA', 'TAXI', 'TPMR'].includes(e.qual)).reduce((s, e) => s + (+e.hours || 0) / 35 * (+e.pctRoulant || 100) / 100, 0);
    const attendu = Math.round(etp * 25 * (1 - 0.08) * 10) / 10;
    expect(cpGeneres(a)).toBe(attendu);
  });
});

describe('variables de paie de décembre 2026', () => {
  it('total chargé = éléments de salaire × (1 + charges) + repas non chargés', () => {
    const c = varDecCalc({ hs25: 4000, hs50: 1500, dimFeries: 2000, primes: 500, repas: 1200 }, 42);
    expect(c.total).toBeCloseTo(12560, 6);
  });
  it('ajouté à la paie de janvier seulement ; recalculé si le taux de charge change', () => {
    const a = base(); a.periodesPaie = buildPeriodesPaie();
    const jan = payrollPayMonth(a, 0), fev = payrollPayMonth(a, 1);
    a.variablesDec2026Detail = { hs25: 4000, hs50: 1500, dimFeries: 2000, primes: 500, repas: 1200 };
    // + 12 560 € de variables, dont 7 810 € de HS (5 500 € × 1,42) qui entrent dans le lissage de la 5e semaine :
    // janvier − 7 810 / 5 × 2/3 = − 1 041,33 € ; février et mars + 520,67 € chacun
    expect(payrollPayMonth(a, 0) - jan).toBeCloseTo(12560 - 7810 / 5 * 2 / 3, 4);
    expect(payrollPayMonth(a, 1) - fev).toBeCloseTo(7810 / 5 * 2 / 3 / 2, 4);
    a.tauxChargePatronal = 45;
    expect(varDec2026Total(a)).toBeCloseTo(8000 * 1.45 + 1200, 6);
  });
  it('un ancien montant global reste compté tant que le détail n\'est pas saisi', () => {
    const a = base(); a.variablesDec2026 = 18000;
    expect(varDec2026Total(a)).toBe(18000);
  });
});

describe('compteur « Charges saisies » du tableau de bord', () => {
  it('compte les postes réellement saisis (mois, annuel, % CA)', () => {
    const a = base();
    expect(chargesCGSaisies(a)).toBe(0);
    a.rex['Assurance'] = { ...a.rex['Assurance'], mode: 'annual', annual: 12000 };
    a.rex['Péages'] = { ...a.rex['Péages'], mode: 'month', values: [0, 0, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    expect(chargesCGSaisies(a)).toBe(2);
  });
});

// Vérification de cohérence : les helpers utilisés ci-dessus existent bien
it('les fonctions du paramétrage sont exportées', () => {
  [mainMonth, tauxAbsMois, isRoulant].forEach((f) => expect(typeof f).toBe('function'));
});

import { lissage5eSemaine, coutHSPeriodePaie, nbSemPeriode } from './calculations.js';
describe('Lissage de la 5e semaine de variables (règle du CG)', () => {
  const avecHS = () => { const a = base(); a.periodesPaie = buildPeriodesPaie(); a.targetTXR = (+a.targetTXR || 100) * 0.6; return a; };
  it('mois à 5 semaines : − HS / 5 × 2/3 ; les deux autres mois du trimestre : + la moitié', () => {
    const a = avecHS();
    [0, 3, 6, 9].forEach((m5) => {
      const x = coutHSPeriodePaie(a, m5) / 5 * 2 / 3;
      expect(x).toBeGreaterThan(0);
      expect(lissage5eSemaine(a, m5)).toBeCloseTo(-x, 6);
      expect(lissage5eSemaine(a, m5 + 1)).toBeCloseTo(x / 2, 6);
      expect(lissage5eSemaine(a, m5 + 2)).toBeCloseTo(x / 2, 6);
    });
  });
  it('total de l\'année inchangé', () => {
    const a = avecHS();
    expect([...Array(12).keys()].reduce((s, m) => s + lissage5eSemaine(a, m), 0)).toBeCloseTo(0, 6);
  });
  it('nombre de semaines déduit des dates de la période', () => {
    expect(buildPeriodesPaie().map(nbSemPeriode)).toEqual([5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4]);
  });
});
