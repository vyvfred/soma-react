import { describe, it, expect } from 'vitest';
import {
  newValidation, ensureValidation, appliquerDecision, etageComplet,
  validateursEtage, enAttenteDe, decisionLabel
} from './validationEngine.js';

describe('moteur de validation — structure', () => {
  it('newValidation démarre à l’étage 1, en cours', () => {
    const v = newValidation();
    expect(v.etage).toBe(1);
    expect(v.statut).toBe('en_cours');
  });

  it('ensureValidation répare une structure incomplète', () => {
    const v = ensureValidation({});
    expect(v.etage).toBe(1);
    expect(v.decisions).toHaveProperty('dr');
    expect(v.historique).toEqual([]);
  });

  it('validateursEtage renvoie les rôles attendus par étage', () => {
    expect(validateursEtage(1)).toEqual(['dr']);
    expect(validateursEtage(2)).toEqual(['cg', 'df']);
    expect(validateursEtage(3)).toEqual(['dg', 'pdg']);
  });
});

describe('moteur de validation — transitions', () => {
  it('commentaire obligatoire', () => {
    const r = appliquerDecision(newValidation(), 'dr', 'valide', '  ', 'DR');
    expect(r.ok).toBe(false);
  });

  it('un rôle non attendu à l’étage courant est refusé', () => {
    const r = appliquerDecision(newValidation(), 'cg', 'valide', 'ok', 'CG'); // étage 1 = DR
    expect(r.ok).toBe(false);
  });

  it('étage 1 (DR seul) : la validation fait passer à l’étage 2', () => {
    const r = appliquerDecision(newValidation(), 'dr', 'valide', 'RAS', 'DR');
    expect(r.ok).toBe(true);
    expect(r.etageSuivant).toBe(2);
    expect(r.validation.etage).toBe(2);
  });

  it('étage 2 (CG + DF) : une seule validation ne suffit pas', () => {
    let v = appliquerDecision(newValidation(), 'dr', 'valide', 'ok', 'DR').validation;
    const r = appliquerDecision(v, 'cg', 'valide', 'ok', 'CG');
    expect(r.ok).toBe(true);
    expect(r.etageSuivant).toBeUndefined(); // en attente de DF
    expect(r.validation.etage).toBe(2);
  });

  it('étage 2 complet (CG + DF) → passage à l’étage 3', () => {
    let v = appliquerDecision(newValidation(), 'dr', 'valide', 'ok', 'DR').validation;
    v = appliquerDecision(v, 'cg', 'valide', 'ok', 'CG').validation;
    const r = appliquerDecision(v, 'df', 'valide', 'ok', 'DF');
    expect(r.etageSuivant).toBe(3);
  });

  it('validation finale à l’étage 3 (DG + PDG) → budget définitivement validé', () => {
    let v = appliquerDecision(newValidation(), 'dr', 'valide', 'ok', 'DR').validation;
    v = appliquerDecision(v, 'cg', 'valide', 'ok', 'CG').validation;
    v = appliquerDecision(v, 'df', 'valide', 'ok', 'DF').validation;
    const partiel = appliquerDecision(v, 'dg', 'valide', 'ok', 'DG');
    expect(partiel.definitif).toBeUndefined(); // en attente de PDG
    const r = appliquerDecision(partiel.validation, 'pdg', 'valide', 'ok', 'PDG');
    expect(r.definitif).toBe(true);
    expect(r.validation.statut).toBe('valide');
  });

  it('un refus renvoie au REX et réinitialise les décisions', () => {
    let v = appliquerDecision(newValidation(), 'dr', 'valide', 'ok', 'DR').validation;
    v = appliquerDecision(v, 'cg', 'valide', 'ok', 'CG').validation;
    const r = appliquerDecision(v, 'df', 'refuse', 'CA irréaliste', 'DF');
    expect(r.refus).toBe(true);
    expect(r.validation.statut).toBe('refuse');
    expect(r.validation.etage).toBe(1);
    expect(r.validation.decisions.dr).toBeNull();
    expect(r.validation.historique.some((h) => h.type === 'refus')).toBe(true);
  });
});

describe('enAttenteDe', () => {
  it('vrai pour le DR sur une validation neuve', () => {
    expect(enAttenteDe(newValidation(), 'dr')).toBe(true);
  });
  it('faux une fois que le DR a validé', () => {
    const v = appliquerDecision(newValidation(), 'dr', 'valide', 'ok', 'DR').validation;
    expect(enAttenteDe(v, 'dr')).toBe(false);
  });
});

describe('decisionLabel', () => {
  it('libellés lisibles', () => {
    expect(decisionLabel('valide')).toBe('Validé');
    expect(decisionLabel('refuse')).toBe('Refusé');
    expect(decisionLabel('complement')).toBe('Complément demandé');
  });
});
