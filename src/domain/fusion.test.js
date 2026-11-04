import { describe, it, expect } from 'vitest';
import { fusionnerVersion } from './fusion.js';

describe('Fusion à l\'enregistrement', () => {
  const base = { name: 'SG', targetCA: 100, rex: { Assurance: { annual: 0 } }, presence: { 10: { cp: 0 } }, costHour: 20 };
  it('le REX et le CG modifient des rubriques différentes : rien n\'est perdu', () => {
    const rexLocal = { ...base, presence: { 10: { cp: 3 } } };
    const enBase = { ...base, rex: { Assurance: { annual: 9000 } }, costHour: 25 }; // écrit par le CG entre-temps
    const r = fusionnerVersion(base, rexLocal, enBase);
    expect(r.fusion.presence).toEqual({ 10: { cp: 3 } });
    expect(r.fusion.rex.Assurance.annual).toBe(9000);
    expect(r.fusion.costHour).toBe(25);
    expect(r.locales).toEqual(['presence']);
    expect(r.distantes.sort()).toEqual(['costHour', 'rex']);
  });
  it('même rubrique modifiée des deux côtés : la dernière saisie l\'emporte', () => {
    const r = fusionnerVersion(base, { ...base, targetCA: 120 }, { ...base, targetCA: 110 });
    expect(r.fusion.targetCA).toBe(120);
  });
  it('rubrique supprimée localement', () => {
    const loc = { ...base }; delete loc.costHour;
    expect('costHour' in fusionnerVersion(base, loc, base).fusion).toBe(false);
  });
  it('sans point de départ ou version absente en base : la version locale fait foi', () => {
    expect(fusionnerVersion(null, { a: 1 }, { b: 2 }).fusion).toEqual({ a: 1 });
    expect(fusionnerVersion(base, { a: 1 }, {}).fusion).toEqual({ a: 1 });
  });
  it('n\'embarque jamais versions ni meta dans la version', () => {
    const r = fusionnerVersion(base, { ...base, versions: { v1: {} }, meta: {} }, base);
    expect(r.fusion.versions).toBeUndefined();
    expect(r.fusion.meta).toBeUndefined();
  });
});
