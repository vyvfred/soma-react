import { useEffect, useState, useCallback } from 'react';
import { loadAffectationData, affecterDR } from '../../lib/budgetApi.js';
import { agencesOps } from '../../config/agences.js';
import { affectationInsight } from '../../domain/affectationInsight.js';

function Kpi({ label, value, note }) {
  return <div className="kpi"><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note || ''}</div></div>;
}

export default function AffectationScreen() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [busyAgence, setBusyAgence] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    setState({ loading: true, error: null, data: null });
    loadAffectationData()
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((err) => setState({ loading: false, error: err.message || 'Erreur de chargement', data: null }));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (state.loading) return <div className="card"><h2>Affectation DR</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Affectation DR</h2><p className="hint">Erreur : {state.error}</p></div>;

  const { drs, agMap } = state.data;
  const ops = agencesOps();
  const insight = affectationInsight(ops, agMap, drs);

  // DR actuellement affecté à une agence : celui dont la région correspond.
  function currentDrId(agence) {
    const rid = agMap[agence];
    if (!rid) return '';
    const dr = drs.find((d) => d.region_id === rid);
    return dr ? dr.id : '';
  }

  async function assign(agence, drId) {
    setBusyAgence(agence); setMsg(null);
    try {
      await affecterDR(agence, drId);
      setMsg({ type: 'ok', text: 'Affectation enregistrée pour ' + agence });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: 'Échec (' + agence + ') : ' + (err.message || 'erreur') });
    } finally {
      setBusyAgence(null);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Affectation des Directeurs Régionaux</h2>

      <div className="kpis" style={{ marginBottom: 16 }}>
        {insight.kpis.map((k, i) => <Kpi key={i} {...k} />)}
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: insight.text }} />

      {!drs.length ? (
        <p className="hint">Aucun DR créé. Créez d'abord les comptes DR dans Supabase Auth.</p>
      ) : (
        <>
          {msg ? (
            <div style={{ marginBottom: 12, fontSize: 13, color: msg.type === 'ok' ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>
              {msg.type === 'ok' ? '✓ ' : '⚠ '}{msg.text}
            </div>
          ) : null}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px' }}>Agence</th>
                  <th style={{ padding: '6px 10px' }}>Zone</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px' }}>Directeur Régional affecté</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((ag) => (
                  <tr key={ag.nom}>
                    <td style={{ padding: '4px 10px' }}><b>{ag.nom}</b></td>
                    <td style={{ textAlign: 'center', padding: '4px 10px' }}>{ag.zone || '—'}</td>
                    <td style={{ padding: '4px 10px' }}>
                      <select
                        value={currentDrId(ag.nom)}
                        disabled={busyAgence === ag.nom}
                        onChange={(e) => assign(ag.nom, e.target.value)}
                        style={{ minWidth: 220 }}
                      >
                        <option value="">— Aucun —</option>
                        {drs.map((dr) => <option key={dr.id} value={dr.id}>{dr.nom}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="hint" style={{ marginTop: 14, fontSize: 12 }}>
            L'affectation passe par la fonction serveur <code>affecter_dr</code>. Si vous obtenez une erreur,
            vérifiez que son SQL a bien été déployé dans Supabase.
          </p>
        </>
      )}
    </div>
  );
}
