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
    expect(rex.kpis.map((k) => k.label)).toEqual(['CA budgété', 'Résultat d\'exploitation', 'Masse salariale / CA', 'Écart à l\'objectif']);
    expect(dr.kpis[1].label).toBe('Résultat net');
    
    expect(rex.verdict.detail).not.toBe(dr.verdict.detail);
    if (dr.net < 0) expect(dr.verdict.titre).toMatch(/résultat déficitaire/);
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

import { supervisionReseau } from './cgSupervision.js';
describe('Supervision réseau CG', () => {
  it('compte soumissions et validations, détecte les CA atypiques', () => {
    const cal = (v) => [{ total: v }];
    const ops = ['A', 'B', 'C', 'D', 'E'].map((nom) => ({ nom }));
    const map = {
      A: { statut: 'soumis_dr', data: { cal: cal(1000) } },
      B: { statut: 'valide_pdg', data: { cal: cal(1100) } },
      C: { statut: 'brouillon', data: { cal: cal(1050) } },
      D: { statut: 'soumis_df', data: { cal: cal(3000) } }
    };
    const s = supervisionReseau(ops, map);
    expect(s.kpis[0].value).toBe('3/5');
    expect(s.kpis[1].value).toBe('1/5');
    expect(s.caTotal).toBe(6150);
    expect(s.anomalies.map((x) => x.nom)).toEqual(['D']);
    expect(s.nonSoumis.map((x) => x.nom)).toEqual(['C', 'E']);
    expect(s.rows.find((r) => r.nom === 'E').statut).toBe('—');
  });
});

import { feuillesConsolidation } from './exportConsolidation.js';
describe('Export Excel de la consolidation', () => {
  it('3 feuilles, une ligne par agence, agences sans budget marquées', () => {
    const ops = [{ nom: 'A', zone: 'B' }, { nom: 'B', zone: 'A' }];
    const map = { A: { statut: 'soumis_dr', updatedAt: '2026-11-01T10:00:00Z', data: { histTXR2026: 100, targetAbsRate: 10, cal: [{ total: 400000 }], employees: [{ qual: 'DEA', hours: 35, pctRoulant: 100 }] } } };
    const f = feuillesConsolidation(map, ops);
    expect(f.map((x) => x.nom)).toEqual(['Consolidation', 'Statuts', 'Indicateurs']);
    expect(f[0].lignes.length).toBe(3);
    const a = f[0].lignes[1];
    expect(a[11]).toBe(400000);
    expect(a[12]).toBe(Math.round(35 * 0.9 * 100 * 52));
    expect(f[1].lignes[2][2]).toBe('Non commencé');
  });
});

import { chargesReport2028 } from './calculations.js';
describe('Charges à reporter sur janvier 2028', () => {
  it('positives pour une agence avec équipe et coût horaire', () => {
    const a = base();
    expect(chargesReport2028(a)).toBeGreaterThan(0);
  });
});

import { prefillCharges } from './prefillCharges.js';
import { annualCA } from './calculations.js';
describe('Pré-remplissage des charges standards', () => {
  it('applique les ratios du CA', () => {
    const a = base();
    prefillCharges(a);
    expect(a.rex.Carburant).toMatchObject({ mode: 'pct', pct: 5.2, allocationKey: 'ca' });
    expect(a.rex.Assurance.annual).toBe(Math.round(annualCA(a) * 0.018));
    expect(a.rex.Assurance.mode).toBe('annual');
  });
});

import { collecterAnomalies } from './anomalies.js';
import { agency } from './calculations.js';
describe('Centre d\'attention', () => {
  it('budget vierge : objectif et équipe à renseigner', () => {
    const l = collecterAnomalies(agency('X'));
    expect(l.map((x) => x.panel)).toEqual(['objectif', 'team']);
  });
  it('signale les congés à placer et relie chaque point à un écran', () => {
    const a = base();
    a.presence = {};
    const l = collecterAnomalies(a);
    expect(l.some((x) => /congés à placer/.test(x.text) && x.panel === 'rh')).toBe(true);
  });
});

import { ficheDecisions, lignesFiche } from './ficheDecisions.js';
describe('Fiche des décisions du valideur', () => {
  it('juge l\'absentéisme contre la référence RH et calcule les médianes réseau', () => {
    const a = base(); a.histCA = 2000000; a.targetAbsRate = 8; a.sick = Array(12).fill(6);
    const b = base(); b.name = 'AUTRE'; b.histCA = 1000000;
    const f = ficheDecisions(a, [b]);
    expect(f.absMoy).toBe(6);
    expect(f.medCroissance).not.toBeNull();
    const l = lignesFiche(f);
    expect(l.find((x) => x.titre === 'Absentéisme maladie')).toMatchObject({ type: 'warn' });
    expect(l.find((x) => x.titre === 'Structure des HS').type).toBe('ok');
  });
});

import { alertesBudgetSoumis } from './alertesCG.js';
describe('Alertes CG sur budget soumis', () => {
  it('signale ligne non-roulante, ratio de maintien et TXR manquants', () => {
    const m = alertesBudgetSoumis(agency('X')).map((x) => x.m).join(' | ');
    expect(m).toMatch(/Coût horaire/);
    expect(m).toMatch(/Ratio de maintien/);
    expect(m).toMatch(/TXR cible/);
  });
});
