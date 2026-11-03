import { describe, it, expect } from 'vitest';
import { genCal } from './calculations.js';
import { repartirCPAuto } from './repartitionCP.js';
import { syntheseBudget, coutChoix, bilanEnveloppesCP, indicateursDetailles } from './syntheseBudget.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

const base = () => { const a = agenceReference(); genCal(a); return a; };

describe('Synthèse du budget', () => {
  it('verdict adapté au rôle et 4 KPI de décision', () => {
    const a = base();
    const rex = syntheseBudget(a, 'rex');
    const dr = syntheseBudget(a, 'dr');
    expect(rex.kpis.map((k) => k.label)).toEqual(['CA budgété', 'Résultat net', 'Masse salariale / CA', 'Écart à l\'objectif']);
    expect(rex.verdict.titre).toBe(dr.verdict.titre);
    expect(rex.verdict.detail).not.toBe(dr.verdict.detail);
    if (rex.net < 0) expect(rex.verdict.titre).toMatch(/résultat déficitaire/);
  });

  it('objectif non atteint au-delà de 3 %', () => {
    const a = base();
    a.targetCA = syntheseBudget(a).ca * 1.1;
    const s = syntheseBudget(a);
    expect(s.verdict.ok).toBe(false);
    expect(s.verdict.titre).toMatch(/objectif de CA non atteint/);
    expect(s.lecture).toMatch(/en retrait/);
  });

  it('coût du choix et enveloppes : absents avant la répartition automatique, présents après', () => {
    const a = base();
    expect(coutChoix(a)).toBeNull();
    expect(bilanEnveloppesCP(a)).toBeNull();
    repartirCPAuto(a);
    const c = coutChoix(a);
    expect(c.mesurable).toBe(true);
    expect(c.surcout).toBe(0);
    const w = Object.keys(a.cpOptimal).find((k) => a.cpOptimal[k] > 0);
    a.presence[w] = { ...a.presence[w], cp: a.cpOptimal[w] + 3 };
    expect(coutChoix(a).semaines.some((s) => String(s.week) === String(w))).toBe(true);
    const env = bilanEnveloppesCP(a);
    expect(env.lignes.length).toBe(3);
  });

  it('graphiques et indicateurs détaillés', () => {
    const ind = indicateursDetailles(base());
    expect(ind.caMensuel.length).toBe(12);
    expect(ind.ratios.length).toBe(4);
    expect(ind.dash.length).toBe(6);
    expect(ind.fin.length).toBe(6);
  });
});
