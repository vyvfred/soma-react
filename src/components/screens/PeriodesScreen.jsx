import { useBudget } from '../../context/BudgetContext.jsx';
import { buildPeriodesPaie, payrollPayMonth, varDec2026Total } from '../../domain/calculations.js';
import { useNav } from '../../context/NavContext.jsx';
import { euro } from '../../domain/format.js';

export default function PeriodesScreen() {
  const { agency: a, loading, error, editable, update, agenceNom } = useBudget();
  const navigate = useNav();

  if (!agenceNom) return <div className="card"><h2>Périodes de paie</h2><p className="hint">Ouvrez une agence pour configurer ses périodes de paie.</p></div>;
  if (loading) return <div className="card"><h2>Périodes de paie</h2><p className="hint">Chargement…</p></div>;
  if (error) return <div className="card"><h2>Périodes de paie</h2><p className="hint">Erreur : {error}</p></div>;
  if (!a) return <div className="card"><h2>Périodes de paie — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const periodes = (a.periodesPaie && a.periodesPaie.length) ? a.periodesPaie : buildPeriodesPaie();
  const nb5sem = periodes.filter((p) => p.nbSem === 5).length;
  const totalDec = varDec2026Total(a);
  const hasDec = totalDec > 0;
  const msReady = a.costHour && a.cal && a.cal.length;
  const totalMS = msReady ? periodes.reduce((s, _, i) => s + payrollPayMonth(a, i), 0) : 0;

  function setDate(idx, field, val) {
    update((draft) => {
      const pp = (draft.periodesPaie && draft.periodesPaie.length ? draft.periodesPaie : buildPeriodesPaie()).slice();
      pp[idx] = { ...pp[idx], [field]: val };
      draft.periodesPaie = pp;
      return draft;
    });
  }
  function reset() {
    if (!window.confirm('Réinitialiser le calendrier avec les dates par défaut ?')) return;
    update((draft) => { draft.periodesPaie = buildPeriodesPaie(); return draft; });
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 12 }}>Périodes de paie 2027 — {a.name}</h2>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}>
        Le calendrier de paie 2027 compte <b>{nb5sem} mois à 5 semaines</b>, dont la charge de personnel sera plus élevée.{' '}
        {hasDec ? 'Les variables de décembre 2026 sont renseignées.' : 'Pensez à saisir les variables de décembre 2026 incluses dans la paie de janvier.'}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', padding: '12px 14px', border: '1px solid var(--blue2, #3d6fd6)', background: 'rgba(74,158,255,.08)' }}>
        <span id="varDecResume" style={{ fontSize: 13 }}>
          {hasDec
            ? <>Variables de décembre 2026 : <b>{euro(Math.round(totalDec))}</b> chargés, ajoutés à la paie de janvier.</>
            : <span style={{ color: 'var(--orange, #c45300)' }}>Variables de décembre 2026 non saisies pour cette agence.</span>}
        </span>
        <button className="secondary" onClick={() => navigate('variablesdec')} style={{ fontSize: 12 }}>Saisir les variables de décembre 2026 →</button>
      </div>

      {!editable ? (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.10))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 13, color: 'var(--blue2, #3d6fd6)' }}>
          🔒 Budget engagé dans le circuit de validation — lecture seule.
        </div>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Mois de paie</th>
              <th style={{ padding: '6px 8px' }}>Début période</th>
              <th style={{ padding: '6px 8px' }}>Fin période</th>
              <th style={{ padding: '6px 8px' }}>Nb semaines</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>MS calculée</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>dont var. déc. 2026</th>
            </tr>
          </thead>
          <tbody>
            {periodes.map((p, i) => {
              const ms = msReady ? euro(Math.round(payrollPayMonth(a, i))) : '—';
              const dec = i === 0 && hasDec ? euro(Math.round(totalDec)) : '';
              const t5 = p.nbSem === 5;
              return (
                <tr key={i} style={t5 ? { background: 'rgba(74,158,255,.05)' } : null}>
                  <td style={{ padding: '4px 8px' }}><b>{p.mois}</b>{t5 ? <span style={{ fontSize: 10, color: 'var(--blue2, #3d6fd6)', fontWeight: 700, marginLeft: 4 }}>5 sem.</span> : null}</td>
                  <td style={{ padding: '2px 8px' }}><input type="date" value={p.debut} disabled={!editable} onChange={(e) => setDate(i, 'debut', e.target.value)} style={{ width: 150, fontSize: 12 }} /></td>
                  <td style={{ padding: '2px 8px' }}><input type="date" value={p.fin} disabled={!editable} onChange={(e) => setDate(i, 'fin', e.target.value)} style={{ width: 150, fontSize: 12 }} /></td>
                  <td style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', padding: '4px 8px' }}>{p.nbSem}</td>
                  <td className="num" style={{ padding: '4px 8px' }}><b>{ms}</b></td>
                  <td className="num" style={{ color: 'var(--blue2, #3d6fd6)', padding: '4px 8px' }}>{dec}</td>
                </tr>
              );
            })}
          </tbody>
          {msReady ? (
            <tfoot>
              <tr style={{ background: 'var(--bg2)' }}>
                <td colSpan={4} style={{ padding: '6px 8px' }}><b>Total masse salariale 2027 (selon périodes de paie)</b></td>
                <td className="num" style={{ padding: '6px 8px' }}><b style={{ color: 'var(--violet2, var(--violet))' }}>{euro(Math.round(totalMS))}</b></td>
                <td></td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {editable ? (
        <div style={{ marginTop: 14 }}>
          <button className="secondary" onClick={reset}>Réinitialiser le calendrier par défaut</button>
        </div>
      ) : null}
    </div>
  );
}
