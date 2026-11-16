import { describe, it, expect } from 'vitest';
import { appliquerRefCG } from './refCG.js';
import { migrateAgency } from './budgetMapper.js';
import { agency } from './calculations.js';

// Signalement nov. 2026 : TXR de référence 2026 saisis par le CG, absents de l'écran Objectif du REX
describe('TXR de référence 2026 du CG', () => {
  it('budget créé avant la saisie du CG : repris à l\'ouverture dans les champs vides', () => {
    const a = { ...agency('NANTES'), histTXR2026: 43, histTXR: null, targetTXR: null };
    migrateAgency(a);
    expect(a.histTXR).toBe(43);
    expect(a.targetTXR).toBe(43);
  });
  it('une cible déjà fixée par le REX est conservée', () => {
    const a = { ...agency('THYEZ'), histTXR2026: 47.3, histTXR: null, targetTXR: 47 };
    migrateAgency(a);
    expect(a.histTXR).toBe(47.3);
    expect(a.targetTXR).toBe(47);
  });
  it('le CG corrige sa référence : suit tant que le REX n\'a rien changé', () => {
    const v = { histTXR2026: 40, histTXR: 40, targetTXR: 42 };
    appliquerRefCG(v, { histTXR2026: 41 });
    expect(v.histTXR).toBe(41);
    expect(v.targetTXR).toBe(42);
  });
});
