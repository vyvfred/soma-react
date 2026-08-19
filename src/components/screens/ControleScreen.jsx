import { useBudget } from '../../context/BudgetContext.jsx';
import { chargesSummary, auditAlerts, ann } from '../../domain/calculations.js';
import { euro, pct } from '../../domain/format.js';

// Écran Contrôles — port fidèle de renderControl() : audit financier de l'agence
// ouverte (charges par nature, résultats) + alertes de cohérence.
const ALERT_BORDER = { crit: 'var(--orange, #c45300)', warn: '#FF8F00', info: 'var(--blue2, #3d6fd6)', ok: 'var(--green, #2e7d6f)' };

export default function ControleScreen() {
  const { agency: a, loading, error, agenceNom } = useBudget();

  if (!agenceNom) return <div className="card"><h2>Contrôles</h2><p className="hint">Ouvrez une agence pour lancer l'audit.</p></div>;
  if (loading) return <div className="card"><h2>Contrôles</h2><p className="hint">Chargement…</p></div>;
  if (error) return <div className="card"><h2>Contrôles</h2><p className="hint">Erreur : {error}</p></div>;
  if (!a) return <div className="card"><h2>Contrôles — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const s = chargesSummary(a);
  const ca = s.ca;
  const rex = ann(a, "RESULTAT D'EXPLOITATION");
  const net = ann(a, 'RESULTAT NET');
  const items = [
    ['Charges fixes', euro(s.fixed), pct(ca ? s.fixed / ca * 100 : 0)],
    ['Charges variables', euro(s.variable), pct(ca ? s.variable / ca * 100 : 0)],
    ['Charges personnel', euro(s.payroll), pct(ca ? s.payroll / ca * 100 : 0)],
    ['HS annuelles', s.hs.toFixed(0) + ' h', ''],
    ['REX', euro(rex), pct(ca ? rex / ca * 100 : 0)],
    ['Résultat net', euro(net), pct(ca ? net / ca * 100 : 0)]
  ];
  const alerts = auditAlerts(a);

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Contrôles — {a.name}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 18 }}>
        {items.map(([label, val, sub], i) => (
          <div key={i} style={{ padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink65)' }}>{label}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700 }}>{val}</div>
            {sub ? <div style={{ fontSize: 11, color: 'var(--ink30)' }}>{sub}</div> : null}
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, marginBottom: 10 }}>Alertes de cohérence</h3>
      {alerts.length ? (
        alerts.map((al, i) => (
          <div key={i} style={{ padding: '10px 14px', marginBottom: 8, borderLeft: '3px solid ' + (ALERT_BORDER[al[0]] || 'var(--border)'), background: 'var(--bg2)' }}>
            <b style={{ color: ALERT_BORDER[al[0]] || 'var(--ink)' }}>{al[1]}</b>
            <div style={{ fontSize: 12, color: 'var(--ink65)', marginTop: 2 }} dangerouslySetInnerHTML={{ __html: al[2] }} />
          </div>
        ))
      ) : (
        <p className="hint" style={{ color: 'var(--green, #2e7d6f)' }}>✓ Aucune anomalie détectée sur ce budget.</p>
      )}
    </div>
  );
}
