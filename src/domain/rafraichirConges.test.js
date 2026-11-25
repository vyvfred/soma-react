import { describe, it, expect } from 'vitest';
import { etatConges, rafraichirConges } from './rafraichirConges.js';
import { repartirCPAuto } from './repartitionCP.js';
import { cpGeneres, cpPlanifies, cpNRAcquis, cpNRSaisis, repartirCPNRAuto, coutDuChoixREX, isRoulant } from './calculations.js';
import { reinitialiserCP } from './presenceMois.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

function prete() { const a = agenceReference(); a.targetCA = 900000; a.targetTXR = 250; repartirCPAuto(a); return a; }
const sortie = (a) => { const i = a.employees.findIndex((e) => isRoulant(e.qual)); a.employees = a.employees.slice(); a.employees[i] = { ...a.employees[i], dateSortie: '2027-03-31' }; };

describe('Congés payés — mise à jour après un changement des jours acquis', () => {
  it('une sortie de salarié refait la répartition : posés = acquis', () => {
    const a = prete(); const av = etatConges(a);
    sortie(a);
    const r = rafraichirConges(a, av, repartirCPAuto);
    expect(r.roulants).toBe(true);
    expect(cpPlanifies(a)).toBeCloseTo(cpGeneres(a), 0);
  });
  it('sans congés posés, rien n\'est réparti', () => {
    const a = agenceReference(); a.targetCA = 900000; a.targetTXR = 250; const av = etatConges(a);
    sortie(a);
    expect(rafraichirConges(a, av, repartirCPAuto).roulants).toBe(false);
    expect(cpPlanifies(a)).toBe(0);
  });
  it('non-roulants : répartition automatique suivie, saisie manuelle jamais écrasée', () => {
    const a = prete(); repartirCPNRAuto(a); expect(a.cpNR.auto).toBe(true);
    let av = etatConges(a); a.sick = a.sick.map(() => 60); // assez pour changer le total entier de jours acquis
    expect(rafraichirConges(a, av, repartirCPAuto).nonRoulants).toBe(true);
    expect(cpNRSaisis(a)).toBeCloseTo(cpNRAcquis(a), 0);
    a.cpNR = { ...a.cpNR, auto: false, jours: a.cpNR.jours.map(() => 1) };
    av = etatConges(a); a.sick = a.sick.map(() => 2);
    expect(rafraichirConges(a, av, repartirCPAuto).nonRoulants).toBe(false);
    expect(cpNRSaisis(a)).toBe(12);
  });
});

describe('Coût du choix REX — comparaison à données égales', () => {
  it('un changement d\'équipe n\'est pas compté comme un surcoût du REX', () => {
    const a = prete(); sortie(a);
    const c = coutDuChoixREX(a);
    expect(c.mesurable).toBe(false); expect(c.perimee).toBe(true); expect(c.surcout).toBe(0);
  });
  it('un coût horaire modifié après la répartition ne crée pas de surcoût', () => {
    const a = prete(); a.costHour = (+a.costHour || 28) + 5;
    expect(coutDuChoixREX(a).surcout).toBe(0);
  });
  it('la remise à zéro efface la référence, le reliquat et les enveloppes', () => {
    const a = prete(); reinitialiserCP(a);
    expect(a.cpOptimal).toBeUndefined(); expect(a.cpReliquat).toBeUndefined(); expect(a.cpEnveloppes).toBeUndefined();
    expect(coutDuChoixREX(a).semaines).toHaveLength(0);
  });
});

describe('Règle CP 2024 — mise à jour unique des budgets enregistrés avant', () => {
  it('pendant un arrêt, 80 % du rythme normal', () => {
    const a = agenceReference(); const g0 = cpGeneres(a);
    a.sick = Array(12).fill(10);
    expect(cpGeneres(a)).toBeCloseTo(g0 * (1 - 0.1 * 0.2), 0);
  });
  it('répartition refaite une seule fois si posés ≠ acquis', async () => {
    const { appliquerRegleCP2024 } = await import('./rafraichirConges.js');
    const a = prete(); Object.values(a.presence).forEach((p) => { p.cp = Math.round(p.cp * 0.9 * 10) / 10; });
    expect(appliquerRegleCP2024(a, repartirCPAuto)).toBe(true);
    expect(a.regleCP).toBe(2024);
    expect(cpPlanifies(a)).toBeCloseTo(cpGeneres(a), 0);
    expect(appliquerRegleCP2024(a, repartirCPAuto)).toBe(false);
  });
});

