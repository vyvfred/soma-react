import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { loadNetworkBudgets } from '../../lib/budgetApi.js';
import { chargerReperes, enregistrerImportTDB, enregistrerEstimation } from '../../lib/reperesApi.js';
import { lireToutesFeuilles } from '../../lib/importExcel.js';
import { sb } from '../../lib/supabase.js';
import { migrateAgency } from '../../domain/budgetMapper.js';
import { agency, M, avecCacheMoteur } from '../../domain/calculations.js';
import { AGENCES } from '../../config/agences.js';
import { completerAtterrissageCA, AGENCE_RESEAU, INDICATEURS_REPERES, lireTableauDeBord, reperesAgence, serieRep, estimRep, valRep } from '../../domain/reperes.js';
import ReperesBloc, { periodeReperes } from '../ReperesBloc.jsx';

// Écran « Tableau de bord 2026 » (nov. 2026) : le CG importe le tableau de bord et estime les derniers mois ;
// DR (sa région), DF, DG et PDG consultent, agence par agence, le budget 2027 face aux repères 2026.
const k = (v) => (v === null || v === undefined ? '—' : Math.round(v / 1000).toLocaleString('fr-FR') + ' k€');
const p1 = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : (Math.round(v * 10) / 10).toLocaleString('fr-FR') + ' %');

