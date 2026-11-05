import { describe, it, expect } from 'vitest';
import { FAQ, FAQ_CG_SECTIONS, AIDE_ONGLET_Q, faqKeyForRole } from './faq.js';

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
    expect(FAQ.rex).toHaveLength(30); // parcours des profils (nov. 2026) : + versions, autres absences, calendrier, résultat d'exploitation, charges, masse salariale
    expect(FAQ.cg).toHaveLength(32); // + réimport du registre, calendrier scolaire, structures, IS et participation
    expect(FAQ.valideur).toHaveLength(17); // + consolidation, agences non rattachées, résultat net, écrans du DF
    expect(FAQ.admin).toHaveLength(7);
    expect(FAQ.commun).toHaveLength(3); // mot de passe, statuts, contacts
  });

  it('chaque pastille « ? » mène à une question existante', () => {
    for (const [cle, map] of Object.entries(AIDE_ONGLET_Q)) {
      const questions = (cle === 'valideur' ? FAQ.valideur.concat(FAQ_CG_SECTIONS.find((s) => s.t.includes('Suivre le réseau')).items) : FAQ[cle]).map((qa) => qa[0]);
      for (const [onglet, texte] of Object.entries(map)) {
        expect(questions.some((q) => q.includes(texte)), cle + ' / ' + onglet + ' → ' + texte).toBe(true);
      }
    }
  });
});
