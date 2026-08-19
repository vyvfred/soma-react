import { useBudget } from '../../context/BudgetContext.jsx';
import { manual, T, M } from '../../domain/calculations.js';
import { chargesInsight } from '../../domain/chargesInsight.js';
import { euro } from '../../domain/format.js';

// Lignes de charges éditables (on exclut CA, charges de personnel et les sous-totaux).
const CHARGE_LINES = T.filter((r) => r.type !== 'subtotal' && r.label !== "Chiffre d'affaires" && r.label !== 'Charges de personnel');

function Kpi({ label, value, note }) {
  return <div className="kpi"><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note || ''}</div></div>;
}

export default function ChargesCgScreen() {
  const { agency: a, loading, error, editable, update, agenceNom } = useBudget();

  if (!agenceNom) return <div className="card"><h2>Charges CG</h2><p className="hint">Ouvrez une agence pour saisir ses charges.</p></div>;
  if (loading) return <div className="card"><h2>Charges CG</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Charges CG</h2><p className="hint">Erreur : {error}</p></div>;
  if (!a) return <div className="card"><h2>Charges CG — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const insight = chargesInsight(a);

  // Mutations — reproduisent setRexType / setRexMode / setRexAnnual / setRexKey / setRexVal.
  function patchLine(label, patch) {
    update((draft) => {
      const rex = { ...draft.rex };
      rex[label] = { ...rex[label], ...patch };
      draft.rex = rex;
      return draft;
    });
  }
  function setVal(label, m, value) {
    update((draft) => {
      const rex = { ...draft.rex };
      const line = { ...rex[label] };
      if (line.mode === 'pct') {
        line.pct = value === '' ? null : +value;
      } else {
        const values = (line.values || Array(12).fill(null)).slice();
        values[m] = value === '' ? null : +value;
        line.values = values;
      }
      rex[label] = line;
      draft.rex = rex;
      return draft;
    });
  }

  const cellStyle = { padding: '3px 4px', borderBottom: '1px solid var(--border)' };

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Charges — {a.name}</h2>

      <div className="kpis" style={{ marginBottom: 16 }}>
        {insight.kpis.map((k, i) => <Kpi key={i} {...k} />)}
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: insight.text }} />

      {!editable ? (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.10))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 13, color: 'var(--blue2, #3d6fd6)' }}>
          🔒 Budget engagé dans le circuit de validation — lecture seule.
        </div>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>Poste officiel</th>
              <th style={{ padding: '4px 8px' }}>Type</th>
              <th style={{ padding: '4px 8px' }}>Mode</th>
              <th style={{ padding: '4px 8px' }}>Clé / valeur</th>
              {M.map((m) => <th key={m} style={{ padding: '4px 4px' }}>{m}</th>)}
              <th style={{ padding: '4px 8px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {CHARGE_LINES.map((r) => {
              const x = a.rex[r.label] || {};
              const chargeType = x.chargeType || (r.type === 'charge' ? 'variable' : 'fixe');
              const mode = x.mode || 'month';
              const allocationKey = x.allocationKey || 'monthly12';
              const total = M.reduce((s, _, m) => s + manual(a, r.label, m), 0);

              return (
                <tr key={r.label}>
                  <td style={cellStyle}><b>{r.label}</b></td>
                  <td style={cellStyle}>
                    <span className={chargeType === 'fixe' ? 'badgeFixe' : 'badgeVar'}>{chargeType}</span>
                    <select value={chargeType} disabled={!editable} onChange={(e) => patchLine(r.label, { chargeType: e.target.value })} style={{ display: 'block', marginTop: 4 }}>
                      <option value="fixe">charge fixe</option>
                      <option value="variable">charge variable</option>
                    </select>
                  </td>
                  <td style={cellStyle}>
                    <select value={mode} disabled={!editable} onChange={(e) => patchLine(r.label, { mode: e.target.value })}>
                      <option value="month">saisie mensuelle</option>
                      <option value="annual">montant annuel</option>
                      <option value="pct">% CA mensuel</option>
                    </select>
                  </td>
                  <td style={cellStyle}>
                    {mode === 'annual' ? (
                      <div>
                        <label style={{ fontSize: 9, display: 'block' }}>Montant annuel</label>
                        <input type="number" value={x.annual || 0} disabled={!editable} onChange={(e) => patchLine(r.label, { annual: +e.target.value })} style={{ width: 90 }} />
                        <label style={{ fontSize: 9, display: 'block', marginTop: 2 }}>Clé</label>
                        <select value={allocationKey} disabled={!editable} onChange={(e) => patchLine(r.label, { allocationKey: e.target.value })}>
                          <option value="monthly12">division par 12</option>
                          <option value="ca">% du CA mensuel</option>
                        </select>
                      </div>
                    ) : mode === 'pct' ? (
                      <div>
                        <label style={{ fontSize: 9, display: 'block' }}>% CA mensuel</label>
                        <input type="number" value={x.pct || 0} disabled={!editable} onChange={(e) => setVal(r.label, 0, e.target.value)} style={{ width: 70 }} />
                      </div>
                    ) : (
                      <span className="hint" style={{ fontSize: 10 }}>saisie par mois</span>
                    )}
                  </td>
                  {M.map((_, m) => (
                    <td key={m} style={cellStyle}>
                      {mode === 'month'
                        ? <input type="number" value={(x.values && x.values[m]) || 0} disabled={!editable} onChange={(e) => setVal(r.label, m, e.target.value)} style={{ width: 58 }} />
                        : <span className="num locked" style={{ fontSize: 10 }}>{euro(manual(a, r.label, m))}</span>}
                    </td>
                  ))}
                  <td className="num" style={{ ...cellStyle, fontWeight: 700 }}>{euro(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
