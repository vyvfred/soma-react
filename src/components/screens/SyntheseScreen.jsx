import { useBudget } from '../../context/BudgetContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { syntheseBudget, coutChoix, bilanEnveloppesCP, indicateursDetailles } from '../../domain/syntheseBudget.js';
import { euro, pct } from '../../domain/format.js';
import { Pourquoi } from '../Vision.jsx';

// Écran Synthèse — port de renderSynthese, renderCoutChoix, renderEnveloppesCP,
// renderDashboard et renderFinance.
function KpiCard({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

function Barres({ barres }) {
  const max = Math.max(1, ...barres.map((b) => Math.abs(b.value)));
  return (
    <div className="barChart">
      {barres.map((b) => (
        <div className="barGroup" key={b.label}>
          <div className={'bar ' + b.cls} style={{ height: Math.max(2, (Math.abs(b.value) / max) * 180) }} title={b.label + ' : ' + euro(b.value)} />
          <div className="barLabel">{b.label}</div>
        </div>
      ))}
    </div>
  );
}

const repli = { border: '1px solid var(--border)', marginTop: 14 };
const sommaire = { cursor: 'pointer', padding: '10px 14px', fontWeight: 600, fontSize: 14 };

export default function SyntheseScreen() {
  const { agency: a, loading, error, agenceNom } = useBudget();
  const { profile } = useAuth();

  if (!agenceNom) return <div className="card"><h2>Synthèse</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Synthèse</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Synthèse</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Synthèse — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const s = syntheseBudget(a, profile && profile.role);
  const choix = coutChoix(a);
  const env = bilanEnveloppesCP(a);
  const ind = indicateursDetailles(a, profile && profile.role);
  const maxMois = Math.max(1, ...ind.caMensuel.map((x) => x.value));
  const coulVerdict = s.verdict.ok ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)';

  return (
    <div className="card">
      <h2 style={{ marginBottom: 18 }}>Synthèse du budget — {a.name || agenceNom} 2027</h2>

      <div data-testid="synthese-verdict" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 18px', marginBottom: 16, border: '1px solid ' + coulVerdict, background: s.verdict.ok ? 'rgba(46,125,111,.08)' : 'rgba(196,83,0,.08)' }}>
        <span style={{ fontSize: 22, color: coulVerdict, fontWeight: 700 }}>{s.verdict.icone}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: coulVerdict }}>{s.verdict.titre}</div>
          <div style={{ fontSize: 13, color: 'var(--ink65)', marginTop: 4 }}>{s.verdict.detail}</div>
        </div>
      </div>

      <div className="kpis" style={{ marginBottom: 16 }}>{s.kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>

      {s.lecture ? (
        <div data-testid="synthese-lecture" style={{ display: 'flex', gap: 10, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}>
          <span>💬</span><span dangerouslySetInnerHTML={{ __html: s.lecture }} />
        </div>
      ) : null}

      {choix ? (
        <div data-testid="cout-choix" style={{ padding: '14px 18px', border: '1px solid ' + (choix.surcout <= 0 ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)'), marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>{choix.surcout <= 0 ? '✓' : '⚖️'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {choix.surcout <= 0 ? 'Répartition des congés optimale' : <>Choix de répartition : surcoût de <b>{euro(choix.surcout)}</b></>} <Pourquoi k="coutchoix" />
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink65)', marginTop: 4 }}>
                {choix.surcout <= 0
                  ? 'Votre répartition des CP minimise le recours aux heures supplémentaires. Aucun surcoût.'
                  : <>Vous avez réparti certains congés différemment de l'optimum, pour {choix.semaines.length} semaine{choix.semaines.length > 1 ? 's' : ''}.
                    {' '}Ce choix (souvent pour le climat social) représente environ <b>{choix.hsSup} h supplémentaires</b> sur l'année. C'est une décision de gestion à assumer et à valider.</>}
              </div>
            </div>
          </div>
          {choix.surcout > 0 && choix.semaines.length ? (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Détail des choix de répartition</summary>
              {choix.semaines.map((w) => (
                <div key={w.week} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>Semaine {w.week} ({w.nomMois})</span>
                  <span style={{ color: 'var(--ink65)' }}>optimal : {w.optimal} j → choisi : {w.reel} j <b style={{ color: 'var(--orange, #c45300)' }}>({w.ecart > 0 ? '+' : ''}{w.ecart} j de CP)</b></span>
                </div>
              ))}
            </details>
          ) : null}
        </div>
      ) : null}

      <details style={repli} data-testid="synthese-graphiques">
        <summary style={sommaire}>Graphiques détaillés (CA, résultats, ratios)</summary>
        <div style={{ padding: '4px 14px 14px' }}>
          <div className="chartGrid">
            <div className="chartBox">
              <div className="chartTitle">CA : 2026 vs Objectif vs Budget</div>
              <Barres barres={ind.barresCA} />
              <div className="legend"><span><div className="sw g" />2026</span><span><div className="sw o" />Objectif</span><span><div className="sw v" />Budget</span></div>
            </div>
            <div className="chartBox"><div className="chartTitle">Résultats</div><Barres barres={ind.barresResultat} /></div>
            <div className="chartBox">
              <div className="chartTitle">CA mensuel budgété</div>
              <div className="lineMini">
                {ind.caMensuel.map((x) => <div key={x.mois} className="lineBar" style={{ height: Math.max(2, (x.value / maxMois) * 180) }} title={x.mois + ' : ' + euro(x.value)} />)}
              </div>
            </div>
            <div className="chartBox">
              <div className="chartTitle">Ratios clés</div>
              {ind.ratios.map((r) => {
                const v = Math.max(0, Math.min(100, Number(r.value) || 0));
                return <div className="ratioRow" key={r.label}><b>{r.label}</b><div className="gauge"><div className="gaugeFill" style={{ width: v + '%' }} /></div><span>{pct(v)}</span></div>;
              })}
            </div>
          </div>

          {env ? (
            <div data-testid="synthese-enveloppes" style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Répartition des congés par période légale</div>
              <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', maxWidth: 560 }}>
                <thead><tr style={{ color: 'var(--ink65)', textAlign: 'right' }}><th style={{ textAlign: 'left', padding: 6 }}>Période</th><th style={{ padding: 6 }}>Cible légale</th><th style={{ padding: 6 }}>CP posés</th><th style={{ padding: 6 }}>Écart</th></tr></thead>
                <tbody>
                  {env.lignes.map((l) => (
                    <tr key={l.nom} style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>
                      <td style={{ textAlign: 'left', padding: 6 }}>{l.nom}</td>
                      <td style={{ padding: 6 }}>{l.cible} j</td>
                      <td style={{ padding: 6 }}><b>{l.poses} j</b></td>
                      <td style={{ padding: 6, fontWeight: 600, color: l.conforme ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>{l.ecartTxt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {env.alertes.map((t) => <div key={t} style={{ fontSize: 12, color: 'var(--ink65)', marginTop: 8 }}>⚖ {t}</div>)}
              {env.reliquat ? (
                <div style={{ fontSize: 12, color: 'var(--orange, #c45300)', marginTop: 8 }}>
                  ⚠ <b>{env.reliquat} jours de CP</b> n'ont pas pu être répartis automatiquement (les semaines disponibles ont atteint leur niveau d'équilibre). Déverrouillez un mois ou placez-les manuellement.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>

      <details style={repli} open data-testid="synthese-indicateurs">
        <summary style={sommaire}>Tous les indicateurs financiers</summary>
        <div style={{ padding: '4px 14px 14px' }}>
          <div className="kpis">{ind.dash.map((k) => <KpiCard key={k.label} {...k} />)}</div>
          <div style={{ height: 12 }} />
          <div className="kpis">{ind.fin.map((k) => <KpiCard key={k.label} {...k} />)}</div>
        </div>
      </details>
    </div>
  );
}
