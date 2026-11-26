import { describe, it, expect } from 'vitest';
import { classeurBudgetAgence, nomFichierBudgetAgence, col } from './exportAgenceDetail.js';
import { buildPeriodesPaie } from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

function agence() { const a = agenceReference(); a.name = 'CAHORS'; a.periodesPaie = buildPeriodesPaie(); a.costHour = 18; a.rex.Carburant = { mode: 'pct', pct: 4 }; return a; }

describe('Export Excel détaillé d\'une agence', () => {
  it('feuilles attendues, formules et références valides', () => {
    const m = classeurBudgetAgence(agence(), { version: 'V1', statut: 'Brouillon' });
    const noms = m.feuilles.map((f) => f.nom);
    expect(noms).toEqual(['Synthèse', 'Compte de résultat', 'Masse salariale', 'Détail MS', 'Semaines', 'Calendrier', 'Équipe', 'Indemnités', 'Paramètres']);
    const formules = [];
    m.feuilles.forEach((f) => f.lignes.forEach((l) => (l || []).forEach((c) => { if (c && c.f) formules.push(c.f); })));
    expect(formules.length).toBeGreaterThan(1000);
    // toute feuille citée dans une formule existe
    formules.forEach((f) => { (f.match(/'([^']+)'!|([A-Za-zÀ-ÿ]+)!/g) || []).forEach((r) => { const n = r.replace(/!$/, '').replace(/^'|'$/g, ''); expect(noms).toContain(n); }); });
    const cr = m.feuilles.find((f) => f.nom === 'Compte de résultat');
    const carb = cr.lignes.find((l) => l[0] === 'Carburant');
    expect(carb[2].f).toMatch(/^C4\*4\/100$/);
  });
  it('outils', () => {
    expect([col(0), col(25), col(26), col(27)]).toEqual(['A', 'Z', 'AA', 'AB']);
    expect(nomFichierBudgetAgence('SAINT-JEAN DE MONTS')).toMatch(/^SOMA_budget_2027_SAINT_JEAN_DE_MONTS_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
