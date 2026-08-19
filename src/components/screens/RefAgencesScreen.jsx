import { useEffect, useState, useMemo } from 'react';
import { loadNetworkBudgets, saveReferenceData } from '../../lib/budgetApi.js';
import { AGENCES, agencesOps } from '../../config/agences.js';
import { refAgencesInsight } from '../../domain/refAgencesInsight.js';

const FIELDS = [
  { key: 'histCA2025', label: 'CA 2025', w: 110 },
  { key: 'histCA', label: 'CA 2026', w: 110 },
  { key: 'histTXR2026', label: 'TXR 2026 (€/h)', w: 90 },
  { key: 'targetAbsRate', label: 'Absent. cible %', w: 90 },
  { key: 'tauxHoraireBrut', label: 'Taux brut (€/h)', w: 90 },
  { key: 'tauxChargePatronal', label: 'Charges pat. %', w: 90 }
];

function Kpi({ label, value, note }) {
  return <div className="kpi"><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note || ''}</div></div>;
}

export default function RefAgencesScreen() {
  const [state, setState] = useState({ loading: true, error: null, map: null });
  const [edits, setEdits] = useState({}); // { agence: { field: value } }
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);

  function reload() {
    setState({ loading: true, error: null, map: null });
    loadNetworkBudgets()
      .then((m) => {
        const map = {};
        Object.keys(m).forEach((k) => { map[k] = m[k].data; });
        setState({ loading: false, error: null, map });
      })
      .catch((err) => setState({ loading: false, error: err.message || 'Erreur de chargement', map: null }));
  }
  useEffect(() => { reload(); }, []);

  // Valeur affichée = édition locale si présente, sinon donnée chargée.
  const merged = useMemo(() => {
    const base = state.map || {};
    const out = {};
    AGENCES.forEach((ag) => { out[ag.nom] = { ...(base[ag.nom] || {}), ...(edits[ag.nom] || {}) }; });
    return out;
  }, [state.map, edits]);

  if (state.loading) return <div className="card"><h2>Données agences</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Données agences</h2><p className="hint">Erreur : {state.error}</p></div>;

  const ops = agencesOps();
  const insight = refAgencesInsight(merged, ops);

  function setField(nom, field, value) {
    const val = value === '' ? null : +value;
    setEdits((prev) => ({ ...prev, [nom]: { ...(prev[nom] || {}), [field]: val } }));
  }

  function costHourOf(d) {
    if (d.tauxHoraireBrut && d.tauxChargePatronal) {
      return Math.round(+d.tauxHoraireBrut * (1 + (+d.tauxChargePatronal || 0) / 100) * 100) / 100;
    }
    return d.costHour || null;
  }

  async function save() {
    if (!Object.keys(edits).length) return;
    setSaving(true); setSavedMsg(null);
    try {
      // On envoie, pour chaque agence éditée, ses valeurs fusionnées (chargées + éditées).
      const refMap = {};
      Object.keys(edits).forEach((nom) => { refMap[nom] = { ...(state.map[nom] || {}), ...edits[nom] }; });
      const count = await saveReferenceData(refMap);
      setSavedMsg('✓ ' + count + ' agence(s) enregistrée(s)');
      setEdits({});
      reload();
    } catch (err) {
      setSavedMsg('Échec : ' + (err.message || 'erreur'));
    } finally {
      setSaving(false);
    }
  }

  const dirty = Object.keys(edits).length > 0;

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Données agences — références CG</h2>

      <div className="kpis" style={{ marginBottom: 16 }}>
        {insight.kpis.map((k, i) => <Kpi key={i} {...k} />)}
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: insight.text }} />

      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Agence</th>
              <th style={{ padding: '6px 8px' }}>Zone</th>
              {FIELDS.map((f) => <th key={f.key} style={{ padding: '6px 8px' }}>{f.label}</th>)}
              <th style={{ padding: '6px 8px' }}>Coût horaire</th>
            </tr>
          </thead>
          <tbody>
            {AGENCES.map((ag) => {
              const d = merged[ag.nom] || {};
              const cost = costHourOf(d);
              return (
                <tr key={ag.nom}>
                  <td style={{ padding: '4px 8px' }}><b>{ag.nom}</b></td>
                  <td style={{ textAlign: 'center', padding: '4px 8px' }}>{ag.zone || '—'}</td>
                  {FIELDS.map((f) => (
                    <td key={f.key} style={{ padding: '2px 4px' }}>
                      <input type="number" value={d[f.key] ?? ''} placeholder="—" onChange={(e) => setField(ag.nom, f.key, e.target.value)} style={{ width: f.w }} />
                    </td>
                  ))}
                  <td style={{ fontWeight: 700, color: 'var(--violet2, var(--violet))', fontFamily: 'DM Mono, monospace', padding: '0 8px' }}>{cost ? cost + ' €/h' : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={save} disabled={!dirty || saving}>{saving ? '⏳ Enregistrement…' : '💾 Enregistrer les modifications'}</button>
        {dirty ? <span className="hint" style={{ fontSize: 12 }}>{Object.keys(edits).length} agence(s) modifiée(s)</span> : null}
        {savedMsg ? <span style={{ fontSize: 13, color: savedMsg.startsWith('✓') ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>{savedMsg}</span> : null}
      </div>
    </div>
  );
}
