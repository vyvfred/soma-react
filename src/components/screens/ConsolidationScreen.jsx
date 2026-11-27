import { estDetailSIG, libLigneSIG } from '../../domain/calculations.js';
import StatutConsultable from '../StatutConsultable.jsx';
import { useEffect, useMemo, useState } from 'react';
import { consolideReseau, feuilleConsolide } from '../../domain/consolideSIG.js';
import { T, STRUCTURES, LIB_STRUCTURES } from '../../domain/calculations.js';
import { pct } from '../../domain/format.js';
import { loadNetworkBudgets, loadAgencesRegion } from '../../lib/budgetApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { agencesOps } from '../../config/agences.js';
import { statutLabel } from '../../config/statut.js';
import { computeConsolidation } from '../../domain/consolidation.js';
import { detailAvancement } from '../../domain/avancement.js';
import { euro } from '../../domain/format.js';
import { useNav } from '../../context/NavContext.jsx';
import { feuillesConsolidation, nomFichierConsolidation } from '../../domain/exportConsolidation.js';
import BoutonExportDetaille from '../BoutonExportDetaille.jsx';
import { fichierDepuisReseau } from '../../domain/exportAgenceSources.js';
import { classeurReseau, nomFichierReseau } from '../../domain/exportReseau.js';
import { telechargerClasseur } from '../../lib/importExcel.js';
import DossierOmnisian from '../DossierOmnisian.jsx';

