import { describe, it, expect } from 'vitest';
import { agency, genCal } from './calculations.js';
import { cibleDuplication, agenceDeVersion, copieVersion, comparerVersions, ecartAbsenteisme, donneesSoumission, refusAAfficher, estModifiable, recapBudget, versionRemplie } from './versions.js';

const base = () => { const a = agency('NANTES'); a.histCA = 4000000; a.histTXR2026 = 88; a.targetTXR = 88; genCal(a); return a; };

describe('Versions V1/V2/V3', () => {
  it('trouve la première version libre pour une duplication', () => {
    expect(cibleDuplication({ versions: { v1: { x: 1 } } }, 'v1')).toBe('v2');
    expect(cibleDuplication({ versions: { v1: { x: 1 }, v2: { x: 1 } } }, 'v2')).toBe('v3');
    expect(cibleDuplication({ versions: { v1: { x: 1 }, v2: {}, v3: { x: 1 } } }, 'v1')).toBe('v2');
    expect(cibleDuplication({ versions: { v1: { x: 1 }, v2: { x: 1 }, v3: { x: 1 } } }, 'v1')).toBeNull();
  });

  it('une version vide repart d\'une agence vierge avec les historiques de la V1', () => {
    const data = { versions: { v1: { ...base(), targetCA: 5000000 } } };
    const v2 = agenceDeVersion('NANTES', data, 'v2');
    expect(v2.targetCA).toBeNull();
    expect(v2.histCA).toBe(4000000);
    expect(v2.targetTXR).toBe(88);
    expect(versionRemplie(data, 'v2')).toBe(false);
    const v1 = agenceDeVersion('NANTES', data, 'v1');
    expect(v1.targetCA).toBe(5000000);
  });

  it('la copie de version est indépendante de l\'original', () => {
    const a = base(); a.employees = [{ name: 'A', qual: 'DEA', hours: 35 }];
    const c = copieVersion(a);
    c.employees[0].hours = 20;
    expect(a.employees[0].hours).toBe(35);
  });

  it('compare les versions remplies, la version active prise en mémoire', () => {
    const a1 = base(); a1.targetCA = 1;
    const a2 = base(); a2.employees = [{ name: 'A', qual: 'DEA', hours: 35, pctRoulant: 100 }];
    const data = { versions: { v1: a1, v2: a2 }, meta: { submittedVersion: 'v2', descriptions: { v1: 'base', v2: 'renfort' } } };
    const enMemoire = { ...a1, employees: [{ name: 'B', qual: 'DEA', hours: 35, pctRoulant: 100 }, { name: 'C', qual: 'AA', hours: 35, pctRoulant: 100 }] };
    const cols = comparerVersions('NANTES', data, 'v1', enMemoire);
    expect(cols.map((c) => c.v)).toEqual(['v1', 'v2']);
    expect(cols[0].nbSal).toBe(2);
    expect(cols[1].nbSal).toBe(1);
    expect(cols[1].submitted).toBe(true);
    expect(cols[1].desc).toBe('renfort');
  });
});

describe('Soumission', () => {
  it('statuts modifiables', () => {
    expect(['brouillon', 'refuse_dr', 'complement_df'].every(estModifiable)).toBe(true);
    expect(['soumis_dr', 'soumis', 'valide_pdg'].some(estModifiable)).toBe(false);
  });

  it('alerte douce si l\'absentéisme moyen s\'écarte de la référence CG', () => {
    expect(ecartAbsenteisme({ sick: Array(12).fill(8), targetAbsRate: 8 })).toBeNull();
    expect(ecartAbsenteisme({ sick: [6, 6, null], targetAbsRate: 8 })).toEqual({ moyenne: 6, cible: 8 });
    expect(ecartAbsenteisme({ sick: Array(12).fill(null), targetAbsRate: 8 })).toBeNull();
  });

  it('démarre un nouveau cycle en conservant l\'historique des refus', () => {
    const avant = { versions: { v1: {} }, meta: { activeVersion: 'v1' }, validation: { historique: [{ type: 'refus', role: 'cg', date: '2026-11-01T10:00:00Z', commentaire: 'à revoir' }] } };
    const d = donneesSoumission(avant, 'v2', 'REX SG', '2026-11-03T10:00:00Z');
    expect(d.meta.submittedVersion).toBe('v2');
    expect(d.validation.etage).toBe(1);
    expect(d.validation.statut).toBe('en_cours');
    expect(d.validation.historique.map((h) => h.type)).toEqual(['refus', 'resoumission']);
    expect(avant.validation.historique.length).toBe(1);
  });

  it('montre le dernier refus seulement s\'il suit la dernière resoumission', () => {
    const refus = { type: 'refus', role: 'cg', date: '2026-11-02T10:00:00Z', commentaire: 'x' };
    expect(refusAAfficher({ historique: [refus] })).toBe(refus);
    expect(refusAAfficher({ historique: [refus, { type: 'resoumission', date: '2026-11-03T10:00:00Z' }] })).toBeNull();
    expect(refusAAfficher(null)).toBeNull();
  });

  it('récapitulatif de fin de parcours', () => {
    const a = base(); a.employees = [{ name: 'A', qual: 'DEA', hours: 35, pctRoulant: 100 }];
    const r = recapBudget(a);
    expect(r.etp).toBeCloseTo(1, 5);
    expect(r.semaines).toBeGreaterThan(50);
  });
});
