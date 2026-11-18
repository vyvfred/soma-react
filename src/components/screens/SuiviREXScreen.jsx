import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNav } from '../../context/NavContext.jsx';
import { sb } from '../../lib/supabase.js';
import { loadNetworkBudgets, loadAgencesRegion } from '../../lib/budgetApi.js';
import { agencesOps } from '../../config/agences.js';
import { statutLabel } from '../../config/statut.js';
import { avancementBudget } from '../../domain/avancement.js';
import { suiviAgencesRex, detailJalon, ilYALisible, SEUIL_RELANCE_JOURS } from '../../domain/suiviRex.js';

// Suivi des REX par le DR : avancement du travail de chaque REX de la région, budgets en brouillon compris.
// Chaque budget s'ouvre en consultation (tous les écrans, lecture seule), ou en saisie à la place du REX.
const th = { padding: '8px 8px', textAlign: 'left', fontSize: 12, color: 'var(--ink65)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const td = { padding: '10px 8px', borderBottom: '1px solid var(--border)', fontSize: 13, verticalAlign: 'top' };
const COUL = { non_commence: 'var(--orange, #c45300)', en_cours: 'var(--violet2, #a78bfa)', soumis: 'var(--blue2, #3d6fd6)', valide: 'var(--green, #2e7d6f)' };

function Kpi({ label, value, note }) {
  return <div className="kpi"><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note || ''}</div></div>;
}

