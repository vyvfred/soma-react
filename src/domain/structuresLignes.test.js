import { describe, it, expect } from 'vitest';
import { agency, monthCA, annualCA, payrollMonth, ann, totalLignesMois, ligneStructureVide, estStructure } from './calculations.js';

describe('Structures : CA et masse salariale en lignes nommées (nov. 2026)', () => {
  const siege = () => { const a = agency('SIEGE'); a.rex = a.rex || {}; return a; };
  it('plusieurs sources de CA additionnées mois par mois', () => {
    const a = siege();
    const l1 = ligneStructureVide('Refacturation agences'), l2 = ligneStructureVide('Formations');
    l1.valeurs = Array(12).fill(10000); l2.valeurs[0] = 2500;
    a.lignesCA = [l1, l2];
    expect(estStructure(a)).toBe(true);
    expect(monthCA(a, 0)).toBe(12500);
    expect(monthCA(a, 1)).toBe(10000);
    expect(annualCA(a)).toBe(122500);
  });
  it('plusieurs lignes de masse salariale = charges de personnel du compte de résultat', () => {
    const a = siege();
    const d = ligneStructureVide('Direction'), c = ligneStructureVide('Comptabilité');
    d.valeurs = Array(12).fill(20000); c.valeurs = Array(12).fill(null); c.valeurs[11] = 5000;
    a.lignesMS = [d, c];
    expect(payrollMonth(a, 0)).toBe(20000);
    expect(payrollMonth(a, 11)).toBe(25000);
    expect(ann(a, 'Charges de personnel')).toBe(245000);
    expect(totalLignesMois(a, 'lignesMS', 11)).toBe(25000);
  });
  it('sans ligne : ancienne saisie par poste conservée', () => {
    const a = siege(); a.rex["Chiffre d'affaires"] = { mode: 'annual', annual: 120000 };
    expect(monthCA(a, 3)).toBe(10000);
  });
});
