import { describe, it, expect } from 'vitest';
import { reprendreBlocs, alerteRepriseBlocs, motifRefusSuppression, donneesSansVersion, BLOCS_VERSION } from './blocsVersion.js';

const v1 = { employees: [{ qual: 'DEA' }, { qual: 'AA' }], targetCA: 1000, refs: { san: [1] }, sick: [5], presence: { '1': { x: 1 } }, rex: { Carburant: { pct: 5 } }, tauxHoraireBrut: 13.9, periodesPaie: ['p'] };
const v2 = { employees: [{ qual: 'DEA' }], targetCA: 2000, refs: { san: [2] }, sick: [8], presence: {}, rex: { Carburant: { pct: 6 } }, tauxHoraireBrut: 14.5, periodesPaie: ['q'] };

describe('reprise de données entre versions', () => {
  it("reprend seulement l'équipe, en copie indépendante", () => {
    const r = reprendreBlocs(v2, v1, ['equipe']);
    expect(r.employees).toEqual(v1.employees);
    expect(r.employees).not.toBe(v1.employees);
    expect(r.targetCA).toBe(2000);
    expect(r.sick).toEqual([8]);
    r.employees[0].qual = 'X';
    expect(v1.employees[0].qual).toBe('DEA');
    expect(v2.employees).toHaveLength(1);
  });

  it('ne recopie jamais le paramétrage du CG', () => {
    const r = reprendreBlocs(v2, v1, BLOCS_VERSION.map((b) => b.id));
    expect(r.tauxHoraireBrut).toBe(14.5);
    expect(r.periodesPaie).toEqual(['q']);
    expect(r.targetCA).toBe(1000);
    expect(r.rex).toEqual({ Carburant: { pct: 5 } });
  });

  it('alerte si la présence est reprise sans une équipe de même taille', () => {
    expect(alerteRepriseBlocs(v2, v1, ['presence'])).toMatch(/2 salariés.*1/);
    expect(alerteRepriseBlocs(v2, v1, ['presence', 'equipe'])).toBe(null);
    expect(alerteRepriseBlocs(v2, v1, ['equipe'])).toBe(null);
  });
});

describe('suppression de version', () => {
  const data = { versions: { v1, v2, v3: {} }, meta: { activeVersion: 'v2', submittedVersion: 'v1', descriptions: { v1: 'a', v2: 'b' } } };
  it('règles', () => {
    expect(motifRefusSuppression(data, 'v2', true)).toBe(null);
    expect(motifRefusSuppression(data, 'v1', true)).toMatch(/référence/);
    expect(motifRefusSuppression(data, 'v3', true)).toMatch(/vide/);
    expect(motifRefusSuppression(data, 'v2', false)).toMatch(/validation/);
    expect(motifRefusSuppression({ ...data, meta: { submittedVersion: 'v2' } }, 'v2', true)).toMatch(/soumission/);
  });
  it('retire la version et sa description, la version active repasse en V1', () => {
    const out = donneesSansVersion(data, 'v2');
    expect(out.versions.v2).toBeUndefined();
    expect(out.versions.v1).toEqual(v1);
    expect(out.meta.descriptions).toEqual({ v1: 'a' });
    expect(out.meta.activeVersion).toBe('v1');
    expect(data.versions.v2).toBe(v2);
  });
});
