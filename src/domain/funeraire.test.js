import { describe, it, expect } from 'vitest';
import { monthCA, annualCA, caFunMois, caFunJour, caFunAnnuel, hsTot, needWeeks, heuresDispoAnnuelles, ann, genCal } from './calculations.js';
import { totauxCalendrier } from './calTotaux.js';
import { syntheseBudget } from './syntheseBudget.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

const avecFun = () => { const a = agenceReference(); a.targetCA = 900000; a.targetTXR = 250; genCal(a); a.actFun = true; a.caFuneraire = [31000, 28000, null, 15000, 0, 0, 0, 0, 0, 0, 0, 12000]; return a; };
describe('Activité funéraire — CA commercial sans besoin d\'équipage', () => {
  it('montant du mois réparti à parts égales sur les jours', () => {
    const a = avecFun();
    expect(caFunJour(a, 0)).toBeCloseTo(1000, 6); // 31 000 / 31 jours
    expect(caFunJour(a, 1)).toBeCloseTo(1000, 6); // 28 000 / 28 jours (2027)
    expect(caFunMois(a, 2)).toBe(0);
    expect(caFunAnnuel(a)).toBe(86000);
  });
  it('compté dans le CA du mois, de l\'année et du compte de résultat', () => {
    const a = avecFun(); const b = avecFun(); b.actFun = false;
    expect(monthCA(a, 0) - monthCA(b, 0)).toBeCloseTo(31000, 6);
    expect(annualCA(a) - annualCA(b)).toBeCloseTo(86000, 6);
    expect(ann(a, "Chiffre d'affaires") - ann(b, "Chiffre d'affaires")).toBeCloseTo(86000, 6);
  });
  it('sans effet sur les heures nécessaires, les HS et la capacité', () => {
    const a = avecFun(); const b = avecFun(); b.actFun = false;
    expect(hsTot(a).need).toBeCloseTo(hsTot(b).need, 6);
    expect(hsTot(a).hs).toBeCloseTo(hsTot(b).hs, 6);
    expect(needWeeks(a).map((w) => w.hours)).toEqual(needWeeks(b).map((w) => w.hours));
    expect(heuresDispoAnnuelles(a)).toBe(heuresDispoAnnuelles(b));
  });
  it('écart à l\'objectif calculé hors funéraire ; ignoré si l\'activité est décochée', () => {
    const a = avecFun(); const b = avecFun(); b.actFun = false;
    const ea = syntheseBudget(a).ecart, eb = syntheseBudget(b).ecart;
    expect(ea).toBeCloseTo(eb, 2);
    expect(caFunAnnuel(b)).toBe(0);
  });
  it('totaux du calendrier : ligne funéraire comprise dans le CA', () => {
    const a = avecFun(); const fun = Array.from({ length: 12 }, (_, m) => caFunMois(a, m));
    const r = totauxCalendrier(a.cal, fun), s = totauxCalendrier(a.cal);
    expect(r.mois[0].fun).toBe(31000); expect(r.mois[0].ca - s.mois[0].ca).toBeCloseTo(31000, 6);
    expect(r.total.fun).toBe(86000);
  });
});
