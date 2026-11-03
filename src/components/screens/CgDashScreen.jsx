import { useEffect, useState } from 'react';
import { loadNetworkBudgets } from '../../lib/budgetApi.js';
import { agencesOps } from '../../config/agences.js';
import { useNav } from '../../context/NavContext.jsx';
import { chargesCGSaisies } from '../../domain/calculations.js';
import { CgParcours } from '../CgGuide.jsx';
import { supervisionReseau, STATUT_LABELS } from '../../domain/cgSupervision.js';
import { euro } from '../../domain/format.js';

// Tableau de bord CG — vue « Préparation » (port fidèle de renderCgDashPrep).
// Agrège l'état de préparation sur toutes les agences opérationnelles du réseau.
function Kpi({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

function ActionItem({ text, action, onClick, warn }) {
  return (
    <button className="attentionItem" style={{ border: '1px solid var(--border)', marginBottom: 6, width: '100%' }} onClick={onClick}>
      <span className={'attentionItemIcon ' + (warn ? 'warn' : 'todo')}>{warn ? '⚠' : '○'}</span>
      <span className="attentionItemText">{text}</span>
      <span className="attentionItemArrow">{action} →</span>
    </button>
  );
}

export default function CgDashScreen() {
  const navigate = useNav();
  const [state, setState] = useState({ loading: true, error: null, map: null });
  const [vue, setVue] = useState('prep');

  useEffect(() => {
    let active = true;
    loadNetworkBudgets()
      .then((map) => { if (active) setState({ loading: false, error: null, map }); })
      .catch((err) => { if (active) setState({ loading: false, error: err.message || 'Erreur de chargement', map: null }); });
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="card"><h2>Tableau de bord</h2><p className="hint">Chargement des budgets du réseau…</p></div>;
  if (state.error) return <div className="card"><h2>Tableau de bord</h2><p className="hint">Impossible de charger les budgets : {state.error}</p></div>;

  const map = state.map || {};
  const ops = agencesOps();
  const total = ops.length;

  // Avancement de la préparation (fidèle à renderCgDashPrep).
  let avecRef = 0, avecCharges = 0;
  const sansRef = [], sansCharges = [];
  ops.forEach((ag) => {
    const e = map[ag.nom];
    const d = e ? e.data : {};
    const hasRef = !!(d.histTXR2026 || d.costHour || d.tauxHoraireBrut);
    // Postes de charges réellement saisis (avant : champ cgCharges inexistant, toujours 0)
    const hasCharges = chargesCGSaisies(d) > 0;
    if (hasRef) avecRef++; else sansRef.push(ag.nom);
    if (hasCharges) avecCharges++; else sansCharges.push(ag.nom);
  });
  const periodesOk = ops.some((ag) => { const e = map[ag.nom]; return e && e.data && e.data.periodesPaie && e.data.periodesPaie.length; });

  let insight = 'Vous avez préparé les données de référence de ' + avecRef + ' agences sur ' + total + '. ';
  if (sansRef.length) insight += 'Il reste ' + sansRef.length + ' agence' + (sansRef.length > 1 ? 's' : '') + ' sans données de référence — sans elles, les REX concernés ne peuvent pas démarrer. ';
  else insight += 'Toutes les agences ont leurs données de référence. ';
  if (sansCharges.length) insight += sansCharges.length + ' agence' + (sansCharges.length > 1 ? 's' : '') + " n'ont pas encore de charges saisies.";

  const bascule = (
    <div className="segmented" style={{ display: 'flex', gap: 0 }} data-testid="cgdash-vue">
      {[['prep', 'Préparation'], ['superv', 'Supervision']].map(([k, l]) => (
        <button key={k} onClick={() => setVue(k)} style={{ width: 'auto', margin: 0, padding: '7px 16px', fontSize: 13, border: '1px solid var(--border)',
          background: vue === k ? 'var(--violet2)' : 'transparent', color: vue === k ? '#fff' : 'var(--ink65)', fontWeight: vue === k ? 700 : 400 }}>{l}</button>
      ))}
    </div>
  );
  const entete = (titre) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
      <h2 style={{ margin: 0 }}>{titre}</h2>{bascule}
    </div>
  );

  if (vue === 'superv') {
    const sv = supervisionReseau(ops, map);
    return (
      <div className="card" data-testid="cgdash-superv">
        {entete('Tableau de bord réseau — Supervision 2027')}
        <div className="kpis" style={{ marginBottom: 16 }}>{sv.kpis.map((k) => <Kpi key={k.label} {...k} />)}</div>
        <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 18 }}
          dangerouslySetInnerHTML={{ __html: '💬 ' + sv.insight }} />
        <h3 style={{ fontSize: 14, marginBottom: 10 }}>Agences nécessitant attention</h3>
        {sv.anomalies.map((an) => <ActionItem key={'a' + an.nom} warn text={<><b>{an.nom}</b> — {an.text}</>} action="voir" onClick={() => navigate('objectif', an.nom)} />)}
        {sv.nonSoumis.map((r) => <ActionItem key={'n' + r.nom} text={<><b>{r.nom}</b> — pas encore soumis</>} action="voir" onClick={() => navigate('objectif', r.nom)} />)}
        {!sv.anomalies.length && !sv.nonSoumis.length ? <p className="hint">✓ Aucune agence atypique. Les budgets soumis sont cohérents avec le réseau.</p> : null}
        <details style={{ border: '1px solid var(--border)', marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>Voir toutes les agences (état détaillé)</summary>
          <div style={{ padding: '4px 14px 14px', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }} data-testid="cgdash-toutes">
              <thead><tr style={{ color: 'var(--ink65)' }}><th style={{ textAlign: 'left', padding: 6 }}>Agence</th><th style={{ textAlign: 'left', padding: 6 }}>Statut</th><th style={{ textAlign: 'right', padding: 6 }}>CA budgété</th></tr></thead>
              <tbody>
                {sv.rows.map((r) => (
                  <tr key={r.nom} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate('objectif', r.nom)}>
                    <td style={{ padding: 6 }}>{r.nom}</td><td style={{ padding: 6 }}>{STATUT_LABELS[r.statut] || r.statut}</td>
                    <td className="num" style={{ padding: 6, textAlign: 'right' }}>{r.ca > 0 ? euro(r.ca) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="card">
      {entete('Tableau de bord — Préparation réseau')}
      <div style={{ marginBottom: 16 }}><CgParcours /></div>

      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi label="Agences" value={total} note="dans le réseau" />
        <Kpi label="Données de référence" value={avecRef + '/' + total} note={avecRef < total ? 'à compléter' : '✓ complet'} />
        <Kpi label="Périodes de paie" value={periodesOk ? '✓' : 'standard'} note={periodesOk ? 'configurées' : 'à vérifier par agence'} />
        <Kpi label="Charges saisies" value={avecCharges + '/' + total} note={avecCharges < total ? 'à compléter' : '✓ complet'} />
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 18 }}
        dangerouslySetInnerHTML={{ __html: insight }} />

      <h3 style={{ fontSize: 14, marginBottom: 10 }}>Ce qu'il reste à préparer</h3>
      {sansRef.length ? (
        <ActionItem text={sansRef.length + ' agence' + (sansRef.length > 1 ? 's' : '') + ' sans données de référence'} action="compléter" onClick={() => navigate('refagences')} />
      ) : null}
      {sansCharges.length ? (
        <ActionItem text={sansCharges.length + ' agence' + (sansCharges.length > 1 ? 's' : '') + ' sans charges CG'} action="compléter" onClick={() => navigate('cg')} />
      ) : null}
      {!sansRef.length && !sansCharges.length ? (
        <p className="hint">✓ Toutes les agences sont prêtes côté données de référence et charges.</p>
      ) : null}

    </div>
  );
}
