import { describe, it, expect } from 'vitest';
import { objectifInsight } from './objectifInsight.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

describe('objectifInsight — cas de guidage', () => {
  it('objectif non renseigné : invite à saisir', () => {
    const a = agenceReference();
    a.targetCA = 0; a.targetTXR = 0;
    const r = objectifInsight(a);
    expect(r.banner).toBeNull();
    expect(r.phrase).toMatch(/Renseignez votre objectif/);
  });

  it('objectif posé mais effectif absent : renvoie à l’étape équipe', () => {
    const a = agenceReference();
    a.targetCA = 900000; a.targetTXR = 250; a.employees = [];
    const r = objectifInsight(a);
    expect(r.banner).toBeNull();
    expect(r.phrase).toMatch(/Renseignez votre équipe/);
  });
});

describe('objectifInsight — verdict de tension (seuils 85 / 100 / 115)', () => {
  // Base de capacité de l'agence de référence : baseH = 94 h, sick renseigné.
  function withTarget(caObj) {
    const a = agenceReference();
    a.targetCA = caObj;
    a.targetTXR = 250;
    a.histCA = 0; // neutralise le texte d'évolution
    return objectifInsight(a);
  }

  it('capacité confortable (≤ 85 %) → bandeau ok', () => {
    // caMaxSansHS ≈ 94 * (1 - tauxMal) * 250 * 52. On vise bien en dessous.
    const r = withTarget(500000);
    expect(r.banner.class).toBe('ok');
    expect(r.tauxCharge).toBeLessThanOrEqual(85);
  });

  it('objectif > capacité (> 115 %) → bandeau warn', () => {
    const r = withTarget(3000000);
    expect(r.banner.class).toBe('warn');
    expect(r.tauxCharge).toBeGreaterThan(115);
    expect(r.banner.detail).toMatch(/Capacité sans heures supp/);
  });

  it('le taux de charge = objectif / capacité sans HS × 100', () => {
    const r = withTarget(1000000);
    const attendu = Math.round((1000000 / r.caMaxSansHS) * 100);
    expect(r.tauxCharge).toBe(attendu);
  });
});
