import { useBudget } from '../../context/BudgetContext.jsx';
import { objectifInsight } from '../../domain/objectifInsight.js';

const BANNER_STYLE = {
  ok: { border: 'var(--green, #2e7d6f)', bg: 'rgba(46,125,111,.10)', color: 'var(--green, #2e7d6f)' },
  info: { border: 'var(--blue2, #3d6fd6)', bg: 'var(--blue-light, rgba(61,111,214,.10))', color: 'var(--blue2, #3d6fd6)' },
  warn: { border: 'var(--orange, #c45300)', bg: 'rgba(196,83,0,.10)', color: 'var(--orange, #c45300)' }
};

function SaveIndicator({ status }) {
  const map = { idle: '', saving: 'Enregistrement…', saved: 'Enregistré', error: 'Non enregistré' };
  const color = status === 'error' ? 'var(--orange, #c45300)' : 'var(--ink30)';
  if (!map[status]) return null;
  return <span style={{ fontSize: 12, color }}>{map[status]}</span>;
}

export default function ObjectifScreen() {
  const { agency: a, loading, error, saveStatus, update, editable, agenceNom } = useBudget();

  if (!agenceNom) return <div className="card"><h2>Objectif</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Objectif</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Objectif</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Objectif — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const insight = objectifInsight(a);

  const setField = (field) => (e) => {
    const raw = e.target.value.replace(/\s/g, '').replace(',', '.');
    const val = raw === '' ? null : Number(raw);
    if (raw !== '' && Number.isNaN(val)) return; // ignore la saisie non numérique
    update((draft) => { draft[field] = val; return draft; });
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Objectif 2027 — {agenceNom}</h2>
        <SaveIndicator status={saveStatus} />
      </div>

      <p className="hint" style={{ marginBottom: 18 }}>{insight.recall}</p>

      {!editable ? (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.10))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 13, color: 'var(--blue2, #3d6fd6)' }}>
          🔒 Budget engagé dans le circuit de validation — lecture seule.
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <label style={{ flex: 1, minWidth: 220 }}>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--ink65)', marginBottom: 6 }}>
            Objectif de chiffre d'affaires
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="text" inputMode="numeric" placeholder="0" autoComplete="off"
              value={a.targetCA ?? ''} onChange={setField('targetCA')} disabled={!editable}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'var(--ink65)' }}>€</span>
          </span>
        </label>

        <label style={{ flex: 1, minWidth: 220 }}>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--ink65)', marginBottom: 6 }}>
            TXR cible <span title="Taux de recette par heure : CA ÷ heures de conduite.">ⓘ</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="text" inputMode="decimal" placeholder="0" autoComplete="off"
              value={a.targetTXR ?? ''} onChange={setField('targetTXR')} disabled={!editable}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'var(--ink65)' }}>€/h</span>
          </span>
        </label>
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: insight.banner ? 12 : 0 }}>
        {insight.phrase}
      </div>

      {insight.banner ? (
        <div style={{
          padding: '12px 16px',
          border: '1px solid ' + BANNER_STYLE[insight.banner.class].border,
          background: BANNER_STYLE[insight.banner.class].bg,
          color: BANNER_STYLE[insight.banner.class].color
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            <span style={{ marginRight: 8 }}>{insight.banner.icon}</span>{insight.banner.title}
          </div>
          <div style={{ fontSize: 12 }}>{insight.banner.detail}</div>
        </div>
      ) : null}
    </div>
  );
}
