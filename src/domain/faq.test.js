import { describe, it, expect } from 'vitest';
import { FAQ, faqKeyForRole } from './faq.js';

describe('FAQ — mapping des rôles', () => {
  it('associe chaque rôle à la bonne clé FAQ', () => {
    expect(faqKeyForRole('rex')).toBe('rex');
    expect(faqKeyForRole('cg')).toBe('cg');
    expect(faqKeyForRole('admin')).toBe('admin');
    ['dr', 'df', 'dg', 'pdg'].forEach((r) => expect(faqKeyForRole(r)).toBe('valideur'));
    expect(faqKeyForRole('inconnu')).toBe('rex'); // repli
  });
});

describe('FAQ — intégrité des données', () => {
  it('chaque entrée est une paire [question, réponse] non vide', () => {
    for (const key of ['rex', 'cg', 'valideur', 'admin']) {
      expect(Array.isArray(FAQ[key])).toBe(true);
      expect(FAQ[key].length).toBeGreaterThan(0);
      for (const qa of FAQ[key]) {
        expect(typeof qa[0]).toBe('string');
        expect(qa[0].length).toBeGreaterThan(0);
        expect(typeof qa[1]).toBe('string');
        expect(qa[1].length).toBeGreaterThan(0);
      }
    }
  });

  it('effectifs de questions attendus par profil', () => {
    expect(FAQ.rex).toHaveLength(24); // + coût d'une HS, taux de juin, arrêts maladie, CDD
    expect(FAQ.cg).toHaveLength(27); // FAQ CG par étapes du parcours
    expect(FAQ.valideur).toHaveLength(12);
    expect(FAQ.admin).toHaveLength(7);
  });
});