function Jalons({ l }) {
  return (
    <div style={{ display: 'flex', gap: 3 }} data-testid="jalons">
      {l.jalons.map((j) => (
        <div key={j.lib} title={j.lib + ' : ' + detailJalon(j, l.av)} style={{ width: 30 }}>
          <div style={{ height: 8, background: 'var(--bg3, #2a2f45)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: j.pct + '%', height: '100%', background: j.pct >= 100 ? 'var(--green, #2e7d6f)' : 'var(--violet)' }} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--ink65)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden' }}>{j.lib.slice(0, 5)}</div>
        </div>
      ))}
    </div>
  );
}

export default function SuiviREXScreen() {
  const { profile } = useAuth();
  const navigate = useNav();
  const [k, setK] = useState(0);
  const [state, setState] = useState({ loading: true, error: null });
  const [filtre, setFiltre] = useState('tous');
  const estDR = profile && profile.role === 'dr';

  useEffect(() => {
    let actif = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.all([loadNetworkBudgets(), estDR ? loadAgencesRegion(profile.region_id) : Promise.resolve(null), sb.rpc('suivi_rex')])
      .then(([map, region, rex]) => {
        if (rex.error) throw new Error(rex.error.message);
        const agences = agencesOps().map((o) => o.nom).filter((n) => !region || region.includes(n));
        const budgets = {};
        Object.keys(map || {}).forEach((n) => { budgets[n] = { statut: map[n].statut, data: map[n].data, updated_at: map[n].updatedAt }; });
        if (actif) setState({ loading: false, error: null, suivi: suiviAgencesRex(agences, budgets, rex.data || [], avancementBudget, Date.now()) });
      })
      .catch((e) => { if (actif) setState({ loading: false, error: e.message || 'Erreur de chargement' }); });
    return () => { actif = false; };
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading && !state.suivi) return <div className="card"><h2>Suivi des REX</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Suivi des REX</h2><p className="hint">Erreur : {state.error}</p></div>;
  const { lignes, kpi } = state.suivi;
  if (!lignes.length) return <div className="card"><h2>Suivi des REX</h2><p className="hint">Aucune agence n'est rattachée à votre région. Le contrôleur de gestion fait l'affectation.</p></div>;
  const visibles = lignes.filter((l) => filtre === 'tous' || (filtre === 'relancer' ? l.aRelancer : filtre === 'brouillon' ? (l.etat === 'en_cours' || l.etat === 'non_commence') : l.etat === 'soumis' || l.etat === 'valide'));

  let phrase = kpi.aRelancer
    ? <><b>{kpi.aRelancer} agence{kpi.aRelancer > 1 ? 's' : ''}</b> à relancer (budget non commencé, REX jamais connecté ou aucune modification depuis {SEUIL_RELANCE_JOURS} jours). </>
    : <>Aucune agence à relancer. </>;

  return (
    <div className="card" data-testid="suivi-rex">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Suivi des REX{estDR ? ' de ma région' : ''}</h2>
        <button onClick={() => setK((x) => x + 1)} style={{ width: 'auto', margin: 0, fontSize: 12, padding: '6px 12px' }}>↺ Actualiser</button>
      </div>
      <div className="kpis" data-visite="suivi-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        <Kpi label="Agences" value={kpi.total} />
        <Kpi label="Non commencés" value={kpi.nonCommences} />
        <Kpi label="En cours" value={kpi.enCours} note={kpi.avancementMoyen !== null ? 'avancement moyen ' + kpi.avancementMoyen + ' %' : ''} />
        <Kpi label="Soumis" value={kpi.soumis} note={kpi.valides ? kpi.valides + ' validé' + (kpi.valides > 1 ? 's' : '') + ' définitivement' : ''} />
        <Kpi label="À relancer" value={kpi.aRelancer} note={kpi.aRelancer ? 'avant le 27 novembre' : '✓'} />
      </div>
      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--ink65)', marginBottom: 14 }}>
        💬 {phrase}Cliquez sur « Voir le budget » pour parcourir tous les écrans d'une agence en lecture seule, même en brouillon.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {[['tous', 'Toutes'], ['relancer', 'À relancer'], ['brouillon', 'En brouillon'], ['soumis', 'Soumis']].map(([v, lib]) => (
          <button key={v} data-testid={'suivi-filtre-' + v} onClick={() => setFiltre(v)} style={{ width: 'auto', margin: 0, fontSize: 12, padding: '5px 12px', background: filtre === v ? 'var(--violet)' : 'transparent', color: filtre === v ? '#fff' : 'var(--ink65)', border: '1px solid var(--border)' }}>{lib}</button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }} data-visite="suivi-table">
        <table data-testid="suivi-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={th}>Agence</th><th style={th}>REX · dernière activité</th><th style={th}>Statut</th><th style={th}>Avancement</th><th style={th}>Jalons</th><th style={th}>Budget modifié</th><th style={th} /></tr></thead>
          <tbody>
            {visibles.map((l) => (
              <tr key={l.agence} data-testid={'suivi-' + l.agence}>
                <td style={td}><b>{l.agence}</b>{l.aRelancer ? <div style={{ fontSize: 11, color: 'var(--orange, #c45300)', marginTop: 3 }}>⚠ {l.motifs.join(' · ')}</div> : null}</td>
                <td style={td}>{l.rex.length ? l.rex.map((r) => (
                  <div key={r.email || r.nom} style={{ marginBottom: 2 }}>{r.nom}{r.principale ? '' : ' (agence supp.)'}
                    <span style={{ fontSize: 11, color: r.activite ? 'var(--ink65)' : 'var(--orange, #c45300)' }}> · {r.activite ? ilYALisible(r.jours) : 'jamais connecté'}</span></div>
                )) : <span style={{ color: 'var(--orange, #c45300)', fontSize: 12 }}>aucun REX</span>}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}><span style={{ color: COUL[l.etat], fontWeight: 600 }}>{l.statut ? statutLabel(l.statut) : 'Non commencé'}</span></td>
                <td style={{ ...td, minWidth: 120 }}>
                  <div style={{ height: 8, background: 'var(--bg3, #2a2f45)', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: l.pct + '%', height: '100%', background: l.pct >= 100 ? 'var(--green, #2e7d6f)' : 'var(--violet)' }} /></div>
                  <div style={{ fontSize: 12, marginTop: 3 }}>{l.pct} %</div>
                </td>
                <td style={td}><Jalons l={l} /></td>
                <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 12 }}>{l.maj ? ilYALisible(l.joursSansModif) : '—'}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  {l.statut ? <button data-testid={'suivi-voir-' + l.agence} onClick={() => navigate('__consulter', l.agence)} style={{ width: 'auto', margin: '0 6px 4px 0', fontSize: 12, padding: '5px 10px' }}>Voir le budget</button> : null}
                  {estDR && (l.etat === 'en_cours' || l.etat === 'non_commence') && l.statut ? <button className="secondary" data-testid={'suivi-saisir-' + l.agence} onClick={() => navigate('__saisir', l.agence)} style={{ width: 'auto', margin: 0, fontSize: 12, padding: '5px 10px' }}>Saisir</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
