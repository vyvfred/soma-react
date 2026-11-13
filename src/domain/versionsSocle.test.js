import { describe, it, expect } from 'vitest';
import { socleVersion, reporterSaisieCG, descriptionCopie, premiereVersionRemplie } from './refCG.js';
import { agenceDeVersion } from './versions.js';
import { buildBudgetData } from './budgetMapper.js';

// Revue du mécanisme des versions V1/V2/V3 (nov. 2026)
const v1 = { histCA: 900000, tauxHoraireBrut: 20.07, tauxChargePatronal: 42, costHour: 28.5, msNRBrutMensuel: 6000,
  employees: [{ name: 'A', qual: 'DEA', hours: 35 }], rex: { Assurance: { mode: 'annual', annual: 24000 } }, targetCA: 1000000 };

describe('Versions : socle commun', () => {
  it('une version vide reprend paramétrage CG, charges et équipe, pas les choix du REX', () => {
    const a = agenceDeVersion('NANTES', { versions: { v1 } }, 'v3');
    expect(a.costHour).toBe(28.5);
    expect(a.msNRBrutMensuel).toBe(6000);
    expect(a.employees).toHaveLength(1);
    expect(a.rex.Assurance.annual).toBe(24000);
    expect(a.targetCA).not.toBe(1000000);
  });
  it('socle : copie profonde', () => {
    const s = socleVersion(v1); s.employees[0].hours = 10;
    expect(v1.employees[0].hours).toBe(35);
  });
  it('première version remplie, même si V1 est vide', () => {
    expect(premiereVersionRemplie({ v1: {}, v2: { a: 1 } })).toEqual({ a: 1 });
  });
  it('description de la copie', () => {
    expect(descriptionCopie('', 'V1')).toBe('Copie de V1');
    expect(descriptionCopie('2 embauches', 'V1')).toBe('2 embauches (copie)');
  });
});

describe('Versions : saisie du CG reportée', () => {
  const versions = () => ({ v1: JSON.parse(JSON.stringify(v1)), v2: { ...JSON.parse(JSON.stringify(v1)), targetCA: 1200000 }, v3: {} });
  it('charge et référence modifiées sur V1 → reportées sur V2, pas sur V3 vide', () => {
    const vs = versions();
    const apres = { ...vs.v1, msNRBrutMensuel: 7000, rex: { ...vs.v1.rex, Loyer: { mode: 'annual', annual: 36000 } } };
    expect(reporterSaisieCG(vs, 'v1', vs.v1, apres)).toBe(1);
    expect(vs.v2.msNRBrutMensuel).toBe(7000);
    expect(vs.v2.rex.Loyer.annual).toBe(36000);
    expect(vs.v2.targetCA).toBe(1200000);
    expect(vs.v3).toEqual({});
  });
  it('rien de modifié par le CG : rien de reporté', () => {
    const vs = versions();
    expect(reporterSaisieCG(vs, 'v1', vs.v1, { ...vs.v1, targetCA: 5 })).toBe(0);
  });
  it('buildBudgetData : report uniquement pour une saisie CG', () => {
    const ex = { versions: versions(), meta: { activeVersion: 'v1' } };
    const a = { ...ex.versions.v1, rex: { ...ex.versions.v1.rex, Assurance: { mode: 'annual', annual: 30000 } } };
    expect(buildBudgetData(ex, 'v1', ex.meta, a, ex.versions.v1, null, false).versions.v2.rex.Assurance.annual).toBe(24000);
    expect(buildBudgetData(ex, 'v1', ex.meta, a, ex.versions.v1, null, true).versions.v2.rex.Assurance.annual).toBe(30000);
  });
});
