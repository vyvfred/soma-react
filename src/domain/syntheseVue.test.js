import { describe, it, expect } from 'vitest';
import { syntheseVue, syntheseVueHTML, svAvancementHTML, svK, svP } from './syntheseVue.js';
import { agency } from './calculations.js';

describe('syntheseVue', () => {
  it('formate les montants et pourcentages', () => {
    expect(svK(2390000)).toMatch(/2,39\s?M€/);
    expect(svK(177000)).toMatch(/177\s?k€/);
    expect(svP(null)).toBe('—');
  });
  it('produit les indicateurs sans repères (aucune comparaison inventée)', () => {
    const a = agency('NANTES'); a.rex = a.rex || {};
    const v = syntheseVue(a, null, null, {});
    expect(v.kpis.map((k) => k.cle).slice(0, 4)).toEqual(['ca', 'res', 'ms', 'ext']);
    expect(v.pont).toBeNull();
    expect(v.avecRepere).toBe(false);
    const h = syntheseVueHTML(v, {});
    expect(h).toContain('data-testid="sv-kpi-ca"');
    expect(h).toContain('Apparaît quand le contrôle de gestion a importé le tableau de bord 2026');
  });
  it('affiche l\'avancement du REX', () => {
    const h = svAvancementHTML({ pct: 50, objectif: true, refsPct: 100, nbSalaries: 2, absSaisis: 12, moisValides: 3, chargesREX: 6 });
    expect(h).toContain('sv-avancement');
    expect(h).toContain('2 salariés');
    expect((h.match(/class="ok"/g) || []).length).toBe(5);
  });
});

describe('syntheseVue sans tableau de bord 2026', () => {
  it('n\'affiche pas 0 % pour 2026 quand le réalisé est inconnu', () => {
    const a = agency('NANTES'); a.rex = a.rex || {}; a.histCA = 4000000;
    const v = syntheseVue(a, null, null, {});
    const ms = v.kpis.find((k) => k.cle === 'ms');
    expect(ms.comps[0].val).toBeNull();
  });
});
