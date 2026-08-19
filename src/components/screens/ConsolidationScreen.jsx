import { useEffect, useState } from 'react';
import { loadNetworkBudgets } from '../../lib/budgetApi.js';
import { agencesOps } from '../../config/agences.js';
import { statutLabel } from '../../config/statut.js';
import { computeConsolidation } from '../../domain/consolidation.js';
import { euro } from '../../domain/format.js';

function Kpi({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

const ALERT_COLOR = { crit: 'var(--orange, #c45300)', warn: '#FF8F00', info: 'var(--blue2, #3d6fd6)' };

export default function ConsolidationScreen() {
  const [state, setState] = useState({ loading: true, error: null, map: null });

  useEffect(() => {
    let active = true;
    loadNetworkBudgets()
      .then((map) => { if (active) setState({ loading: false, error: null, map }); })
      .catch((err) => { if (active) setState({ loading: false, error: err.message || 'Erreur de chargement', map: null }); });
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="card"><h2>Consolidation</h2><p className="hint">Chargement des budgets du réseau…</p></div>;
  if (state.error) return <div className="card"><h2>Consolidation</h2><p className="hint">Erreur : {state.error}</p></div>;

  const ops = agencesOps();
  const c = computeConsolidation(state.map || {}, ops);

  let insight = '<b>' + c.deposes + ' agence' + (c.deposes > 1 ? 's' : '') + ' sur ' + c.total + '</b> ont déposé leur budget';
  if (c.valides > 0) insight += ', dont <b>' + c.valides + '</b> validé' + (c.valides > 1 ? 's' : '') + ' définitivement';
  insight += '. ';
  if (c.caReseauTotal > 0) insight += 'Le CA réseau consolidé atteint <b>' + euro(c.caReseauTotal) + '</b>. ';
  if (c.agencesAtypiques.length > 0) {
    insight += '<b>' + c.agencesAtypiques.length + ' agence' + (c.agencesAtypiques.length > 1 ? 's' : '') + '</b> présente' + (c.agencesAtypiques.length > 1 ? 'nt' : '') + ' un taux de charge élevé (objectif au-dessus de la capacité) : ' + c.agencesAtypiques.slice(0, 3).join(', ') + (c.agencesAtypiques.length > 3 ? '…' : '') + '.';
  } else if (c.deposes > 0) {
    insight += 'Aucune agence en surcharge critique.';
  }

  const txChargeColor = (t) => (t > 115 ? 'var(--orange, #c45300)' : t > 100 ? '#FF8F00' : t > 85 ? 'var(--accent-blue, #3d6fd6)' : 'var(--green, #2e7d6f)');

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Consolidation réseau</h2>

      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi label="Agences réseau" value={c.total} />
        <Kpi label="Budgets déposés" value={c.deposes} note={Math.round((c.deposes / c.total) * 100) + '%'} />
        <Kpi label="En brouillon" value={c.brouillons} />
        <Kpi label="Non commencés" value={c.nonDeposes} />
        <Kpi label="Validés Direction" value={c.valides} />
        <Kpi label="En cours validation" value={c.enCours} />
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: insight }} />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Agence', 'Statut', 'CA budgété', 'Capacité max', 'Taux charge', 'HS estimées', 'CP équilibre', 'Alertes', 'Mis à jour'].map((h, i) => (
                <th key={i} style={{ textAlign: i >= 2 && i <= 6 ? 'right' : 'left', padding: '6px 8px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r) => {
              if (!r.present) {
                return (
                  <tr key={r.nom}>
                    <td style={{ padding: '4px 8px' }}><b>{r.nom}</b></td>
                    <td style={{ padding: '4px 8px' }}><span className="statut brouillon">Non commencé</span></td>
                    <td colSpan={7} style={{ color: 'var(--ink30)', fontSize: 12, padding: '4px 8px' }}>Aucune donnée</td>
                  </tr>
                );
              }
              return (
                <tr key={r.nom}>
                  <td style={{ padding: '4px 8px' }}><b>{r.nom}</b><br /><span style={{ fontSize: 10, color: 'var(--ink65)' }}>Zone {r.zone}</span></td>
                  <td style={{ padding: '4px 8px' }}><span className={'statut ' + r.statut}>{statutLabel(r.statut)}</span></td>
                  <td className="num" style={{ padding: '4px 8px' }}>{r.caB > 0 ? euro(r.caB) : '—'}</td>
                  <td className="num" style={{ padding: '4px 8px' }}>{r.caMax > 0 ? euro(r.caMax) : '—'}</td>
                  <td className="num" style={{ color: txChargeColor(r.txCharge), fontWeight: 700, padding: '4px 8px' }}>{r.txCharge > 0 ? r.txCharge + '%' : '—'}</td>
                  <td className="num" style={{ padding: '4px 8px' }}>{r.hsAnn > 0 ? <span style={{ color: 'var(--orange, #c45300)' }}>{r.hsAnn} h</span> : '—'}</td>
                  <td className="num" style={{ fontSize: 11, padding: '4px 8px' }}>{r.cpGen > 0 ? r.cpEcart.toFixed(1) + ' J' : '—'}</td>
                  <td style={{ padding: '4px 8px' }}>
                    {r.alertes.length
                      ? r.alertes.map((al, i) => <span key={i} style={{ display: 'block', fontSize: 10, color: ALERT_COLOR[al.t] }}>⚠ {al.m}</span>)
                      : <span style={{ color: 'var(--green, #2e7d6f)', fontSize: 11 }}>✓ OK</span>}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--ink65)', padding: '4px 8px' }}>{r.dateStr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
