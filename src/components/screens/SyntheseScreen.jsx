import { useBudget } from '../../context/BudgetContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { syntheseBudget, coutChoix, bilanEnveloppesCP, indicateursDetailles } from '../../domain/syntheseBudget.js';
import { euro, pct } from '../../domain/format.js';
import { Pourquoi } from '../Vision.jsx';
import { totauxCalendrier } from '../../domain/calTotaux.js';
import { montant } from '../../domain/memoSIG.js';
import { M, caFunMois, avecCacheMoteur, estStructure } from '../../domain/calculations.js';
import { syntheseVue, syntheseVueHTML, svAvancementHTML } from '../../domain/syntheseVue.js';
import { avancementBudget } from '../../domain/avancement.js';
import Comparaisons, { useReperesAgence, LignesMSHistoriques } from '../Comparaisons.jsx';
import { completerAtterrissageCA } from '../../domain/reperes.js';

// Écran Synthèse — port de renderSynthese, renderCoutChoix, renderEnveloppesCP,
// renderDashboard et renderFinance.
// CA mensuel budgété avec, sous chaque mois, les jours ouvrés et les jours de vacances scolaires (VS)
const kEuro = (v) => { v = +v || 0; return Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2).replace('.', ',') + ' M€' : Math.round(v / 1000) + ' k€'; };
function CAMensuel({ a, caMensuel, max }) {
  const t = totauxCalendrier(a.cal, M.map((_, m) => caFunMois(a, m))).mois;
  return (
    <div className="chartBox" style={{ gridColumn: '1/-1' }} data-testid="ca-mensuel">
      <div className="chartTitle">CA mensuel budgété, jours de semaine hors vacances et jours de vacances scolaires</div>
      <div className="caMois">
        {caMensuel.map((x) => (
          <div key={x.mois} className="caMoisCol" title={x.mois + ' : ' + euro(x.value)}>
            <div className="caMoisVal">{kEuro(x.value)}</div>
            <div className="caMoisBar" style={{ height: Math.max(2, (x.value / max) * 170) }} />
          </div>
        ))}
      </div>
      <div className="caMoisPied">
        {caMensuel.map((x, i) => <div key={x.mois}><b>{x.mois}</b>{t[i].ouvres} sem.<br />{t[i].vacances} VS</div>)}
      </div>
      <div className="caMoisLeg">sem. = jours de semaine hors vacances scolaires · VS = jours de semaine en vacances scolaires (zone {a.schoolZone || '?'})</div>
    </div>
  );
}

// Masse salariale / CA mois par mois (charges de personnel, quotes-parts comprises, comme l'indicateur annuel)
// Sans seuil d'alerte (nov. 2026) : le ratio se lit face à 2026, 2025 et à la moyenne du réseau
function RatioMSMensuel({ a, rep }) {
  const ca = M.map((_, m) => montant(a, "Chiffre d'affaires", m));
  const ms = M.map((_, m) => montant(a, 'Charges de personnel', m));
  const caAn = ca.reduce((x, y) => x + y, 0), msAn = ms.reduce((x, y) => x + y, 0);
  const ratio = (c, s) => (c > 0 ? (s / c) * 100 : null);
  const cel = { padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' };
  const fmtR = (r) => (r === null ? '—' : pct(r));
  return (
    <div data-testid="ratio-ms-mensuel" data-visite="ms-ca" className="sv-carte">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ color: 'var(--ink65)' }}><th style={{ ...cel, textAlign: 'left' }}></th>{M.map((m) => <th key={m} style={cel}>{m}</th>)}<th style={cel}>Année</th></tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: '1px solid var(--border)' }}><td style={{ ...cel, textAlign: 'left' }}>CA</td>{ca.map((v, m) => <td key={m} className="num" style={cel}>{kEuro(v)}</td>)}<td className="num" style={{ ...cel, fontWeight: 700 }}>{kEuro(caAn)}</td></tr>
            <tr style={{ borderTop: '1px solid var(--border)' }}><td style={{ ...cel, textAlign: 'left' }}>Masse salariale</td>{ms.map((v, m) => <td key={m} className="num" style={cel}>{kEuro(v)}</td>)}<td className="num" style={{ ...cel, fontWeight: 700 }}>{kEuro(msAn)}</td></tr>
            <tr style={{ borderTop: '1px solid var(--border)', fontWeight: 700 }}>
              <td style={{ ...cel, textAlign: 'left' }}>MS / CA</td>
              {M.map((_, m) => { const r = ratio(ca[m], ms[m]); return <td key={m} className="num" data-testid={'ratio-ms-' + m} style={cel}>{fmtR(r)}</td>; })}
              <td className="num" style={cel}>{fmtR(ratio(caAn, msAn))}</td>
            </tr>
            {rep ? <LignesMSHistoriques r={completerAtterrissageCA(rep.r, a.histCA)} reseau={rep.reseau} /> : null}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '0.85em', color: 'var(--ink65)', marginTop: 6 }}>Masse salariale = charges de personnel du mois (quotes-parts comprises). Les lignes grisées situent le budget face au réalisé 2026 (estimation du contrôle de gestion pour les mois non clos), à 2025 et à la moyenne du réseau.</div>
    </div>
  );
}

