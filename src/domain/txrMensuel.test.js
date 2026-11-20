import { describe, it, expect } from 'vitest';
import { needWeeks, txrEffectif, txrDuMois, txrModule, hsTot } from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

describe('TXR modulé mois par mois', () => {
  it('sans modulation : rien ne change (TXR annuel partout)', () => {
    const a = agenceReference();
    expect(txrModule(a)).toBe(false);
    expect(txrEffectif(a)).toBe(250);
    const h = needWeeks(a).reduce((s, w) => s + w.hours, 0), ca = needWeeks(a).reduce((s, w) => s + w.ca, 0);
    expect(h).toBeCloseTo(ca / 250, 6);
  });
  it('un TXR plus élevé en juillet réduit les heures de juillet seulement', () => {
    const a = agenceReference(); const b = agenceReference();
    b.txrMois = Array(12).fill(null); b.txrMois[6] = 300;
    expect(txrDuMois(b, 6)).toBe(300); expect(txrDuMois(b, 5)).toBe(250);
    const heuresJuillet = (x) => x.cal.filter((d) => d.month === 6).reduce((s, d) => s + d.total / txrDuMois(x, 6), 0);
    expect(heuresJuillet(b)).toBeCloseTo(heuresJuillet(a) * 250 / 300, 6);
    const tot = (x) => needWeeks(x).reduce((s, w) => s + w.hours, 0);
    expect(tot(a) - tot(b)).toBeCloseTo(heuresJuillet(a) - heuresJuillet(b), 4);
    expect(txrEffectif(b)).toBeGreaterThan(250);
    expect(hsTot(b).need).toBeLessThan(hsTot(a).need);
  });
  it('une semaine à cheval sur deux mois utilise le TXR de chaque jour', () => {
    const a = agenceReference(); a.txrMois = Array(12).fill(null); a.txrMois[7] = 200;
    const w = needWeeks(a).find((x) => { const ms = new Set(a.cal.filter((d) => d.week === x.week).map((d) => d.month)); return ms.has(6) && ms.has(7); });
    const attendu = a.cal.filter((d) => d.week === w.week).reduce((s, d) => s + d.total / (d.month === 7 ? 200 : 250), 0);
    expect(w.hours).toBeCloseTo(attendu, 6);
  });
});
