import { describe, it, expect } from 'vitest';
import { totauxCalendrier } from './calTotaux.js';

describe('totauxCalendrier', () => {
  const cal = [
    { month: 0, type: 'semaine', ca: { san: 100, sai: 0, tp: 10 }, total: 110 },
    { month: 0, type: 'samedi', ca: { san: 50, sai: 0, tp: 0 }, total: 50 },
    { month: 0, type: 'ferie', ca: { san: 20, sai: 0, tp: 0 }, total: 20 },
    { month: 1, type: 'vacances', ca: { san: 80, sai: 5, tp: 0 }, total: 85 },
    { month: 1, type: 'dimanche', ca: { san: 35, sai: 0, tp: 0 }, total: 35 }
  ];
  const r = totauxCalendrier(cal);
  it('compte les jours par type et par mois', () => {
    expect(r.mois[0]).toMatchObject({ ouvres: 1, samedis: 1, feries: 1, jours: 3, ca: 180, san: 170, tp: 10 });
    expect(r.mois[1]).toMatchObject({ vacances: 1, dimanches: 1, jours: 2, ca: 120, sai: 5 });
    expect(r.mois[5].jours).toBe(0);
  });
  it('totalise l\'année et calcule la part de chaque mois', () => {
    expect(r.total).toMatchObject({ jours: 5, ca: 300, ouvres: 1, vacances: 1 });
    expect(r.mois[0].part).toBeCloseTo(0.6);
    expect(r.mois[0].moyJour).toBeCloseTo(60);
  });
  it('supporte un calendrier vide', () => {
    expect(totauxCalendrier([]).total.ca).toBe(0);
    expect(totauxCalendrier(null).mois).toHaveLength(12);
  });
});