describe('Semaine à cheval sur deux mois — parts par mois', () => {
  it('les parts saisies dans chaque mois s\'additionnent', async () => {
    const { moisDeSemaine, absPartMois, setAbsPartMois, needWeeks, genCal } = await import('./calculations.js');
    const a = agenceReference(); genCal(a);
    const w = needWeeks(a).map((x) => x.week).find((k) => moisDeSemaine(a, k).length === 2);
    const [m1, m2] = moisDeSemaine(a, w);
    setAbsPartMois(a, w, 'cp', m1, 2); setAbsPartMois(a, w, 'cp', m2, 3);
    expect(a.presence[w].cp).toBe(5);
    expect(absPartMois(a, w, 'cp', m1)).toBe(2); expect(absPartMois(a, w, 'cp', m2)).toBe(3);
    setAbsPartMois(a, w, 'cp', m1, 1);
    expect(a.presence[w].cp).toBe(4);
  });
  it('total réparti automatiquement : parts au prorata des jours ouvrés, somme exacte', async () => {
    const { moisDeSemaine, absPartMois, needWeeks } = await import('./calculations.js');
    const a = prete();
    needWeeks(a).forEach(({ week }) => {
      const ms = moisDeSemaine(a, week); if (ms.length < 2) return;
      const s = ms.reduce((t, m) => t + absPartMois(a, week, 'cp', m), 0);
      expect(s).toBeCloseTo(+a.presence[week].cp || 0, 5);
    });
  });
  it('la somme des CP des 12 mois égale le total posé', async () => {
    const { absPartMois, needWeeks, moisDeSemaine } = await import('./calculations.js');
    const a = prete();
    let tot = 0; for (let m = 0; m < 12; m++) needWeeks(a).forEach(({ week }) => { if (moisDeSemaine(a, week).includes(m)) tot += absPartMois(a, week, 'cp', m); });
    expect(tot).toBeCloseTo(cpPlanifies(a), 1);
  });
});

describe('CP en jours ouvrables — conversion unique des budgets saisis en jours ouvrés', () => {
  it('× 6/5, heures retirées inchangées, une seule fois', async () => {
    const { convertirCPOuvrables } = await import('./rafraichirConges.js');
    const { pres } = await import('./calculations.js');
    const a = agenceReference(); a.presence = { 10: { cp: 5, other: 1 }, 13: { cp: 5, cpMois: { 2: 2, 3: 3 } } }; a.cpNR = { jours: [null, 5, 0, null, null, null, null, null, null, null, null, null] };
    delete a.uniteCP;
    expect(convertirCPOuvrables(a)).toBe(true);
    expect(a.presence[10]).toEqual({ cp: 6, other: 1 });
    expect(a.presence[13].cpMois).toEqual({ 2: 2.4, 3: 3.6 }); expect(a.presence[13].cp).toBe(6);
    expect(a.cpNR.jours[1]).toBe(6); expect(a.cpNR.jours[0]).toBeNull();
    expect(pres(a, 10).cpH).toBeCloseTo(35, 6);
    expect(convertirCPOuvrables(a)).toBe(false); expect(a.presence[10].cp).toBe(6);
  });
});