function Kpi({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

// Barre d'avancement de la construction d'un budget (survol : détail des jalons)
function Avancement({ av, statut }) {
  const fini = statut && statut !== 'brouillon';
  const p = fini ? 100 : av.pct;
  const col = p >= 90 ? 'var(--green, #2e7d6f)' : p >= 50 ? 'var(--amber)' : 'var(--orange, #c45300)';
  return (
    <div title={detailAvancement(av)} data-testid="avancement" style={{ minWidth: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: p + '%', height: '100%', background: col }} /></div>
        <b style={{ fontSize: 11, color: col }}>{fini ? 'soumis' : p + ' %'}</b>
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink65)' }}>{av.moisValides}/12 mois validés · charges {av.chargesPct} %</div>
      {!fini && av.joursSansModif !== null && av.joursSansModif >= 7 ? <div style={{ fontSize: 10, color: 'var(--orange, #c45300)' }}>sans modification depuis {av.joursSansModif} j</div> : null}
    </div>
  );
}

const ALERT_COLOR = { crit: 'var(--orange, #c45300)', warn: 'var(--amber)', info: 'var(--blue2, #3d6fd6)' };

export default function ConsolidationScreen() {
  const [state, setState] = useState({ loading: true, error: null, map: null });
  const [k, setK] = useState(0);
  const [exportEtat, setExportEtat] = useState('');
  const { profile } = useAuth();
  const nav = useNav();
  // Lien discret vers le détail des calculs de l'agence (contrôle de gestion, direction financière, directions nationales)
  const lienDetail = ['cg', 'df', 'dg', 'pdg'].includes(profile && profile.role);
  // DR : périmètre limité aux agences de sa région, sans les structures du siège
  const estDR = !!(profile && profile.role === 'dr');

  useEffect(() => {
    let active = true;
    Promise.all([loadNetworkBudgets(), estDR ? loadAgencesRegion(profile.region_id) : Promise.resolve(null)])
      .then(([map, region]) => { if (active) setState({ loading: false, error: null, map, region }); })
      .catch((err) => { if (active) setState({ loading: false, error: err.message || 'Erreur de chargement', map: null }); });
    return () => { active = false; };
  }, [k]);
  // Compte de résultat consolidé : agences + 4 structures (calculé une fois par chargement)
  const conso = useMemo(() => {
    if (!state.map) return null;
    const opsC = state.region ? agencesOps().filter((o) => state.region.includes(o.nom)) : agencesOps();
    try { return consolideReseau(state.map, opsC, !!state.region); } catch (e) { return { erreur: e.message }; }
  }, [state.map, state.region]);

  if (state.loading) return <div className="card"><h2>Consolidation</h2><p className="hint">Chargement des budgets du réseau…</p></div>;
  if (state.error) return <div className="card"><h2>Consolidation</h2><p className="hint">Erreur : {state.error}</p></div>;

  const ops = state.region ? agencesOps().filter((o) => state.region.includes(o.nom)) : agencesOps();
  if (state.region && !ops.length) {
    return <div className="card"><h2>Consolidation de ma région</h2><p className="hint" data-testid="conso-region-vide">Aucune agence n'est encore rattachée à votre région. Le contrôleur de gestion doit vous les affecter.</p></div>;
  }
  const region = !!state.region;
  const cols = region ? [] : STRUCTURES;
  // Les structures (Siège, Formation…) ne comptent pas dans l'avancement des agences
  const mapAgences = Object.fromEntries(Object.entries(state.map || {}).filter(([nom]) => ops.some((o) => o.nom === nom)));
  const c = computeConsolidation(mapAgences, ops);

  let insight = '<b>' + c.deposes + ' agence' + (c.deposes > 1 ? 's' : '') + ' sur ' + c.total + '</b> ont déposé leur budget';
  if (c.valides > 0) insight += ', dont <b>' + c.valides + '</b> validé' + (c.valides > 1 ? 's' : '') + ' définitivement';
  insight += '. ';
  if (c.avancementMoyen !== null) insight += 'Les <b>' + c.brouillons + ' budget' + (c.brouillons > 1 ? 's' : '') + ' en brouillon</b> sont construits à <b>' + c.avancementMoyen + ' %</b> en moyenne. ';
  if (c.nonDeposes > 0) insight += '<b>' + c.nonDeposes + '</b> agence' + (c.nonDeposes > 1 ? 's n\'ont' : ' n\'a') + ' pas encore commencé. ';
  if (c.aRelancer.length) insight += '<span style="color:var(--orange)">Sans modification depuis une semaine ou plus : <b>' + c.aRelancer.join(', ') + '</b>.</span> ';
  if (c.caReseauTotal > 0) insight += 'Le CA réseau consolidé atteint <b>' + euro(c.caReseauTotal) + '</b>. ';
  if (c.agencesAtypiques.length > 0) {
    insight += '<b>' + c.agencesAtypiques.length + ' agence' + (c.agencesAtypiques.length > 1 ? 's' : '') + '</b> présente' + (c.agencesAtypiques.length > 1 ? 'nt' : '') + ' un taux de charge élevé (objectif au-dessus de la capacité) : ' + c.agencesAtypiques.slice(0, 3).join(', ') + (c.agencesAtypiques.length > 3 ? '…' : '') + '.';
  } else if (c.deposes > 0) {
    insight += 'Aucune agence en surcharge critique.';
  }

  const txChargeColor = (t) => (t > 115 ? 'var(--orange, #c45300)' : t > 100 ? 'var(--amber)' : t > 85 ? 'var(--accent-blue, #3d6fd6)' : 'var(--green, #2e7d6f)');

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>{region ? 'Consolidation de ma région' : 'Consolidation réseau'}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{lienDetail || estDR ? <BoutonExportDetaille testid="export-detaille-toutes" libelle="📦 Budgets détaillés (zip)" nomZip={'SOMA_budgets_detailles_2027_' + new Date().toISOString().slice(0, 10) + '.zip'} titre="Un classeur Excel détaillé par agence, avec tous les calculs"
          fichiers={() => Object.keys(mapAgences).map((nom) => { try { return fichierDepuisReseau(nom, mapAgences[nom], profile.role); } catch (e) { return null; } })} /> : null}{lienDetail || estDR ? <BoutonExportDetaille testid="export-reseau-compile" libelle={region ? '📊 Budget région compilé (Excel)' : '📊 Budget réseau compilé (Excel)'} titre="Un seul classeur avec toutes les agences : synthèse, compte de résultat par entité et consolidé par mois, heures supplémentaires, base de données"
          fichiers={() => ({ nom: nomFichierReseau(region), modele: classeurReseau(state.map || {}, ops, { region }) })} /> : null}<button data-testid="actualiser" onClick={() => setK((x) => x + 1)} style={{ width: 'auto', margin: 0, fontSize: 11, padding: '6px 12px' }}>↺ Actualiser</button><button data-testid="export-consolidation" disabled={exportEtat === 'cours'}
          onClick={async () => {
            setExportEtat('cours');
            try { await telechargerClasseur(feuillesConsolidation(mapAgences, ops).concat(conso && !conso.erreur ? [feuilleConsolide(conso, region)] : []), nomFichierConsolidation()); setExportEtat('ok'); }
            catch (e) { setExportEtat('erreur'); }
          }}
          style={{ width: 'auto', margin: 0, fontSize: 12, padding: '7px 14px', background: 'linear-gradient(135deg,var(--green),#45c87a)', color: '#fff', border: 'none', fontWeight: 700 }}>
          {exportEtat === 'cours' ? '⏳ Génération…' : exportEtat === 'ok' ? '✓ Exporté' : exportEtat === 'erreur' ? '⚠ Échec, réessayer' : '📥 Export Excel'}
        </button></div>
      </div>

      <div className="kpis" data-visite="conso-kpis" style={{ marginBottom: 16 }}>
        <Kpi label={region ? 'Agences de la région' : 'Agences réseau'} value={c.total} />
        <Kpi label="Budgets déposés" value={c.deposes} note={Math.round((c.deposes / c.total) * 100) + '%'} />
        <Kpi label="En brouillon" value={c.brouillons} />
        <Kpi label="Non commencés" value={c.nonDeposes} />
        <Kpi label="Validés Direction" value={c.valides} />
        <Kpi label="En cours validation" value={c.enCours} />
      </div>

      {!region && ['dg', 'df', 'pdg', 'admin'].includes(profile && profile.role) ? <DossierOmnisian profile={profile} /> : null}

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: insight }} />

      <div data-visite="conso-table" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Agence', 'Statut', 'Avancement', 'CA budgété', 'Capacité max', 'Taux charge', 'HS estimées', 'CP à répartir', 'Alertes', 'Mis à jour'].map((h, i) => (
                <th key={i} title={h === 'Avancement' ? 'Avancement du REX : objectif, références CA, équipe, absentéisme, mois validés. Survolez pour le détail.' : undefined} style={{ textAlign: i >= 3 && i <= 7 ? 'right' : 'left', padding: '6px 8px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r) => {
              if (!r.present) {
                return (
                  <tr key={r.nom}>
                    <td style={{ padding: '4px 8px' }}><b>{r.nom}</b></td>
                    <td style={{ padding: '4px 8px' }}><span className="statut brouillon">Non commencé</span></td>
                    <td style={{ padding: '4px 8px' }}><b style={{ fontSize: 11, color: 'var(--orange, #c45300)' }}>0 %</b></td>
                    <td colSpan={7} style={{ color: 'var(--ink30)', fontSize: 12, padding: '4px 8px' }}>Aucune donnée</td>
                  </tr>
                );
              }
              return (
                <tr key={r.nom}>
                  <td style={{ padding: '4px 8px' }}><b>{r.nom}</b><br /><span style={{ fontSize: 10, color: 'var(--ink65)' }}>Zone {r.zone}</span>{lienDetail || estDR ? <> · <BoutonExportDetaille petit testid={'export-detaille-' + r.nom} libelle="Excel détaillé" titre="Budget détaillé de l'agence avec tous les calculs (Excel)" fichiers={() => fichierDepuisReseau(r.nom, mapAgences[r.nom], profile.role)} /></> : null}{lienDetail ? <> · <button type="button" data-testid={'detail-calculs-' + r.nom} onClick={() => nav('justif', r.nom)} title="Détail des calculs de l'agence (lecture seule)" style={{ all: 'unset', cursor: 'pointer', fontSize: 10, color: 'var(--violet)', textDecoration: 'underline' }}>détail des calculs</button></> : null}</td>
                  <td style={{ padding: '4px 8px' }}><StatutConsultable agence={r.nom} statut={r.statut} /></td>
                  <td style={{ padding: '4px 8px' }}><Avancement av={r.av} statut={r.statut} /></td>
                  <td className="num" style={{ padding: '4px 8px' }}>{r.caB > 0 ? euro(r.caB) : '—'}</td>
                  <td className="num" style={{ padding: '4px 8px' }}>{r.caMax > 0 ? euro(r.caMax) : '—'}</td>
                  <td className="num" style={{ color: txChargeColor(r.txCharge), fontWeight: 700, padding: '4px 8px' }}>{r.txCharge > 0 ? r.txCharge + '%' : '—'}</td>
                  <td className="num" style={{ padding: '4px 8px' }}>{r.hsAnn > 0 ? <span style={{ color: 'var(--orange, #c45300)' }}>{r.hsAnn} h</span> : '—'}</td>
                  <td className="num" style={{ fontSize: 11, padding: '4px 8px' }}>{r.cpGen > 0 ? r.cpEcart.toFixed(1) + ' J' : '—'}</td>
                  <td style={{ padding: '4px 8px' }}>
                    {r.alertes.length
                      ? r.alertes.map((al, i) => <span key={i} style={{ display: 'block', fontSize: 10, color: ALERT_COLOR[al.t] }}>⚠ {al.m}</span>)
                      : <span style={{ color: 'var(--green, #2e7d6f)', fontSize: 11 }}>✓ OK</span>}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--ink65)', padding: '4px 8px' }}>{r.dateStr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {conso ? (
        <details open data-testid="conso-sig" style={{ border: '1px solid var(--border)', marginTop: 18 }}>
          <summary style={{ cursor: 'pointer', padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{region ? 'Compte de résultat consolidé de la région 2027' : 'Compte de résultat consolidé 2027'}</summary>
          <div style={{ padding: '4px 14px 14px' }}>
            {conso.erreur ? <p className="hint">Compte de résultat consolidé indisponible : {conso.erreur}</p> : (
              <>
                {region ? (
                  <p className="hint" style={{ margin: '0 0 10px', fontSize: 12 }}>
                    Somme des <b>{conso.nbAgences} agence{conso.nbAgences > 1 ? 's' : ''}</b> budgétée{conso.nbAgences > 1 ? 's' : ''} de votre région (version soumise, sinon version active). Les structures du siège (Formation, Exceptionnel, Réseau adhérent, Siège) sont consolidées au niveau du réseau.
                  </p>
                ) : (
                <p className="hint" style={{ margin: '0 0 10px', fontSize: 12 }}>
                  Somme des <b>{conso.nbAgences} agences</b> budgétées et des 4 structures (version soumise, sinon version active).
                  Le résultat net = résultat courant avant impôt + résultat exceptionnel − impôt sur les sociétés − participation aux bénéfices (portés par le Siège).
                </p>
                )}
                {!region && STRUCTURES.some((n) => !conso.structures[n].present) ? (
                  <div style={{ fontSize: 12, color: 'var(--orange, #c45300)', marginBottom: 10 }}>⚠ Structures pas encore saisies : {STRUCTURES.filter((n) => !conso.structures[n].present).map((n) => LIB_STRUCTURES[n]).join(', ')}.</div>
                ) : null}
                {conso.erreurs.length ? <div style={{ fontSize: 12, color: 'var(--orange, #c45300)', marginBottom: 10 }}>⚠ Calcul impossible pour : {conso.erreurs.join(', ')}.</div> : null}
                <div style={{ overflowX: 'auto' }}>
                  <table className="prev-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }} data-testid="conso-sig-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Rubrique</th><th>{region ? 'Région' : 'Agences'}</th>
                        {cols.map((n) => <th key={n}>{LIB_STRUCTURES[n]}</th>)}
                        {region ? null : <th>Consolidé</th>}<th>% CA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {T.map((r) => {
                        const caT = conso.total["Chiffre d'affaires"];
                        const z = (v) => (!v ? ' zeroVal' : '');
                        return (
                          <tr key={r.label} className={r.type === 'subtotal' ? 'subtotal' : ''}>
                            {estDetailSIG(r.label) ? <td style={{ paddingLeft: 18, fontStyle: 'italic' }}>{libLigneSIG(r.label)}</td> : <td><b>{r.label}</b></td>}
                            <td className={'num' + z(conso.agences[r.label])}>{euro(conso.agences[r.label])}</td>
                            {cols.map((n) => <td key={n} className={'num' + z(conso.structures[n].s[r.label])}>{euro(conso.structures[n].s[r.label])}</td>)}
                            {region ? null : <td className="num"><b>{euro(conso.total[r.label])}</b></td>}
                            <td className="num">{caT ? pct((conso.total[r.label] / caT) * 100) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </details>
      ) : null}
    </div>
  );
}
