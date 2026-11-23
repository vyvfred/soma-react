import { describe, it, expect } from 'vitest';
import { ferieChomeJour, ferieChomeSemaine, pres, hsRows, estRoulantPart, partRoulant } from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';
const jour = (a, m, d) => a.cal.find((x) => x.month === m && x.day === d);
const etp = (a) => a.employees.filter(estRoulantPart).reduce((s, e) => s + (+e.hours || 0) / 35 * partRoulant(e), 0);

describe('Jours fériés et heures disponibles (nov. 2026)', () => {
  it('un férié en semaine ou un samedi retire 7 h par ETP, hors permanence ; le dimanche ne compte pas', () => {
    const a = agenceReference();
    const vendredi = jour(a, 0, 1), samedi = jour(a, 4, 1), dimanche = jour(a, 7, 15); // 1er janvier, 1er mai, 15 août 2027
    [vendredi, samedi].forEach((d) => { d.total = 0; expect(ferieChomeJour(a, d)).toBeCloseTo(7 * etp(a), 6); });
    dimanche.total = 0; expect(ferieChomeJour(a, dimanche)).toBe(0);
  });
  it('l\'équipe de permanence reste disponible à hauteur du besoin du jour', () => {
    const a = agenceReference(); const d = jour(a, 6, 14); // 14 juillet, mercredi
    d.total = 250 * 7; // besoin de 7 h au TXR de 250 €/h
    expect(ferieChomeJour(a, d)).toBeCloseTo(7 * etp(a) - 7, 6);
  });
  it('la semaine du férié a moins d\'heures disponibles, donc plus vite des HS', () => {
    const a = agenceReference(); const d = jour(a, 6, 14); const w = d.week;
    const avant = pres(a, w).av + ferieChomeSemaine(a, w);
    expect(pres(a, w).av).toBeCloseTo(avant - ferieChomeSemaine(a, w), 6);
    expect(ferieChomeSemaine(a, w)).toBeGreaterThan(0);
    const r = hsRows(a).find((x) => x.week === w);
    expect(r.ferieH).toBeCloseTo(ferieChomeSemaine(a, w), 6);
  });
});
