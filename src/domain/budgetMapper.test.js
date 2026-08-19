import { describe, it, expect } from 'vitest';
import { parseBudgetRow, agencyFromRow, buildBudgetData, migrateAgency } from './budgetMapper.js';
import { agency } from './calculations.js';

describe('parseBudgetRow — détection versionné / plat', () => {
  it('structure versionnée : lit meta, version active et données de version', () => {
    const row = {
      id: 'b1', statut: 'brouillon', agence: 'SGCV',
      data: {
        meta: { activeVersion: 'v2', submittedVersion: null, descriptions: { v1: 'a', v2: 'b', v3: '' } },
        versions: { v1: { costHour: 20 }, v2: { costHour: 30 } },
        validation: { step: 'dr' }
      }
    };
    const p = parseBudgetRow(row);
    expect(p.budgetId).toBe('b1');
    expect(p.activeVersion).toBe('v2');
    expect(p.versionData.costHour).toBe(30);
    expect(p.validation).toEqual({ step: 'dr' });
  });

  it('structure versionnée sans version active connue : repli sur v1', () => {
    const row = { id: 'b2', statut: 'brouillon', agence: 'X', data: { meta: { activeVersion: 'v3' }, versions: { v1: { costHour: 11 } } } };
    expect(parseBudgetRow(row).versionData.costHour).toBe(11);
  });

  it('ancien format plat : les données sont la version, meta par défaut', () => {
    const row = { id: 'b3', statut: 'brouillon', agence: 'Y', data: { costHour: 42, targetCA: 1000 } };
    const p = parseBudgetRow(row);
    expect(p.activeVersion).toBe('v1');
    expect(p.versionData.costHour).toBe(42);
    expect(p.meta.descriptions).toEqual({ v1: '', v2: '', v3: '' });
  });
});

describe('agencyFromRow — reconstruction de l’objet agence', () => {
  it('part des valeurs de fabrique et superpose la version sauvegardée', () => {
    const row = { id: 'b1', statut: 'brouillon', agence: 'SGCV', data: { versions: { v1: { costHour: 33, targetCA: 900000 } }, meta: { activeVersion: 'v1' } } };
    const a = agencyFromRow(row);
    expect(a.name).toBe('SGCV');
    expect(a.costHour).toBe(33);      // vient de la version
    expect(a.targetCA).toBe(900000);  // vient de la version
    expect(a.hsCostRate).toBe(1.25);  // valeur de fabrique conservée
    expect(Array.isArray(a.hs50)).toBe(true); // migration appliquée
  });

  it('budget vide : pré-remplit les références CG (histTXR2026 → targetTXR)', () => {
    // Branche « pré-remplissage » : la version active est vide, les références
    // sont au niveau racine du jsonb (cas d'un budget créé par le CG, pas encore construit).
    const row = { id: 'b9', statut: 'brouillon', agence: 'Z', data: { versions: { v1: {} }, meta: { activeVersion: 'v1' }, histTXR2026: 260, targetAbsRate: 7 } };
    const a = agencyFromRow(row);
    expect(a.targetTXR).toBe(260);
    expect(a.histTXR).toBe(260);
    expect(a.sick.every((s) => s === 7)).toBe(true);
  });
});

describe('buildBudgetData — sérialisation pour la sauvegarde', () => {
  it('écrit la version active sans embarquer versions/meta dans l’agence', () => {
    const a = { ...agency('SGCV'), costHour: 28.5, versions: { v1: {} }, meta: { activeVersion: 'v1' } };
    const data = buildBudgetData(null, 'v1', { activeVersion: 'v1' }, a);
    expect(data.versions.v1.costHour).toBe(28.5);
    expect(data.versions.v1.versions).toBeUndefined();
    expect(data.versions.v1.meta).toBeUndefined();
  });

  it('préserve les autres versions déjà stockées', () => {
    const existing = { versions: { v1: { costHour: 10 }, v2: { costHour: 20 } }, meta: {} };
    const a = { ...agency('SGCV'), costHour: 99 };
    const data = buildBudgetData(existing, 'v1', { activeVersion: 'v1' }, a);
    expect(data.versions.v1.costHour).toBe(99); // écrasée
    expect(data.versions.v2.costHour).toBe(20); // préservée
  });

  it('aller-retour : agence → data → row → agence conserve les champs clés', () => {
    const src = { ...agency('SGCV'), costHour: 31, targetCA: 950000, targetTXR: 250 };
    const data = buildBudgetData(null, 'v1', { activeVersion: 'v1' }, src);
    const back = agencyFromRow({ id: 'b', statut: 'brouillon', agence: 'SGCV', data });
    expect(back.costHour).toBe(31);
    expect(back.targetCA).toBe(950000);
    expect(back.targetTXR).toBe(250);
  });
});

describe('migrateAgency — comblement des anciens budgets', () => {
  it('complète les champs manquants d’une agence minimale', () => {
    const a = { name: 'legacy', employees: [{ qual: 'DEA', hours: 35 }] };
    migrateAgency(a);
    expect(Array.isArray(a.hs50)).toBe(true);
    expect(a.hs50).toHaveLength(12);
    expect(Array.isArray(a.periodesPaie)).toBe(true);
    expect(a.drCostAnnual).toBe(0);
    expect(a.employees[0].pctRoulant).toBe(100); // valeur par défaut injectée
    expect(a.rex && typeof a.rex).toBe('object'); // lignes de compte de résultat créées
  });
});