describe('Semaine à cheval — absences payées et non payées', () => {
  const semCheval = async (a) => { const { moisDeSemaine, needWeeks, genCal } = await import('./calculations.js'); if (!a.cal.length) genCal(a); return needWeeks(a).map((x) => x.week).filter((k) => moisDeSemaine(a, k).length === 2); };
  it('parts saisies par mois additionnées, heures retirées = total × 7 h, CP non touchés', async () => {
    const { moisDeSemaine, absPartMois, setAbsPartMois, pres } = await import('./calculations.js');
    const a = prete();
    for (const w of await semCheval(a)) {
      const [m1, m2] = moisDeSemaine(a, w); const cp0 = a.presence[w] ? a.presence[w].cp : 0; const av0 = pres(a, w).av;
      for (const ch of ['otherPaid', 'other']) { setAbsPartMois(a, w, ch, m1, 1); setAbsPartMois(a, w, ch, m2, 1.5); }
      expect(a.presence[w].otherPaid).toBe(2.5); expect(a.presence[w].other).toBe(2.5);
      expect(absPartMois(a, w, 'otherPaid', m1)).toBe(1); expect(absPartMois(a, w, 'other', m2)).toBe(1.5);
      expect(a.presence[w].cp).toBe(cp0);
      expect(pres(a, w).otherPaidH).toBe(17.5); expect(pres(a, w).otherH).toBe(17.5);
      expect(av0 - pres(a, w).av).toBeCloseTo(Math.min(av0, 35), 6);
    }
  });
  it('la répartition automatique des CP ne modifie pas les absences', async () => {
    const { moisDeSemaine, setAbsPartMois } = await import('./calculations.js');
    const a = prete(); const w = (await semCheval(a))[0]; const [m1, m2] = moisDeSemaine(a, w);
    setAbsPartMois(a, w, 'other', m1, 2); setAbsPartMois(a, w, 'other', m2, 1);
    repartirCPAuto(a); reinitialiserCP(a);
    expect(a.presence[w].other).toBe(3); expect(a.presence[w].otherMois).toEqual({ [m1]: 2, [m2]: 1 });
  });
  it('absence saisie d\'un bloc avant : partagée sur les jours lundi-vendredi, somme exacte', async () => {
    const { moisDeSemaine, absPartMois } = await import('./calculations.js');
    const a = prete();
    for (const w of await semCheval(a)) {
      a.presence[w] = { ...(a.presence[w] || { cp: 0 }), other: 3, otherPaid: 2 };
      const ms = moisDeSemaine(a, w);
      expect(ms.reduce((s, m) => s + absPartMois(a, w, 'other', m), 0)).toBeCloseTo(3, 6);
      expect(ms.reduce((s, m) => s + absPartMois(a, w, 'otherPaid', m), 0)).toBeCloseTo(2, 6);
    }
  });
});

describe('Semaines à cheval et calendrier — besoins et ressources', () => {
  it('entrée en milieu de semaine : heures au prorata des jours présents, chacun à son poids habituel', async () => {
    const { baseHWeek, joursSemaine, genCal, isoWeek, poidsJourSemaine } = await import('./calculations.js');
    const a = agenceReference(); genCal(a);
    a.employees = [{ qual: 'DEA', hours: 35, pctRoulant: 100, dateEntree: '2027-03-17' }]; // mercredi
    const w = isoWeek(new Date(2027, 2, 17));
    expect(joursSemaine(a, w).length).toBe(7);
    const j = joursSemaine(a, w), p = j.map((d) => poidsJourSemaine(a, d)), tot = p.reduce((x, v) => x + v, 0);
    const attendu = 35 * j.reduce((x, d, i) => (d.day >= 17 ? x + p[i] : x), 0) / tot; // mercredi → dimanche
    expect(baseHWeek(a, w)).toBeCloseTo(attendu, 6);
    expect(attendu).toBeLessThan(35 * 5 / 7); // lundi et mardi pèsent plus qu'un jour de week-end
    expect(baseHWeek(a, w + 1)).toBe(35);
    expect(baseHWeek(a, w - 1)).toBe(0);
  });
  it('maladie d\'une semaine à cheval : moyenne des deux mois pondérée par le poids des jours', async () => {
    const { pres, moisDeSemaine, needWeeks, joursSemaine, poidsJourSemaine } = await import('./calculations.js');
    const a = prete(); a.sick = Array(12).fill(0); a.sick[2] = 14; // mars 14 %, avril 0 %
    const w = needWeeks(a).map((x) => x.week).find((k) => { const ms = moisDeSemaine(a, k); return ms[0] === 2 && ms[1] === 3; });
    const j = joursSemaine(a, w), p = j.map((d) => poidsJourSemaine(a, d)), tot = p.reduce((x, v) => x + v, 0);
    const pMars = j.reduce((x, d, i) => (d.month === 2 ? x + p[i] : x), 0) / tot;
    expect(pres(a, w).rate).toBeCloseTo(14 * pMars, 6);
  });
  it('HS des 12 mois = HS de l\'année (semaines à cheval non comptées deux fois)', async () => {
    const { hsTot, partSemaineMois } = await import('./calculations.js');
    const { etatMois } = await import('./presenceMois.js');
    const a = prete(); a.targetTXR = 30; a.presence = {};
    const tot = hsTot(a).hs; expect(tot).toBeGreaterThan(0);
    let s = 0; for (let m = 0; m < 12; m++) s += etatMois(a, m).hsM;
    expect(s).toBeCloseTo(tot, 3);
    expect(partSemaineMois(a, 13, 2) + partSemaineMois(a, 13, 3)).toBeCloseTo(1, 9);
  });
});

