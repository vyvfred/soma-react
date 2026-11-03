import { describe, it, expect } from 'vitest';
import { agency, genCal, cpGeneres } from './calculations.js';
import {
  progressionMois, etatMois, semainesMois, impactMois, verrouillerMois, deverrouillerMois,
  reinitialiserCP, setPresenceSemaine, setMontantSemaine, indemnites, hsImproductives, moyenneHS50
} from './presenceMois.js';
import { coherenceCapacite } from './objectifInsight.js';
import { parseEquipe } from './imports.js';
import { etpParMois } from './teamInsight.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

const base = () => { const a = agenceReference(); a.targetAbsRate = 6; genCal(a); return a; };

describe('Présence mois par mois', () => {
  it('donne l\'état de chaque mois et le détail de ses semaines', () => {
    const a = base();
    const e = etatMois(a, 0);
    expect(e.nom).toBe('Jan');
    expect(e.caM).toBeGreaterThan(0);
    expect(['Validé', 'À équilibrer', 'À valider']).toContain(e.etat);
    const sem = semainesMois(a, 0);
    expect(sem.length).toBeGreaterThanOrEqual(4);
    expect(sem[0]).toHaveProperty('impactNiveau');
    const imp = impactMois(a, 0);
    expect(imp.msMois).toBeGreaterThan(0);
  });

  it('valider un mois le fige et relance la répartition des CP sur les autres', () => {
    const a = base();
    const msg = verrouillerMois(a, 2);
    expect(msg).toMatch(/Premier mois/);
    expect(a.moisVerrouilles).toEqual([2]);
    expect(etatMois(a, 2).etat).toBe('Validé');
    expect(progressionMois(a).nbVerrouilles).toBe(1);
    deverrouillerMois(a, 2);
    expect(a.moisVerrouilles).toEqual([]);
    expect(a.moisActif).toBe(2);
  });

  it('saisie des CP par semaine et remise à zéro', () => {
    const a = base();
    const w = a.cal[10].week;
    setPresenceSemaine(a, w, 'cp', '3');
    expect(a.presence[w].cp).toBe(3);
    setPresenceSemaine(a, w, 'other', '');
    expect(a.presence[w].other).toBe(0);
    reinitialiserCP(a);
    expect(a.presence[w].cp).toBe(0);
    expect(progressionMois(a).cpLibres).toBeCloseTo(cpGeneres(a), 1);
  });

  it('indemnités et HS des improductifs : saisie, suppression, totaux', () => {
    const a = base();
    const w = a.cal[10].week;
    setMontantSemaine(a, 'repasRoulant', w, '120');
    setMontantSemaine(a, 'idjfNonRoulant', w, 30);
    expect(indemnites(a).tot).toMatchObject({ repas: 120, idjf: 30, total: 150 });
    setMontantSemaine(a, 'repasRoulant', w, '0');
    expect(a.repasRoulant[w]).toBeUndefined();
    setMontantSemaine(a, 'hsImproductif', w, 4);
    const h = hsImproductives(a);
    expect(h.totalHS).toBe(4);
    expect(h.lignes.find((l) => l.week === w).hs).toBe(4);
  });

  it('moyenne de la part des HS à +50 %', () => {
    expect(moyenneHS50({ hs50: [null, 10, 20] })).toBe(15);
    expect(moyenneHS50({ hs50: Array(12).fill(null) })).toBe(0);
  });
});

describe('Lot 2 — Objectif et Équipe', () => {
  it('cohérence capacité : niveau et CA max', () => {
    const a = base();
    const c = coherenceCapacite(a);
    expect(c).not.toBeNull();
    expect(['critique', 'tendu', 'coherent', 'confortable']).toContain(c.niveau);
    expect(c.caMaxAvecHS20).toBeGreaterThan(c.caMaxSansHS);
    expect(coherenceCapacite(agency('X'))).toBeNull();
  });

  it('import d\'équipe depuis un tableau Excel', () => {
    const rows = [
      ['Nom', 'Qualification', 'Heures', 'Contrat'],
      ['Dupont', 'DEA', 35, 'CDI'],
      ['Martin', 'AA', 28, 'CDD'],
      ['', '', '', '']
    ];
    const r = parseEquipe(rows);
    const emps = r.employees || r;
    expect(emps.length).toBe(2);
    expect(emps[0].name).toMatch(/Dupont/);
  });

  it('évolution de l\'effectif : null sans mouvement', () => {
    expect(etpParMois(base())).toBeNull();
  });
});
