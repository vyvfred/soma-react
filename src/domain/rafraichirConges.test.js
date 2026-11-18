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
    let av = etatConges(a); a.sick = a.sick.map(() => 10);
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