function Estimation({ agence, r, a, onEnregistre }) {
  // Placeholder du CA : atterrissage du CG (Données agences) quand il est saisi, sinon budget 2026
  const rc = completerAtterrissageCA(r, a && a.histCA);
  const mc = r.moisClos || 0;
  const init = () => { const o = {}; INDICATEURS_REPERES.forEach((ind) => { o[ind.cle] = M.map((_, m) => { const v = estimRep(r, ind.cle, m); return v === null ? '' : String(v); }); }); return o; };
  const [val, setVal] = useState(init);
  const [msg, setMsg] = useState(null);
  useEffect(() => { setVal(init()); setMsg(null); }, [agence, r.majLe]); // eslint-disable-line react-hooks/exhaustive-deps
  if (mc >= 12) return <p className="hint" style={{ fontSize: 12 }}>Les 12 mois de 2026 sont clos : l'atterrissage est le réalisé.</p>;
  const mois = M.map((m, i) => i).filter((i) => i >= mc);
  const reprendre = () => setVal((v) => { const o = { ...v }; INDICATEURS_REPERES.forEach((ind) => { const b = serieRep(r, 'budget', ind.cle); o[ind.cle] = v[ind.cle].map((x, m) => (m >= mc ? String(Math.round(valRep(b[m]) || 0)) : x)); }); return o; });
  const enregistrer = async () => {
    const estim = {}; INDICATEURS_REPERES.forEach((ind) => { estim[ind.cle] = val[ind.cle].map((x, m) => (m < mc || x === '' ? null : +String(x).replace(/\s/g, '').replace(',', '.'))); });
    setMsg(await enregistrerEstimation(agence, estim) ? 'Estimation enregistrée.' : 'Échec de l\'enregistrement.');
    onEnregistre();
  };
  return (
    <div data-testid="estimation-cg" style={{ marginBottom: 10 }}>
      <h4 style={{ margin: '6px 0' }}>Estimation des derniers mois (contrôle de gestion)</h4>
      <p className="hint" style={{ fontSize: 12, margin: '0 0 6px' }}>L'atterrissage 2026 = réalisé {M[0]}–{M[mc - 1]} + votre estimation pour {mois.map((m) => M[m]).join(', ')}. En gris : ce qui est retenu tant que vous n'avez rien saisi (CA : votre « CA 2026 » des Données agences moins le réalisé, réparti comme le budget ; autres indicateurs : budget 2026 du mois).</p>
      <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr><th style={{ textAlign: 'left', padding: '3px 6px' }}>Indicateur</th>{mois.map((m) => <th key={m} style={{ padding: '3px 6px' }}>{M[m]}</th>)}</tr></thead>
        <tbody>
          {INDICATEURS_REPERES.map((ind) => (
            <tr key={ind.cle}>
              <td style={{ padding: '3px 6px' }}>{ind.lib}</td>
              {mois.map((m) => (
                <td key={m} style={{ padding: '2px 3px' }}>
                  <input type="number" data-testid={'estim-' + ind.cle + '-' + m} value={val[ind.cle][m]} placeholder={String(Math.round((ind.cle === 'ca' && rc.caAtterrissageCG ? valRep(rc.estim.ca[m]) : valRep(serieRep(r, 'budget', ind.cle)[m])) || 0))}
                    onChange={(e) => setVal((v) => ({ ...v, [ind.cle]: v[ind.cle].map((x, i) => (i === m ? e.target.value : x)) }))} style={{ width: 110, textAlign: 'right', padding: '6px 4px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" data-testid="estim-enregistrer" onClick={enregistrer} style={{ width: 'auto', margin: 0, fontSize: 12, padding: '7px 14px' }}>Enregistrer l'estimation</button>
        <button type="button" className="secondary" onClick={reprendre} style={{ width: 'auto', margin: 0, fontSize: 12, padding: '7px 14px' }}>Reprendre le budget 2026 de ces mois</button>
        {msg ? <span style={{ fontSize: 12, color: 'var(--ink65)' }}>{msg}</span> : null}
      </div>
    </div>
  );
}

export default function ReperesScreen() {
  const { profile } = useAuth();
  const cg = ['cg', 'admin'].includes(profile.role);
  const [etat, setEtat] = useState({ chargement: true, reperes: {}, budgets: {} });
  const [choix, setChoix] = useState(null);
  const [msg, setMsg] = useState(null);
  const [import_, setImport] = useState(false);
  const fichier = useRef(null);
  // DR : sa région seulement (la base l'impose déjà ; filtre aussi ici)
  const region = () => (profile.role === 'dr' ? (profile.region_id ? sb.from('agences').select('nom').eq('region_id', profile.region_id).then(({ data }) => (data || []).map((x) => x.nom)) : Promise.resolve([])) : Promise.resolve(null));
  const recharger = () => Promise.all([chargerReperes(), loadNetworkBudgets().catch(() => ({})), region()]).then(([reperes, budgets, noms]) => {
    if (noms) Object.keys(reperes).forEach((n) => { if (n !== AGENCE_RESEAU && !noms.includes(n)) delete reperes[n]; });
    setEtat({ chargement: false, reperes, budgets });
  });
  useEffect(() => { recharger(); }, []);

  const lignes = useMemo(() => avecCacheMoteur(() => Object.keys(etat.reperes).filter((nom) => nom !== AGENCE_RESEAU && etat.reperes[nom].reel).map((nom) => {
    const b = etat.budgets[nom];
    let a = null;
    try { a = migrateAgency({ ...agency(nom), ...(b ? JSON.parse(JSON.stringify(b.data || {})) : {}), name: nom }); } catch (e) { a = agency(nom); }
    const x = reperesAgence(a, etat.reperes[nom]);
    const L = {}; x.lignes.forEach((l) => { L[l.cle] = l; });
    const n = { alerte: 0, attention: 0, info: 0 }; x.alertes.forEach((al) => { n[al.niveau]++; });
    return { nom, a, r: etat.reperes[nom], x, L, n, statut: b ? b.statut : null, rex26: L.ca.v2026 ? L.rex.v2026 / L.ca.v2026 * 100 : null, rex27: L.ca.v2027 ? L.rex.v2027 / L.ca.v2027 * 100 : null };
  }).sort((u, v) => (v.n.alerte - u.n.alerte) || (v.n.attention - u.n.attention) || u.nom.localeCompare(v.nom))), [etat]);

  async function importer(f) {
    if (!f) return;
    setImport(true); setMsg(null);
    try {
      const res = lireTableauDeBord(await lireToutesFeuilles(f), AGENCES.map((x) => x.nom));
      const nb = Object.keys(res.parAgence).length;
      if (!nb) { setMsg('Aucun onglet d\'agence reconnu dans ce fichier.'); setImport(false); return; }
      const r = await enregistrerImportTDB(res.parAgence, f.name, res.annee);
      setMsg('Exercice ' + res.annee + ' : ' + r.ok + ' agence(s) et structure(s) importée(s)' + (r.echecs.length ? ' ; échec : ' + r.echecs.join(', ') : '') + (res.inconnues.length ? ' ; onglets non reconnus : ' + res.inconnues.join(', ') : '') + '.');
      await recharger();
    } catch (e) { setMsg('Lecture impossible : ' + (e.message || e)); }
    setImport(false);
    if (fichier.current) fichier.current.value = '';
  }

  const sel = lignes.find((l) => l.nom === choix);
  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Tableau de bord 2026</h2>
        <p className="hint" style={{ fontSize: 13, margin: 0 }}>
          Le budget 2027 de chaque agence face à son réalisé 2025 et à son atterrissage 2026 (réalisé des mois clos + estimation du contrôle de gestion pour les derniers mois).
          Ces repères éclairent la décision des valideurs ; ils ne modifient aucun budget. Seuils d'alerte : CA ±3 % face à l'atterrissage, ±1 point de CA sur les ratios, budget 2026 non tenu de plus d'1 point de CA.
        </p>
        {cg ? (
          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={fichier} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} data-testid="tdb-fichier" onChange={(e) => importer(e.target.files[0])} />
            <button type="button" data-testid="tdb-importer" disabled={import_} onClick={() => fichier.current && fichier.current.click()} style={{ width: 'auto', margin: 0, fontSize: 12, padding: '8px 14px' }}>{import_ ? 'Import…' : '⇪ Importer le tableau de bord (Excel)'}</button>
            <span className="hint" style={{ fontSize: 12 }}>Le classeur 2026 (en cours) et le classeur de l'exercice 2025 (complet) : un onglet par agence (nom en A1, colonnes « B mm-AA » pour le budget) et l'onglet de comparaison avec l'année précédente. L'exercice est reconnu tout seul. Réimportez après chaque clôture : vos estimations sont conservées.</span>
          </div>
        ) : null}
        {msg ? <div data-testid="tdb-message" style={{ marginTop: 8, fontSize: 12, color: 'var(--ink65)' }}>{msg}</div> : null}
      </div>
      <div className="card">
        {etat.chargement ? <p className="hint">Chargement…</p> : !lignes.length ? <p className="hint" data-testid="tdb-vide">Aucun tableau de bord importé pour l'instant{cg ? '' : ' : le contrôle de gestion doit l\'importer'}.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table data-testid="tdb-table" style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
              <thead><tr>
                <th style={{ textAlign: 'left', padding: '4px 6px' }}>Agence</th><th>Atterrissage</th><th>CA 2026</th><th>CA 2027</th><th>Écart</th><th>REX/CA 2026</th><th>REX/CA 2027</th><th>Alertes</th>
              </tr></thead>
              <tbody>
                {lignes.map((l) => {
                  const d = l.L.ca.v2026 && l.L.ca.v2027 ? (l.L.ca.v2027 / l.L.ca.v2026 - 1) * 100 : null;
                  return (
                    <tr key={l.nom} data-testid={'tdb-ligne-' + l.nom} onClick={() => setChoix(l.nom === choix ? null : l.nom)} style={{ cursor: 'pointer', borderTop: '1px solid var(--border)', background: l.nom === choix ? 'var(--bg2)' : undefined }}>
                      <td style={{ padding: '5px 6px', fontWeight: 700 }}>{l.nom}</td>
                      <td style={{ textAlign: 'center', color: l.L.ca.manquants ? 'var(--orange)' : 'var(--green)' }} title={periodeReperes(l.r)}>{l.r.moisClos || 0} mois{l.L.ca.manquants ? ' + à estimer' : ' + estimés'}</td>
                      <td className="num">{k(l.L.ca.v2026)}</td><td className="num">{l.L.ca.v2027 ? k(l.L.ca.v2027) : '—'}</td>
                      <td className="num" style={{ color: d !== null && Math.abs(d) > 3 ? 'var(--orange)' : undefined }}>{d === null ? '—' : (d > 0 ? '+' : '') + p1(d)}</td>
                      <td className="num">{p1(l.rex26)}</td><td className="num">{p1(l.rex27)}</td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {l.n.alerte ? <span style={{ color: 'var(--red, #c0392b)', fontWeight: 700 }}>⚠ {l.n.alerte} </span> : null}
                        {l.n.attention ? <span style={{ color: 'var(--orange)', fontWeight: 700 }}>◆ {l.n.attention}</span> : null}
                        {!l.n.alerte && !l.n.attention ? <span style={{ color: 'var(--green)' }}>✓</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {sel ? (
        <div className="card" data-testid="tdb-detail">
          <h3 style={{ marginTop: 0 }}>{sel.nom}</h3>
          {cg ? <Estimation agence={sel.nom} r={sel.r} a={sel.a} onEnregistre={recharger} /> : null}
          <ReperesBloc a={sel.a} r={sel.r} sansBudget={!sel.L.ca.v2027} />
        </div>
      ) : null}
    </>
  );
}
