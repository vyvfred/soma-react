import { describe, it, expect } from 'vitest';
import { CG_PARCOURS, cgEtapeDe, cgEtatReseau, premiereEtapeAFaire } from './cgParcours.js';
import { agency } from './calculations.js';
import { FAQ } from './faq.js';

const ops = [{ nom: 'A' }, { nom: 'B' }];

describe('parcours guidé du CG', () => {
  it('7 étapes, chaque écran du parcours rattaché à une seule étape', () => {
    expect(CG_PARCOURS).toHaveLength(7);
    expect(cgEtapeDe('controle').n).toBe(5);
    expect(cgEtapeDe('graphiques').n).toBe(6);
    expect(cgEtapeDe('aide')).toBeNull();
  });
  it('chaque bouton « Aide détaillée » mène à une question existante de la FAQ CG', () => {
    CG_PARCOURS.forEach((s) => expect(FAQ.cg.some((qa) => qa[0].indexOf(s.aide) >= 0)).toBe(true));
  });
  it('état du réseau : références, ratio, charges, variables, DR, soumissions, attente CG', () => {
    const a = { ...agency('A'), histTXR2026: 92, ratioMaintien: 50, variablesDec2026Detail: { hs25: 100 } };
    a.rex['Assurance'] = { ...a.rex['Assurance'], mode: 'annual', annual: 1000 };
    const rows = [
      { agence: 'A', statut: 'soumis', data: { versions: { v1: a }, meta: { activeVersion: 'v1' }, validation: { etage: 2, statut: 'en_cours', decisions: {} } } },
      { agence: 'B', statut: 'brouillon', data: {} }
    ];
    const e = cgEtatReseau(rows, { A: 'r1', B: null }, [{ id: 'd', region_id: 'r1' }], ops);
    expect(e).toMatchObject({ total: 2, avecRef: 1, ratio: true, avecCharges: 1, avecVarDec: 1, avecDR: 1, soumis: 1, attenteCG: 1 });
    expect(premiereEtapeAFaire(e).n).toBe(1);
  });
  it('un budget jamais soumis n\'est pas « en attente » du CG', () => {
    const e = cgEtatReseau([{ agence: 'A', statut: 'brouillon', data: { versions: { v1: {} } } }], {}, [], ops);
    expect(e.attenteCG).toBe(0);
  });
});
