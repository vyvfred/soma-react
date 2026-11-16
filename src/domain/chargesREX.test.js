import { describe, it, expect } from 'vitest';
import { agency, genCal, manual, monthCA, valeursChargeREX, setChargeREX, versSaisieREX, modeChargeREX, chargesREXRemplies, LIGNES_CHARGES_REX } from './calculations.js';

function base() {
  const a = agency('TEST');
  a.refs.san.forEach((mo) => { mo.semaine = 3000; mo.vacances = 2500; mo.samedi = 1500; mo.dimanche = 800; mo.ferie = 800; });
  genCal(a);
  return a;
}
const somme = (a, l) => Array.from({ length: 12 }, (_, m) => manual(a, l, m)).reduce((s, v) => s + v, 0);

describe('Charges saisies par le REX', () => {
  it('6 postes : 4 en % du CA mensuel, 2 en montant mensuel', () => {
    expect(LIGNES_CHARGES_REX).toHaveLength(6);
    expect(modeChargeREX('Carburant')).toBe('pctMois');
    expect(modeChargeREX('Sous traitance')).toBe('month');
    expect(modeChargeREX('Assurance')).toBe(null);
  });
  it('reprise des valeurs CG sans changer les montants (Carburant 5,2 % → % mensuels)', () => {
    const a = base(); a.rex.Carburant = { ...a.rex.Carburant, mode: 'pct', pct: 5.2 };
    const avant = somme(a, 'Carburant');
    expect(valeursChargeREX(a, 'Carburant').every((v) => Math.abs(v - 5.2) < 0.01)).toBe(true);
    versSaisieREX(a, 'Carburant');
    expect(a.rex.Carburant.mode).toBe('pctMois');
    expect(somme(a, 'Carburant')).toBeCloseTo(avant, 0);
  });
  it('reprise d\'un montant annuel CG en montants mensuels (sous-traitance)', () => {
    const a = base(); a.rex['Sous traitance'] = { ...a.rex['Sous traitance'], mode: 'annual', annual: 12000, allocationKey: 'monthly12' };
    expect(valeursChargeREX(a, 'Sous traitance')).toEqual(Array(12).fill(1000));
    setChargeREX(a, 'Sous traitance', 7, 2500);
    expect(a.rex['Sous traitance'].values[7]).toBe(2500);
    expect(a.rex['Sous traitance'].values[0]).toBe(1000);
    expect(somme(a, 'Sous traitance')).toBe(13500);
  });
  it('un % mensuel saisi donne CA du mois × %', () => {
    const a = base();
    setChargeREX(a, 'Matériels ambulances', 3, '1,5');
    expect(manual(a, 'Matériels ambulances', 3)).toBeCloseTo(monthCA(a, 3) * 0.015, 2);
    expect(a.rex['Matériels ambulances'].saisieREX).toBe(true);
    expect(chargesREXRemplies(a)).toBe(1);
  });
  it('CA pas encore construit : taux déduit du montant annuel CG et de l\'objectif de CA', () => {
    const a = agency('VIDE'); a.targetCA = 1000000;
    a.rex['Fourniture bureau - vêtements'] = { ...a.rex['Fourniture bureau - vêtements'], mode: 'annual', annual: 10000 };
    expect(valeursChargeREX(a, 'Fourniture bureau - vêtements')[0]).toBe(1);
  });
});