const repli = { border: '1px solid var(--border)', marginTop: 14 };
const sommaire = { cursor: 'pointer', padding: '10px 14px', fontWeight: 600, fontSize: 14 };

export default function SyntheseScreen() {
  const { agency: a, loading, error, agenceNom } = useBudget();
  const { profile } = useAuth();
  const rep = useReperesAgence(agenceNom);

  if (!agenceNom) return <div className="card"><h2>Synthèse</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Synthèse</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Synthèse</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Synthèse — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const s = syntheseBudget(a, profile && profile.role);
  const choix = coutChoix(a);
  const env = bilanEnveloppesCP(a);
  const ind = indicateursDetailles(a, profile && profile.role);
  const maxMois = Math.max(1, ...ind.caMensuel.map((x) => x.value));

  const role = profile && profile.role;
  const valideur = ['dr', 'df', 'dg', 'pdg'].includes(role);
  const v = avecCacheMoteur(() => syntheseVue(a, rep.r, rep.reseau, { libResultat: s.kpis[1].label, resultat: s.net }));
  const struct = estStructure(a);
  const ton = s.verdict.ok ? 'ok' : 'attention';

  return (
    <div className="card syntheseGrand">
      <div className="sv-entete">
        <div>
          <h2>Synthèse 2027 — {a.name || agenceNom}</h2>
          <div className="sv-soustitre">L'essentiel du budget, comparé à 2026, à 2025 et à la moyenne du réseau. Aucune valeur n'est imposée : les écarts servent à expliquer les choix.</div>
        </div>
      </div>

      <div data-testid="synthese-verdict" className={'sv-bandeau ' + ton}>
        <div>
          <b>{s.verdict.ok ? 'Budget équilibré' : s.verdict.titre.replace('Points à examiner : ', 'À regarder : ')}</b>
          {s.lecture ? <div data-testid="synthese-lecture" dangerouslySetInnerHTML={{ __html: s.lecture }} /> : null}
        </div>
      </div>

      {role === 'rex' ? <div dangerouslySetInnerHTML={{ __html: svAvancementHTML(avancementBudget(a)) }} /> : null}

      <div data-testid="synthese-vue" dangerouslySetInnerHTML={{ __html: syntheseVueHTML(v, { valideur }) }} />

      <details className="sv-section" open>
        <summary>Masse salariale / CA, mois par mois</summary>
        <RatioMSMensuel a={a} rep={rep} />
      </details>

      <details className="sv-section" open={valideur || role === 'cg' || role === 'df'}>
        <summary>Comparaisons par poste</summary>
        <Comparaisons a={a} r={rep.r} reseau={rep.reseau} />
      </details>

      {struct ? null : (
        <details className="sv-section" data-testid="synthese-graphiques">
          <summary>Congés, heures supplémentaires et calendrier du CA</summary>
          <div style={{ paddingTop: 6 }}>
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

            <div className="chartGrid"><CAMensuel a={a} caMensuel={ind.caMensuel} max={maxMois} /></div>
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
                    ⚠ <b>{env.reliquat} jours de CP</b> n'ont pas pu être répartis automatiquement (plus de semaine libre avec assez de salariés présents). Déverrouillez un mois ou placez-les manuellement.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </details>
      )}
    </div>
  );
}
