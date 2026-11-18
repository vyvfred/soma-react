import { describe, it, expect } from 'vitest';
import { suiviAgencesRex, jalonsAvancement, ilYALisible } from './suiviRex.js';
import { avancementBudget } from './avancement.js';

const now = Date.parse('2026-11-18T12:00:00Z');
const jour = 86400000;

describe('suivi des REX', () => {
  it('jalons : six étapes en pourcentage', () => {
    const j = jalonsAvancement({ objectif: true, refsPct: 50, nbSalaries: 12, absSaisis: 6, moisValides: 3, chargesREX: 6 });
    expect(j.map((x) => x.pct)).toEqual([100, 50, 100, 50, 25, 100]);
    expect(j.map((x) => x.lib)).toEqual(['Objectif', 'Références CA', 'Équipe', 'Absentéisme', 'Mois validés', 'Charges']);
  });

  it('états, relances et tri : à relancer d\'abord', () => {
    const budgets = {
      A: { statut: 'brouillon', data: { targetCA: 1, targetTXR: 50, employees: [{}] }, updated_at: new Date(now - 10 * jour).toISOString() },
      B: { statut: 'brouillon', data: { targetCA: 1, targetTXR: 50, employees: [{}] }, updated_at: new Date(now - 1 * jour).toISOString() },
      C: { statut: 'soumis_dr', data: { targetCA: 1, targetTXR: 50 }, updated_at: new Date(now).toISOString() },
      E: { statut: 'valide_pdg', data: {}, updated_at: null }
    };
    const rex = [
      { nom: 'Rex A', agence: 'A', derniere_activite: new Date(now - 10 * jour).toISOString() },
      { nom: 'Rex B', agence: 'B', derniere_activite: new Date(now - 1 * jour).toISOString() },
      { nom: 'Rex D', agence: 'D', derniere_activite: null },
      { nom: 'Rex C', agence: 'X', agences_supp: ['C'], derniere_activite: new Date(now).toISOString() }
    ];
    const r = suiviAgencesRex(['A', 'B', 'C', 'D', 'E'], budgets, rex, avancementBudget, now);
    const par = Object.fromEntries(r.lignes.map((l) => [l.agence, l]));
    expect(par.A.etat).toBe('en_cours');
    expect(par.A.motifs).toEqual(['aucune modification depuis 10 jours']);
    expect(par.B.aRelancer).toBe(false);
    expect(par.C.etat).toBe('soumis');
    expect(par.C.rex[0].principale).toBe(false);
    expect(par.D.etat).toBe('non_commence');
    expect(par.D.motifs).toEqual(['REX jamais connecté', 'budget non commencé']);
    expect(par.E.etat).toBe('valide');
    expect(r.lignes.slice(0, 2).map((l) => l.agence)).toEqual(['D', 'A']);
    expect(r.kpi).toMatchObject({ total: 5, nonCommences: 1, enCours: 2, soumis: 1, valides: 1, aRelancer: 2 });
  });

  it('dernière activité lisible', () => {
    expect(ilYALisible(null)).toBe('jamais');
    expect(ilYALisible(0)).toBe("aujourd'hui");
    expect(ilYALisible(1)).toBe('hier');
    expect(ilYALisible(4)).toBe('il y a 4 jours');
  });
});
