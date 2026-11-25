import { describe, it, expect } from 'vitest';
import { dateLocale, indemnitesMS, paiesSemaine, buildPeriodesPaie, payrollMonth } from './calculations.js';
import { setMontantSemaine } from './presenceMois.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

function agence() { const a = agenceReference(); a.periodesPaie = buildPeriodesPaie(); a.costHour = 18; return a; }

describe('Indemnités et périodes de paie', () => {
  it('les dates de période sont lues en heure locale (premier jour de période compté, quel que soit le fuseau)', () => {
    const tz = process.env.TZ; process.env.TZ = 'Europe/Paris';
    try {
      const d = dateLocale('2027-03-08');
      expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 2, 8, 0]);
      expect(new Date(2027, 2, 8) >= dateLocale('2027-03-08')).toBe(true);
    } finally { process.env.TZ = tz; }
  });
  it('« Payé en » : semaine de fin de mois sur la paie suivante, décembre tardif sur janvier 2028', () => {
    const a = agence();
    const ps = paiesSemaine(a, 10); // 8 → 14 mars 2027 : période d'avril (8 mars → 11 avril)
    expect(ps).toHaveLength(1); expect(ps[0].mois).toBe(3);
    expect(paiesSemaine(a, 50).map((p) => p.mois)).toEqual(['jan2028']);
  });
  it('dont indemnités = écart de masse salariale quand on change un montant', () => {
    const a = agence(), b = JSON.parse(JSON.stringify(a));
    setMontantSemaine(b, 'repasRoulant', 10, 1000);
    for (let m = 0; m < 12; m++) expect(payrollMonth(b, m) - payrollMonth(a, m)).toBeCloseTo(indemnitesMS(b, m) - indemnitesMS(a, m), 6);
    expect(indemnitesMS(b, 3) - indemnitesMS(a, 3)).toBeCloseTo(1000, 6);
    setMontantSemaine(b, 'repasRoulant', 50, 1000);
    expect(M12(b)).toBeCloseTo(M12(a) + 1000, 6); // semaine 50 : paie 2028, rien de plus sur 2027
  });
});
function M12(a) { let t = 0; for (let m = 0; m < 12; m++) t += indemnitesMS(a, m); return t; }

describe('HS de fin d\'année payées en janvier 2028', () => {
  it('heures du 6 au 31 décembre 2027 isolées ; rien en calcul par mois civil', async () => {
    const { hsPayees2028, hsRows, hsDesJours } = await import('./calculations.js');
    const a = agence(); a.targetCA = a.targetCA * 1.6; const c = a.cal.reduce((x, d) => x + d.total, 0); a.cal.forEach((d) => { d.total = d.total * 1.6; });
    const r = hsPayees2028(a);
    const attendu = hsRows(a).reduce((s, x) => s + hsDesJours(a, x, (d) => d.month === 11 && d.day >= 6), 0);
    expect(r.hs).toBeCloseTo(attendu, 6);
    expect(r.cout >= 0).toBe(true);
    const b = JSON.parse(JSON.stringify(a)); b.periodesPaie = [];
    expect(hsPayees2028(b)).toEqual({ hs: 0, cout: 0 });
  });
});

describe('Ressource jour par jour (semaines incomplètes)', () => {
  it('un CP du 1er-3 janvier retire la capacité moyenne d\'un jour ouvrable non férié de ces dates, pas 35/6 h', async () => {
    const { pres, poidsJourSemaine, joursSemaine, baseHWeek } = await import('./calculations.js');
    const a = agence(); a.presence[53] = { cp: 1, other: 0 };
    const j = joursSemaine(a, 53).filter((d) => d.type !== 'ferie');
    const ouvr = j.filter((d) => new Date(2027, d.month, d.day).getDay() !== 0).length;
    const part = j.reduce((s, d) => s + poidsJourSemaine(a, d), 0);
    expect(pres(a, 53).cpH).toBeCloseTo(35 / 6 * part * 6 / ouvr, 6);
    a.presence[10] = { cp: 1, other: 0 }; expect(pres(a, 10).cpH).toBeCloseTo(35 / 6, 9); // semaine complète : inchangé
    expect(baseHWeek(a, 10)).toBeGreaterThan(0);
  });
  it('pas de maladie sur les heures d\'un férié chômé', async () => {
    const { pres } = await import('./calculations.js');
    const a = agence(); a.sick = Array(12).fill(10);
    const p = pres(a, 53);
    expect(p.mal).toBeCloseTo((p.base - p.ferieH) * 0.1, 6);
  });
});
