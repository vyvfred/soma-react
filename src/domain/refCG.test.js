import { describe, it, expect } from 'vitest';
import { fusionnerRefCG, appliquerRefCG, pickRefCG, alertesParametrage } from './refCG.js';
import { parseBudgetRow, agencyFromRow, buildBudgetData } from './budgetMapper.js';
import { agency } from './calculations.js';

// Données de référence CG : elles doivent atterrir dans la version que lit le REX.
const versionne = () => ({
  versions: { v1: { name: 'SGCV', targetAbsRate: 8, employees: [1, 2] }, v2: { name: 'SGCV', targetAbsRate: 9 } },
  meta: { activeVersion: 'v1' },
  validation: { etage: 2, statut: 'en_cours', historique: [{ refus: 'motif' }] }
});

describe('fusionnerRefCG — enregistrement des Données agences', () => {
  it('écrit dans chaque version, rien au premier niveau', () => {
    const out = fusionnerRefCG(versionne(), { histCA2025: 4050000, tauxHoraireBrutJuin: 20.35 });
    expect(Object.keys(out).sort()).toEqual(['meta', 'validation', 'versions']);
    expect(out.versions.v1.histCA2025).toBe(4050000);
    expect(out.versions.v2.tauxHoraireBrutJuin).toBe(20.35);
    expect(out.versions.v1.employees).toEqual([1, 2]); // le travail du REX est intact
  });
  it('conserve l\'état de validation (décisions et historique des refus)', () => {
    const out = fusionnerRefCG(versionne(), { histCA: 1 });
    expect(out.validation.historique[0].refus).toBe('motif');
  });
  it('récupère les références laissées au premier niveau par d\'anciennes sauvegardes', () => {
    const d = { ...versionne(), histTXR2026: 92, msNRBrutMensuel: 6800 };
    const out = fusionnerRefCG(d, {});
    expect(out.versions.v1.histTXR2026).toBe(92);
    expect(out.versions.v1.msNRBrutMensuel).toBe(6800);
    expect(out.histTXR2026).toBeUndefined();
  });
  it('budget au format ancien (plat) : fusion à plat', () => {
    const out = fusionnerRefCG({ histCA: 3 }, { histCA2025: 2 });
    expect(out).toMatchObject({ histCA: 3, histCA2025: 2, cgLocked: true });
  });
});

describe('appliquerRefCG — verrou REX et coût horaire', () => {
  it('recalcule le coût horaire quand brut et charges sont connus', () => {
    expect(appliquerRefCG({ tauxChargePatronal: 42 }, { tauxHoraireBrut: 20.07 }).costHour).toBe(28.5);
  });
  it('le seul ratio réseau ou les variables de décembre ne verrouillent pas le REX', () => {
    expect(appliquerRefCG({}, { ratioMaintien: 50 }).cgLocked).toBeUndefined();
    expect(appliquerRefCG({}, { variablesDec2026Detail: { hs25: 1 }, variablesDec2026: 1 }).cgLocked).toBeUndefined();
    expect(appliquerRefCG({}, { histTXR2026: 92 }).cgLocked).toBe(true);
  });
  it('pickRefCG ne garde que les champs CG', () => {
    expect(pickRefCG({ histCA: 1, employees: [], ratioMaintien: 50 })).toEqual({ histCA: 1, ratioMaintien: 50 });
  });
});

describe('chargement et sauvegarde du budget', () => {
  it('le REX voit les références restées au premier niveau', () => {
    const row = { id: 'b1', agence: 'SGCV', statut: 'brouillon', data: { ...versionne(), tauxHoraireBrutJuin: 20.35 } };
    expect(parseBudgetRow(row).versionData.tauxHoraireBrutJuin).toBe(20.35);
    expect(agencyFromRow(row).tauxHoraireBrutJuin).toBe(20.35);
  });
  it('la sauvegarde du REX conserve data.validation', () => {
    const out = buildBudgetData(versionne(), 'v1', { activeVersion: 'v1' }, agency('SGCV'));
    expect(out.validation.historique).toHaveLength(1);
  });
});

describe('alertes de paramétrage (écran Contrôles)', () => {
  it('signale ligne non-roulante, ratio et taux de juin manquants', () => {
    const a = { ...agency('X'), costHour: 28.5 };
    expect(alertesParametrage(a).map((x) => x.t)).toEqual(['warn', 'info', 'info']);
    Object.assign(a, { msNRBrutMensuel: 6800, ratioMaintien: 50, tauxHoraireBrutJuin: 20.35, tauxChargePatronal: 42 });
    expect(alertesParametrage(a)).toEqual([]);
  });
});
