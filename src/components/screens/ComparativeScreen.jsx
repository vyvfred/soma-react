import { useEffect, useState } from 'react';
import { loadNetworkBudgets } from '../../lib/budgetApi.js';
import { agencesOps } from '../../config/agences.js';
import { statutLabel } from '../../config/statut.js';
import { computeComparative } from '../../domain/comparative.js';

function Kpi({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

// Cellule colorée selon l'écart à la médiane (port fidèle de cellVal).
function Cell({ val, median, unit, higherIsBad }) {
  if (val === null || val === undefined || isNaN(val)) {
    return <td style={{ color: 'var(--ink30)', textAlign: 'right' }}>—</td>;
  }
  const isBad = (higherIsBad && val > median * 1.15) || (!higherIsBad && val < median * 0.85);
  const isGood = (!higherIsBad && val > median * 1.10) || (higherIsBad && val < median * 0.85);
  const color = isBad ? 'var(--orange, #c45300)' : isGood ? 'var(--green, #2e7d6f)' : 'var(--ink)';
  const indicator = isBad ? ' ▲' : isGood ? ' ▼' : '';
  return (
    <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', color, fontWeight: isBad || isGood ? 700 : 400 }}>
      {val}{unit}{indicator}
    </td>
  );
}

export default function ComparativeScreen() {
  const [state, setState] = useState({ loading: true, error: null, map: null });

  useEffect(() => {
    let active = true;
    loadNetworkBudgets()
      .then((map) => { if (active) setState({ loading: false, error: null, map }); })
      .catch((err) => { if (active) setState({ loading: false, error: err.message || 'Erreur de chargement', map: null }); });
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="card"><h2>Vue comparative</h2><p className="hint">Chargement des budgets du réseau…</p></div>;
  if (state.error) return <div className="card"><h2>Vue comparative</h2><p className="hint">Impossible de charger les budgets : {state.error}</p></div>;

  const ops = agencesOps();
  const { rows, withData, medians, atypiques } = computeComparative(state.map || {}, ops);

  let insight = '';
  if (withData.length >= 2) {
    insight = '<b>' + withData.length + ' agences</b> disposent de données comparables. ';
    if (atypiques.length === 0) {
      insight += "Aucune ne s'écarte significativement de la médiane réseau — l'ensemble est homogène.";
    } else {
      const ex = atypiques.slice(0, 3).map((a) => '<b>' + a.nom + '</b> (' + a.signaux[0] + ')');
      insight += '<b>' + atypiques.length + '</b> se distingue' + (atypiques.length > 1 ? 'nt' : '') + ' de la médiane : ' + ex.join(', ') + (atypiques.length > 3 ? ', …' : '') + '. Les valeurs en orange signalent les écarts à examiner.';
    }
  }

  const fmt = (v, d, u) => (v !== null && v !== undefined ? v.toFixed(d) + u : '—');

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Vue comparative — réseau</h2>

      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi label="TXR médian réseau" value={fmt(medians.txr, 1, ' €/h')} note="2026" />
        <Kpi label="Absentéisme médian" value={fmt(medians.mal, 1, ' %')} note="cible" />
        <Kpi label="Coût horaire médian" value={fmt(medians.ch, 2, ' €/h')} />
        <Kpi label="ETP roulant médian" value={fmt(medians.etp, 2, '')} />
        <Kpi label="Taux HS/CA médian" value={medians.tauxHS !== null ? medians.tauxHS + '%' : '—'} note="budgété" />
        <Kpi label="Agences avec données" value={withData.length + '/' + rows.length} />
      </div>

      {insight ? (
        <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
          dangerouslySetInnerHTML={{ __html: insight }} />
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Agence</th>
              <th style={{ padding: '6px 8px' }}>Zone</th>
              <th style={{ padding: '6px 8px' }}>Statut</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }} title="TXR moyen réalisé 2026">TXR 2026</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }} title="Taux absentéisme cible">Absent.</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }} title="Coût horaire moyen agence">Coût h.</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }} title="ETP roulants">ETP</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }} title="Taux HS / capacité max budgétée">HS/CA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const st = r.statut === '—' ? 'brouillon' : r.statut;
              return (
                <tr key={r.nom}>
                  <td style={{ padding: '4px 8px' }}><b>{r.nom}</b></td>
                  <td style={{ textAlign: 'center', padding: '4px 8px' }}>{r.zone}</td>
                  <td style={{ padding: '4px 8px' }}><span className={'statut ' + st}>{statutLabel(st)}</span></td>
                  <Cell val={r.txr} median={medians.txr} unit=" €/h" higherIsBad={false} />
                  <Cell val={r.mal} median={medians.mal} unit=" %" higherIsBad={true} />
                  <Cell val={r.ch} median={medians.ch} unit=" €/h" higherIsBad={true} />
                  <Cell val={r.etp} median={medians.etp} unit="" higherIsBad={false} />
                  <Cell val={r.tauxHS} median={medians.tauxHS} unit=" %" higherIsBad={true} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
