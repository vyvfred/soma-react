import TexteLectureSeule from '../TexteLectureSeule.jsx';
import { useBudget } from '../../context/BudgetContext.jsx';
import { buildPeriodesPaie, payrollPayMonth, varDec2026Total, chargesReport2028, lissage5eSemaine, nbSemPeriode, msRoulantBaseMois } from '../../domain/calculations.js';
import { useNav } from '../../context/NavContext.jsx';
import { euro } from '../../domain/format.js';
import { useState } from 'react';
import { detailMSMois, feuillesDetailMS, LIGNES_DETAIL_MS } from '../../domain/detailMS.js';
import { telechargerClasseur } from '../../lib/importExcel.js';
import { avecCacheMoteur, M } from '../../domain/calculations.js';

// Détail du calcul de la masse salariale : une ligne par poste, une colonne par mois de paie, formules du mois choisi
function DetailCalculMS({ a }) {
  const [ouvert, setOuvert] = useState(false);
  const [mois, setMois] = useState(0);
  if (!ouvert) return <button data-testid="detail-ms-ouvrir" className="secondary" onClick={() => setOuvert(true)} style={{ marginTop: 14, fontSize: 12 }}>▸ Détail du calcul de la masse salariale</button>;
  const d = avecCacheMoteur(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => detailMSMois(a, m)));
  const cell = { padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' };
  const dm = d[mois];
  return (
    <div data-testid="detail-ms" style={{ marginTop: 14, padding: 14, border: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Détail du calcul de la masse salariale</h3>
        <span style={{ flex: 1 }} />
        <button data-testid="detail-ms-export" className="secondary" style={{ fontSize: 12 }} onClick={() => telechargerClasseur(feuillesDetailMS(a), 'SOMA_detail_masse_salariale_' + a.name.replace(/\s+/g, '_') + '_2027.xlsx')}>⬇ Exporter (Excel)</button>
        <button className="secondary" style={{ fontSize: 12 }} onClick={() => setOuvert(false)}>Fermer</button>
      </div>
      <p className="hint" style={{ fontSize: 12, margin: '0 0 10px' }}>Salaires de base mensualisés ; variables (HS, retenues) rattachées à la période de paie, au prorata des jours. Cliquez sur un mois pour afficher ses formules. Le total de chaque colonne est la masse salariale du mois.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: 'left' }}>Poste</th>
              {d.map((x, m) => <th key={m} style={{ ...cell, cursor: 'pointer', background: m === mois ? 'rgba(139,127,255,.15)' : undefined }} onClick={() => setMois(m)}>{M[m]}</th>)}
              <th style={cell}>Total</th>
            </tr>
          </thead>
          <tbody>
            {LIGNES_DETAIL_MS.map(([cle, lib], i) => {
              const v = d.map((x) => (x.lignes[i] ? x.lignes[i].montant : 0));
              if (v.every((x) => Math.abs(x) < 0.5)) return null;
              return (
                <tr key={cle}>
                  <td style={{ ...cell, textAlign: 'left' }}>{lib}</td>
                  {v.map((x, m) => <td key={m} style={{ ...cell, color: x < 0 ? 'var(--orange, #c45300)' : undefined, background: m === mois ? 'rgba(139,127,255,.08)' : undefined }}>{Math.abs(x) >= 0.5 ? Math.round(x).toLocaleString('fr-FR') : ''}</td>)}
                  <td style={{ ...cell, fontWeight: 700 }}>{Math.round(v.reduce((s, x) => s + x, 0)).toLocaleString('fr-FR')}</td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
              <td style={{ ...cell, textAlign: 'left' }}>Total masse salariale</td>
              {d.map((x, m) => <td key={m} data-testid={'detail-ms-total-' + m} style={{ ...cell, background: m === mois ? 'rgba(139,127,255,.08)' : undefined }}>{Math.round(x.total).toLocaleString('fr-FR')}</td>)}
              <td style={cell}>{Math.round(d.reduce((s, x) => s + x.total, 0)).toLocaleString('fr-FR')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {dm && dm.periode ? (
        <div data-testid="detail-ms-formules" style={{ marginTop: 12 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 13 }}>Formules — paie {/^[aeiou]/i.test(dm.periode.mois) ? 'd\'' : 'de '}{dm.periode.mois.toLowerCase()} ({dm.periode.debut.split('-').reverse().join('/')} – {dm.periode.fin.split('-').reverse().join('/')})</h4>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <tbody>
              {dm.lignes.filter((l) => Math.abs(l.montant) >= 0.5 || l.cle === 'base').map((l) => (
                <tr key={l.cle} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 6px', width: '28%' }}>{l.lib}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap', width: '12%', fontWeight: 700, color: l.montant < 0 ? 'var(--orange, #c45300)' : undefined }}>{euro(Math.round(l.montant))}</td>
                  <td style={{ padding: '4px 6px', color: 'var(--ink65)' }}>{l.formule}</td>
                </tr>
              ))}
              <tr><td style={{ padding: '6px', fontWeight: 700 }}>Total</td><td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{euro(Math.round(dm.total))}</td><td /></tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

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
        Le calendrier de paie 2027 compte <b>{nb5sem} mois à 5 semaines</b> : les salaires de base sont mensualisés (le même montant chaque mois), seules les variables (heures supplémentaires, retenues d'absence) suivent la période de paie, et les heures supplémentaires de la 5e semaine sont lissées sur le trimestre. La paie de janvier comprend les variables de décembre 2026 de sa période.{' '}
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
          <TexteLectureSeule />
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
              <th style={{ textAlign: 'right', padding: '6px 8px' }} title="Salaire de base mensualisé des roulants : heures du contrat × 52/12 × taux horaire du mois, au prorata des entrées et sorties">dont salaire de base roulants</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }} title="4 semaines de variables par mois : la 5e semaine de HS est lissée sur le trimestre">dont lissage 5e semaine</th>
            </tr>
          </thead>
          <tbody>
            {periodes.map((p, i) => {
              const ms = msReady ? euro(Math.round(payrollPayMonth(a, i))) : '—';
              const dec = i === 0 && hasDec ? euro(Math.round(totalDec)) : '';
              const bd = msReady ? msRoulantBaseMois(a, i) : 0;
              const t5 = nbSemPeriode(p) === 5;
              const lis = msReady ? lissage5eSemaine(a, i) : 0;
              return (
                <tr key={i} style={t5 ? { background: 'rgba(74,158,255,.05)' } : null}>
                  <td style={{ padding: '4px 8px' }}><b>{p.mois}</b>{t5 ? <span style={{ fontSize: 10, color: 'var(--blue2, #3d6fd6)', fontWeight: 700, marginLeft: 4 }}>5 sem.</span> : null}</td>
                  <td style={{ padding: '2px 8px' }}><input type="date" value={p.debut} disabled={!editable} onChange={(e) => setDate(i, 'debut', e.target.value)} style={{ width: 150, fontSize: 12 }} /></td>
                  <td style={{ padding: '2px 8px' }}><input type="date" value={p.fin} disabled={!editable} onChange={(e) => setDate(i, 'fin', e.target.value)} style={{ width: 150, fontSize: 12 }} /></td>
                  <td style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', padding: '4px 8px' }}>{nbSemPeriode(p)}</td>
                  <td className="num" style={{ padding: '4px 8px' }}><b>{ms}</b></td>
                  <td className="num" style={{ color: 'var(--blue2, #3d6fd6)', padding: '4px 8px' }}>{dec}</td>
                  <td className="num" data-testid={'base-' + i} style={{ color: 'var(--ink65)', padding: '4px 8px' }}>{bd > 0 ? euro(Math.round(bd)) : ''}</td>
                  <td className="num" data-testid={'lissage-' + i} style={{ color: lis < 0 ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)', padding: '4px 8px' }}>{Math.abs(lis) >= 0.5 ? (lis > 0 ? '+' : '') + euro(Math.round(lis)) : ''}</td>
                </tr>
              );
            })}
          </tbody>
          {msReady ? (
            <tfoot>
              <tr style={{ background: 'var(--bg2)' }}>
                <td colSpan={4} style={{ padding: '6px 8px' }}><b>Total masse salariale 2027 (selon périodes de paie)</b></td>
                <td className="num" style={{ padding: '6px 8px' }}><b style={{ color: 'var(--violet2, var(--violet))' }}>{euro(Math.round(totalMS))}</b></td>
                <td></td><td></td><td></td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {msReady ? <DetailCalculMS a={a} /> : null}

      {a.costHour && a.cal && a.cal.length && chargesReport2028(a) > 0 ? (
        <div data-testid="report-2028" style={{ marginTop: 14, padding: 14, background: 'rgba(196,83,0,.08)', border: '1px solid var(--orange, #c45300)' }}>
          <h3 style={{ margin: '0 0 8px', color: 'var(--orange, #c45300)', fontSize: 15 }}>Charges à reporter sur paie Janvier 2028</h3>
          <p className="hint" style={{ margin: '0 0 8px', fontSize: 12 }}>Les variables du 06/12/2027 au 31/12/2027 (heures supplémentaires et retenues d'absence) ne seront pas comptabilisées en 2027 : elles apparaîtront en paie de janvier 2028. Les salaires de base de décembre 2027 sont payés en décembre.</p>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--orange, #c45300)' }}>{euro(chargesReport2028(a))}</div>
        </div>
      ) : null}

      {editable ? (
        <div style={{ marginTop: 14 }}>
          <button className="secondary" onClick={reset}>Réinitialiser le calendrier par défaut</button>
        </div>
      ) : null}
    </div>
  );
}