describe('Masse salariale mensuelle — salaires mensualisés, variables par période de paie', () => {
  const agence = async () => {
    const R = await import('./calculations.js');
    const a = prete(); a.periodesPaie = R.buildPeriodesPaie(); a.costHour = 30; a.sick = Array(12).fill(5); a.ratioMaintien = 50;
    return { a, R };
  };
  it('salaire de base identique chaque mois (35 h × 52/12 × taux), 4 ou 5 semaines', async () => {
    const { a, R } = await agence(); a.employees = [{ qual: 'DEA', contract: 'CDI', hours: 35, pctRoulant: 100 }];
    for (let m = 0; m < 5; m++) expect(R.msRoulantBaseMois(a, m)).toBeCloseTo(35 * 52 / 12 * 30, 6);
  });
  it('entrée le 16 mars : moitié environ du salaire de mars, rien avant', async () => {
    const { a, R } = await agence(); a.employees = [{ qual: 'DEA', contract: 'CDI', hours: 35, pctRoulant: 100, dateEntree: '2027-03-16' }];
    expect(R.msRoulantBaseMois(a, 1)).toBe(0);
    expect(R.msRoulantBaseMois(a, 2)).toBeCloseTo(35 * 52 / 12 * 30 * 16 / 31, 6);
  });
  it('sans HS, un mois à 5 semaines ne coûte pas plus en salaire de base ; le lissage s\'annule sur l\'année', async () => {
    const { a, R } = await agence(); a.targetTXR = 100000; a.presence = {}; a.sick = Array(12).fill(0);
    const avr = R.payrollPayMonth(a, 3), mai = R.payrollPayMonth(a, 4);
    expect(Math.abs(avr - mai) / mai).toBeLessThan(0.03);
    let l = 0; for (let m = 0; m < 12; m++) l += R.lissage5eSemaine(a, m);
    expect(l).toBeCloseTo(0, 6);
  });
  it('maladie non maintenue retenue sur la période ; janvier sans salaire de décembre 2026', async () => {
    const { a, R } = await agence(); a.targetTXR = 100000; a.presence = {};
    a.sick = Array(12).fill(0); const sans = R.payrollPayMonth(a, 1);
    a.sick = Array(12).fill(10); const avec = R.payrollPayMonth(a, 1);
    expect(avec).toBeLessThan(sans);
    a.sick = Array(12).fill(0);
    expect(R.baseDec2026(a)).toBeGreaterThan(0); // l'ancien calcul l'ajoutait à janvier
    expect(Math.abs(R.payrollPayMonth(a, 0) - R.payrollPayMonth(a, 1)) / R.payrollPayMonth(a, 1)).toBeLessThan(0.01);
  });
});
